export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { cauHoi, lichSu, systemPrompt } = req.body;

  if (!cauHoi) {
    return res.status(400).json({ error: "Thiếu câu hỏi" });
  }

  const API_KEY = process.env.GEMINI_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Server chưa cấu hình API key" });
  }

  try {
    const contents = [];

    if (systemPrompt) {
      contents.push({
        role: "user",
        parts: [{ text: systemPrompt }],
      });
      contents.push({
        role: "model",
        parts: [{ text: "Đã hiểu. Tôi sẽ trả lời theo nội quy trường." }],
      });
    }

    if (lichSu && Array.isArray(lichSu)) {
      lichSu.forEach((item) => {
        contents.push({
          role: item.role === "model" ? "model" : "user",
          parts: [{ text: item.text }],
        });
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: cauHoi }],
    });

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API lỗi:", data);
      return res.status(response.status).json({
        error: data.error?.message || "Lỗi gọi Gemini",
      });
    }

    const traLoi =
      data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có phản hồi.";

    return res.status(200).json({ traLoi });
  } catch (err) {
    console.error("Lỗi server:", err);
    return res.status(500).json({ error: err.message });
  }
}