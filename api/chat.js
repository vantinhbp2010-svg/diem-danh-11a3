/* global process */
import { createGroqChatResult } from "../functions/_shared/groqChat.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await createGroqChatResult(req.body, process.env.GROQ_API_KEY);
  if (result.retryAfter) {
    res.setHeader("Retry-After", result.retryAfter);
  }
  return res.status(result.status).json(result.body);
}
