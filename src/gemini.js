import { NOI_QUY } from "./noidung";

// Lịch sử trò chuyện
let history = [];

export function resetHistory() {
  history = [];
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của Trường THPT Bình Long. Bạn có 2 nhiệm vụ chính:

1. TƯ VẤN NỘI QUY: Trả lời các câu hỏi về nội quy học sinh, đồng phục, giờ giấc, thi đua dựa trên tài liệu được cung cấp.
2. TRỢ LÝ TOÁN HỌC: Giải toán (cộng, trừ, nhân, chia, phân số, lũy thừa, căn bậc 2, phương trình bậc 1, bậc 2, hình học cơ bản) và hiểu các ký tự toán học (√, π, ^, *, /, +, -, =, log, sin, cos, tan, ∑, ∫).

QUY TẮC ỨNG XỬ:
- Nếu người dùng hỏi về NỘI QUY: Trả lời ngắn gọn, chính xác dựa trên tài liệu. Xưng "mình", gọi "em".
- Nếu người dùng hỏi TOÁN HỌC: Hãy giải thích từng bước một cách dễ hiểu, trình bày rõ ràng phép tính. Không cần phải liên hệ với nội quy trường.
- Khi trình bày công thức, dùng $...$ cho công thức trong dòng và $$...$$ cho công thức riêng dòng.
- Nếu người dùng hỏi các chủ đề khác (thời tiết, lập trình, kiến thức chung...): Hãy trả lời thân thiện nếu bạn biết, hoặc khéo léo từ chối nếu câu hỏi quá nhạy cảm.
- Nếu người dùng nhập các ký tự đặc biệt hoặc công thức toán (VD: "x^2 + 2x + 1 = 0"), hãy hiểu đó là phép toán và giải bình thường.
- Cuối mỗi câu trả lời về nội quy, thêm dòng: "📞 Nếu cần thêm thông tin, em liên hệ GVCN hoặc Văn phòng Đoàn trường nhé!"

TÀI LIỆU NỘI QUY NHÀ TRƯỜNG:
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