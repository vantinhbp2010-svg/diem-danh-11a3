/* global process */
import { requireTeacher } from "./_lib/firebaseAdmin.js";
import { uploadImageToImgBB } from "../functions/_shared/imageUpload.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const authorization = await requireTeacher(req, res);
  if (!authorization) return;

  const result = await uploadImageToImgBB(req.body, process.env.IMGBB_API_KEY);
  return res.status(result.status).json(result.body);
}
