/* global Buffer, process */
import { createGroqChatStream } from "../functions/_shared/groqChat.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = await createGroqChatStream(req.body, process.env.GROQ_API_KEY);
  if (result.status !== 200) {
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    if (result.retryAfter) {
      res.setHeader("Retry-After", result.retryAfter);
    }
    return res.status(result.status).json(result.body);
  }

  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.setHeader("Connection", "keep-alive");

  const reader = result.stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
    return res.end();
  } catch (err) {
    console.error("Lỗi chuyển tiếp Groq stream:", err);
    if (!res.headersSent) {
      return res.status(502).json({
        code: "STREAM_ERROR",
        error: "Kết nối tới dịch vụ AI bị gián đoạn.",
      });
    }
    res.write(`event: error\ndata: ${JSON.stringify({ error: "Kết nối tới dịch vụ AI bị gián đoạn." })}\n\n`);
    return res.end();
  } finally {
    reader.releaseLock();
  }
}
