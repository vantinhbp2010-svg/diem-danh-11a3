import admin from "firebase-admin";
import process from "node:process";

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT;
const projectId = process.env.FIREBASE_PROJECT_ID || "diem-danh-11a3";

if (serviceAccountRaw) {
  const serviceAccount = JSON.parse(serviceAccountRaw);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: serviceAccount.project_id || projectId,
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
} else {
  throw new Error(
    "Thiếu thông tin xác thực. Thiết lập FIREBASE_SERVICE_ACCOUNT hoặc GOOGLE_APPLICATION_CREDENTIALS trước khi chạy di chuyển."
  );
}

const db = admin.firestore();
const [attendanceSnap, facesSnap, tkbSnap, classesSnap] = await Promise.all([
  db.collection("diemdanh").doc("all").get(),
  db.collection("diemdanh").doc("faces").get(),
  db.collection("diemdanh").doc("thoiKhoaBieu").get(),
  db.collection("lop").get(),
]);
const classes = classesSnap.docs.filter((classDoc) =>
  Array.isArray(classDoc.data().students)
);
const migrated = { months: 0, faceClasses: 0, schedules: 0 };

if (attendanceSnap.exists) {
  const monthlyData = new Map();
  for (const [date, records] of Object.entries(attendanceSnap.data().data || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const month = date.slice(0, 7);
    if (!monthlyData.has(month)) monthlyData.set(month, {});
    monthlyData.get(month)[date] = records;
  }

  for (const [month, data] of monthlyData) {
    const target = db.collection("diemdanh").doc(`diemdanh_thang_${month}`);
    const existing = await target.get();
    if (existing.exists) {
      console.log(`Bỏ qua tháng ${month}: tài liệu đích đã tồn tại.`);
      continue;
    }
    await target.create({ data });
    migrated.months++;
  }
}

if (facesSnap.exists) {
  const legacyFaces = facesSnap.data().data || {};
  for (const classDoc of classes) {
    const studentIds = new Set(
      classDoc.data().students.flatMap((student) => {
        const id = String(student.id || "");
        const suffix = id.match(/(\d+)$/)?.[1];
        return suffix ? [id, `HS${suffix}`] : [id];
      })
    );
    const classFaces = Object.fromEntries(
      Object.entries(legacyFaces).filter(([studentId]) =>
        studentIds.has(studentId)
      )
    );
    if (Object.keys(classFaces).length === 0) continue;

    const target = db
      .collection("lop")
      .doc(classDoc.id)
      .collection("faces")
      .doc("data");
    const existing = await target.get();
    if (existing.exists) {
      console.log(`Bỏ qua khuôn mặt lớp ${classDoc.id}: tài liệu đích đã tồn tại.`);
      continue;
    }
    await target.create({ data: classFaces });
    migrated.faceClasses++;
  }
}

if (tkbSnap.exists) {
  const legacySchedules = tkbSnap.data().data || {};
  for (const classDoc of classes) {
    const data = legacySchedules[classDoc.id];
    if (!data) continue;

    const target = db
      .collection("lop")
      .doc(classDoc.id)
      .collection("thoiKhoaBieu")
      .doc("data");
    const existing = await target.get();
    if (existing.exists) {
      console.log(`Bỏ qua TKB lớp ${classDoc.id}: tài liệu đích đã tồn tại.`);
      continue;
    }
    await target.create({ data });
    migrated.schedules++;
  }
}

console.log("Di chuyển Firestore hoàn tất:", migrated);
