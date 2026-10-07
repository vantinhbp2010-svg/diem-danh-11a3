import { GoogleGenAI } from "@google/genai";
import { NOI_QUY } from "./noidung";

const API_KEY = "AIzaSyBUbibJceDLEiwf6fcQ1AlrROlKNxLeUPc";
const ai = new GoogleGenAI({ apiKey: API_KEY });

// Lịch sử để bot nhớ ngữ cảnh — dùng previous_interaction_id của SDK
let previousInteractionId = null;

export function resetHistory() {
  previousInteractionId = null;
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
    const params = {
      model: "gemini-3.1-flash-lite",
      input: cauHoi,
      system_instruction: SYSTEM_PROMPT,
    };

    if (previousInteractionId) {
      params.previous_interaction_id = previousInteractionId;
    }

    const interaction = await ai.interactions.create(params);

    previousInteractionId = interaction.id;

    return interaction.output_text || "❌ Không có phản hồi từ AI.";
  } catch (err) {
    console.error("Lỗi Gemini:", err);

    // Reset lịch sử nếu interaction cũ bị lỗi
    previousInteractionId = null;

    if (err.message && err.message.includes("API key")) {
      return "❌ API key chưa đúng. Vui lòng báo giáo viên kiểm tra lại.";
    }
    if (err.message && err.message.includes("quota")) {
      return "⏳ Chatbot đang quá tải. Em đợi 1 phút rồi hỏi lại nhé!";
    }
    if (err.message && err.message.includes("404")) {
      return "❌ Model AI chưa khả dụng. Vui lòng báo giáo viên.";
    }
    return "❌ Có lỗi xảy ra: " + err.message;
  }
}