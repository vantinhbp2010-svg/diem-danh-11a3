import { NOI_QUY } from "./noidung";

// Lịch sử trò chuyện
let history = [];

export function resetHistory() {
  history = [];
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của Trường THPT Bình Long, ưu tiên tư vấn nội quy.

QUY TẮC BẮT BUỘC:
- Nếu được hỏi bạn là ai, giới thiệu ngắn gọn là trợ lý nội quy của trường.
- Nếu hỏi TOÁN: chỉ giải bài toán và nêu đáp án ngắn gọn, dễ hiểu. Không thêm lời mời hỏi nội quy hoặc câu liên hệ GVCN.
- Nếu hỏi NỘI QUY: trả lời ngắn gọn, chỉ dựa trên tài liệu bên dưới; không bịa. Xưng "mình", gọi người hỏi là "em". Cuối câu trả lời thêm: "📞 Em liên hệ GVCN hoặc Văn phòng Đoàn trường nhé!"
- Nếu hỏi chủ đề khác, từ chối lịch sự và nói mình hỗ trợ nội quy và toán.
- Hiểu ký hiệu √, π, ^, *, /, +, -, =, log, sin, cos, tan, ∑, ∫; trình bày công thức bằng $...$ hoặc $$...$$.
- Trả lời đúng trọng tâm, không thêm phần giới thiệu hoặc kết luận không cần thiết.

TÀI LIỆU NỘI QUY:
${NOI_QUY}`;

export async function hoiChatBot(cauHoi) {
  const maxAttempts = 3;
  let lastError;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cauHoi,
          lichSu: history,
          systemPrompt: SYSTEM_PROMPT,
        }),
      });

      const data = await response.json();
      const errorMessage = data.error || "Lỗi server";
      const normalizedError = errorMessage.toLowerCase();
      const isQuotaError = normalizedError.includes("quota");
      const isTemporaryError =
        response.status === 502 ||
        response.status === 503 ||
        response.status === 504 ||
        normalizedError.includes("high demand");

      if (!response.ok) {
        const error = new Error(errorMessage);
        error.status = response.status;
        error.code = data.code;
        error.retryAfter =
          response.headers.get("retry-after") || data.retryAfter || null;
        error.isTemporary = isTemporaryError && !isQuotaError;
        throw error;
      }

      const traLoi = data.traLoi;

      history.push({ role: "user", text: cauHoi });
      history.push({ role: "model", text: traLoi });

      if (history.length > 20) {
        history = history.slice(-20);
      }

      return traLoi;
    } catch (err) {
      lastError = err;
      const shouldRetry =
        attempt < maxAttempts - 1 &&
        (err.isTemporary || (err.status === undefined && err.name === "TypeError"));

      if (!shouldRetry) break;

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.error("Lỗi chatbot:", lastError);
  const errorMessage =
    lastError instanceof Error ? lastError.message : String(lastError);
  const normalizedError = errorMessage.toLowerCase();

  if (lastError?.code === "MISSING_API_KEY") {
    return "❌ Chatbot chưa được cấu hình Groq API. Vui lòng báo giáo viên.";
  }
  if (lastError?.code === "INVALID_API_KEY") {
    return "❌ Khóa Groq API trên máy chủ không hợp lệ. Vui lòng báo giáo viên.";
  }
  if (lastError?.code === "RATE_LIMITED") {
    const retryAfter = lastError.retryAfter;
    const retryAfterSeconds = Number(retryAfter);
    const waitSeconds = Number.isFinite(retryAfterSeconds)
      ? Math.ceil(retryAfterSeconds)
      : Math.ceil((Date.parse(retryAfter) - Date.now()) / 1000);
    if (Number.isFinite(waitSeconds) && waitSeconds > 0) {
      return `⏳ Groq đang giới hạn yêu cầu. Em thử lại sau khoảng ${waitSeconds} giây nhé!`;
    }
    return "⏳ Groq đang giới hạn yêu cầu. Em vui lòng thử lại sau ít phút nhé!";
  }
  if (normalizedError.includes("quota")) {
    return "⏳ Hạn mức sử dụng AI hiện đã đạt giới hạn. Em vui lòng thử lại sau nhé!";
  }
  if (lastError?.status === 500) {
    return "❌ Chatbot chưa cấu hình hoặc đang gặp sự cố máy chủ. Vui lòng báo giáo viên.";
  }
  return "❌ Hệ thống đang bận. Em đợi một chút rồi thử lại nhé!";
}