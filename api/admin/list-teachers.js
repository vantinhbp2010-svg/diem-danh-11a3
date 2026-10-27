import { requireAdmin } from "../_lib/firebaseAdmin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authorization = await requireAdmin(req, res);
  if (!authorization) return;

  try {
    const teachers = [];
    let pageToken;
    do {
      const result = await authorization.auth.listUsers(1000, pageToken);
      teachers.push(
        ...result.users
          .filter(
            (user) =>
              user.customClaims?.teacher === true &&
              user.customClaims?.admin !== true
          )
          .map((user) => ({
            uid: user.uid,
            email: user.email || "",
            createdAt: user.metadata.creationTime,
            lastSignIn: user.metadata.lastSignInTime || null,
          }))
      );
      pageToken = result.pageToken;
    } while (pageToken);

    return res.status(200).json({ teachers });
  } catch (error) {
    console.error("Không thể tải danh sách giáo viên:", error.code || error.message);
    return res.status(500).json({ error: "Không thể tải danh sách giáo viên." });
  }
}
