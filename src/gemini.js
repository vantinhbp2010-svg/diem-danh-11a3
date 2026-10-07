import { NOI_QUY } from "./noidung";

// Lịch sử trò chuyện
let history = [];

export function resetHistory() {
  history = [];
}

const SYSTEM_PROMPT = `Bạn là trợ lý AI của Trường THPT Bình Long, chuyên trả lời các câu hỏi về NỘI QUY HỌC SINH năm học 2026-2027.

QUY TẮC:
1. CHỈ trả lời dựa trên NỘI QUY được cung cấp bên dưới.
2. Nếu câu hỏi KHÔNG liên quan đến nội quy → trả lời: "Câu hỏi này nằm ngoài phạm vi nội quy. Em vui lòng liên hệ giáo viên chủ nhiệm hoặc văn phòng Đoàn trường để được giải đáp ạ!"
3. Xưng hô: gọi người hỏi là "em", tự xưng là "mình".
4. Trả lời NGẮN GỌN, dễ hiểu, dùng bullet point khi liệt kê.
5. Nếu nội quy có số điểm trừ cụ thể → nêu rõ.
6. Không bịa thông tin. Nếu không chắc → khuyên liên hệ giáo viên.
7. Cuối câu trả lời thêm: "📞 Nếu cần thêm thông tin, em liên hệ GVCN hoặc Văn phòng Đoàn trường nhé!"

NỘI QUY NHÀ TRƯỜNG:
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

    if (err.message.includes("quota")) {
      return "⏳ Chatbot đang quá tải. Em đợi 1 phút rồi hỏi lại nhé!";
    }
    if (err.message.includes("GEMINI_API_KEY")) {
      return "❌ Chatbot chưa cấu hình. Vui lòng báo giáo viên.";
    }
    return "❌ Có lỗi xảy ra: " + err.message;
  }
}