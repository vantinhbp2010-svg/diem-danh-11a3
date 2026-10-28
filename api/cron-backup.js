/* global Buffer, process */
import { timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAdminAuthInstance } from "./_lib/firebaseAdmin.js";

function isAuthorized(req) {
  const expectedSecret = process.env.CRON_SECRET;
  const authorization = req.headers.authorization || "";
  const match = authorization.match(/^Bearer (.+)$/);
  if (!expectedSecret || !match) return false;

  const expected = Buffer.from(expectedSecret);
  const received = Buffer.from(match[1]);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

async function collectCollection(db, collectionName, data) {
  const snapshot = await db.collection(collectionName).get();
  for (const entry of snapshot.docs) {
    data[`${collectionName}/${entry.id}`] = entry.data();

    if (collectionName === "lop") {
      for (const subcollectionName of ["faces", "thoiKhoaBieu"]) {
        const subcollection = await entry.ref
          .collection(subcollectionName)
          .get();
        for (const subdocument of subcollection.docs) {
          data[
            `${collectionName}/${entry.id}/${subcollectionName}/${subdocument.id}`
          ] = subdocument.data();
        }
      }
    }
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!process.env.CRON_SECRET || process.env.CRON_SECRET.length < 32) {
    return res.status(500).json({ error: "Cron backup chưa được cấu hình đầy đủ." });
  }
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Unauthorized." });
  }

  const bucketName = process.env.FIREBASE_BACKUP_BUCKET;
  if (!bucketName) {
    return res.status(500).json({ error: "Thiếu cấu hình bucket backup." });
  }

  try {
    const auth = getAdminAuthInstance();
    const db = getFirestore(auth.app);
    const bucket = getStorage(auth.app).bucket(bucketName);
    const generatedAt = new Date().toISOString();
    const data = {};

    for (const collectionName of ["diemdanh", "lop", "news"]) {
      await collectCollection(db, collectionName, data);
    }

    const backup = Buffer.from(
      JSON.stringify(
        {
          generatedAt,
          app: "diem-danh-11a3",
          data,
        },
        null,
        2
      )
    );
    const timestamp = generatedAt.replace(/[:.]/g, "-");
    const objectName = `firestore-backups/firebase-backup-${timestamp}.json`;

    await bucket.file(objectName).save(backup, {
      resumable: false,
      metadata: {
        contentType: "application/json",
        cacheControl: "private, no-store",
        metadata: { generatedAt, app: "diem-danh-11a3" },
      },
    });

    return res.status(200).json({
      ok: true,
      object: objectName,
      bytes: backup.length,
    });
  } catch (error) {
    console.error("Cron Firestore backup thất bại:", error.code || error.message);
    return res.status(500).json({ error: "Không thể hoàn tất backup Firestore." });
  }
}
