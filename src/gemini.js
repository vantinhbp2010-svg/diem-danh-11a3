import { NOI_QUY } from "./noidung";

// Lịch sử trò chuyện
let history = [];

export function resetHistory() {
  history = [];
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của Trường THPT Bình Long, ưu tiên tư vấn nội quy. Nếu được hỏi bạn là ai, hãy giới thiệu ngắn gọn mình là trợ lý nội quy của trường; không tự giới thiệu là trợ lý toán, nhưng vẫn hỗ trợ giải toán khi được yêu cầu.

QUY TẮC:
- Nội quy: trả lời ngắn gọn, chỉ dựa trên tài liệu bên dưới; không bịa. Xưng "mình", gọi người hỏi là "em".
- Toán: giải các phép tính, phương trình và bài toán cơ bản theo từng bước ngắn gọn. Hiểu ký hiệu √, π, ^, *, /, +, -, =, log, sin, cos, tan, ∑, ∫. Viết công thức bằng $...$ hoặc $$...$$.
- Chủ đề khác: từ chối lịch sự, nói rằng mình hỗ trợ nội quy và toán.
- Cuối câu trả lời về nội quy, thêm: "📞 Em liên hệ GVCN hoặc Văn phòng Đoàn trường nhé!"

TÀI LIỆU NỘI QUY:
${NOI_QUY}`;

export async function hoiChatBot(cauHoi) {
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

    if (!response.ok) {
      throw new Error(data.error || "Lỗi server");
    }

    const traLoi = data.traLoi;

    history.push({ role: "user", text: cauHoi });
    history.push({ role: "model", text: traLoi });

    if (history.length > 20) {
      history = history.slice(-20);
    }

    return traLoi;
  } catch (err) {
    console.error("Lỗi chatbot:", err);

    const errorMessage = err instanceof Error ? err.message : String(err);
    const normalizedError = errorMessage.toLowerCase();

    if (normalizedError.includes("high demand")) {
      return "⏳ Trợ lý đang bận xử lý một lượng lớn câu hỏi. Em vui lòng đợi 1-2 phút rồi thử lại nhé!";
    }
    if (normalizedError.includes("quota")) {
      return "⏳ Hạn mức sử dụng AI hôm nay đã hết. Em đợi 1 phút rồi hỏi lại nhé!";
    }
    if (normalizedError.includes("gemini_api_key")) {
      return "❌ Chatbot chưa cấu hình. Vui lòng báo giáo viên.";
    }
    return "❌ Có lỗi xảy ra trong quá trình kết nối. Em thử lại sau ít phút nhé!";
  }
}