import { NOI_QUY } from "./noidung.js";

// Lịch sử trò chuyện
let history = [];

export function resetHistory() {
  history = [];
}

const SYSTEM_PROMPT = `Bạn là Trợ lý AI của Trường THPT Bình Long. Bạn chỉ hỗ trợ tư vấn NỘI QUY và GIẢI TOÁN.

QUY TẮC NGÔN NGỮ:
- Tự nhận diện câu hỏi tiếng Việt không dấu, viết tắt hoặc sai chính tả thông dụng; hiểu theo ngữ cảnh tiếng Việt có dấu. Ví dụ: "hut thuoc co ma", "di tre bi tru bao nhieu diem", "nq".
- Nếu người dùng hỏi bằng tiếng Anh, hãy trả lời bằng tiếng Anh; nếu hỏi bằng tiếng Việt, kể cả không dấu, hãy trả lời bằng tiếng Việt có dấu. Nếu không chắc chắn về ngôn ngữ, hãy trả lời bằng tiếng Việt.
- Với câu hỏi tiếng Việt, xưng "mình", gọi người hỏi là "em". Với câu hỏi tiếng Anh, xưng "I" và gọi người hỏi là "you".

QUY TẮC NỘI DUNG:
- Nếu được hỏi bạn là ai, giới thiệu ngắn gọn là trợ lý nội quy và toán của trường.
- Nếu hỏi về NỘI QUY, trả lời ngắn gọn và chỉ dựa trên tài liệu bên dưới; không bịa. Nêu rõ số điểm trừ nếu tài liệu có quy định. Không từ chối chỉ vì câu hỏi không dấu, viết tắt hoặc sai chính tả thông dụng.
- Nếu hỏi về TOÁN, giải thích ngắn gọn, dễ hiểu và nêu đáp án. Hiểu ký hiệu √, π, ^, *, /, +, -, =, log, sin, cos, tan, ∑, ∫. BẮT BUỘC trình bày công thức trong cặp dấu $$ ... $$ (ví dụ: $$x^2 - 2x + 3 = 0$$); không dùng ngoặc vuông hay ngoặc đơn để bao quanh công thức.
- Nếu hỏi chủ đề khác, như Hóa, Lý hoặc Văn, từ chối lịch sự và nói bạn chỉ hỗ trợ nội quy và toán.
- Chỉ với câu hỏi NỘI QUY bằng tiếng Việt, thêm cuối câu trả lời: "📞 Em liên hệ GVCN hoặc Văn phòng Đoàn trường nhé!" Không thêm lời mời liên hệ này vào câu trả lời toán hoặc câu trả lời tiếng Anh.
- Trả lời đúng trọng tâm, không thêm phần giới thiệu hoặc kết luận không cần thiết.

TÀI LIỆU NỘI QUY:
${NOI_QUY}`;

async function docSseStream(reader, onChunk) {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  function xuLyEvent(event) {
    const data = event
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;

    let payload;
    try {
      payload = JSON.parse(data);
    } catch (err) {
      throw new Error("Phản hồi streaming từ AI không hợp lệ.", { cause: err });
    }

    if (payload.error) throw new Error(payload.error);

    const chunk = payload.choices?.[0]?.delta?.content;
    if (typeof chunk === "string" && chunk) {
      fullText += chunk;
      onChunk?.(chunk, fullText);
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");

    let separator = buffer.indexOf("\n\n");
    while (separator !== -1) {
      xuLyEvent(buffer.slice(0, separator));
      buffer = buffer.slice(separator + 2);
      separator = buffer.indexOf("\n\n");
    }

    if (done) {
      if (buffer.trim()) xuLyEvent(buffer);
      break;
    }
  }

  return fullText;
}

function layThoiGianCho(retryAfter) {
  if (!retryAfter) return null;

  const seconds = Number(retryAfter);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;

  const retryAt = Date.parse(retryAfter);
  return Number.isNaN(retryAt) ? null : Math.max(0, retryAt - Date.now());
}

async function choVaCapNhatTrangThai(milliseconds, onChunk, message) {
  const deadline = Date.now() + milliseconds;
  while (true) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) return;

    const seconds = Math.ceil(remaining / 1000);
    onChunk?.("", `${message} Còn khoảng ${seconds} giây...`);
    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(1000, remaining))
    );
  }
}

export async function hoiChatBot(cauHoi, onChunk) {
  const maxAttempts = 3;
  let lastError;
  let streamedText = "";

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    let streamStarted = false;
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

      if (!response.ok) {
        const data = await response.json();
        const errorMessage = data.error || "Lỗi server";
        const normalizedError = errorMessage.toLowerCase();
        const isQuotaError = normalizedError.includes("quota");
        const isTemporaryError =
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.code = data.code;
        error.retryAfter =
          response.headers.get("retry-after") || data.retryAfter || null;
        error.isTemporary = isTemporaryError && !isQuotaError;
        error.isRateLimited = response.status === 429;
        throw error;
      }

      if (!response.body) {
        throw new Error("Trình duyệt không hỗ trợ nhận phản hồi streaming.");
      }

      streamStarted = true;
      const traLoi = await docSseStream(response.body.getReader(), (chunk, fullText) => {
        streamedText = fullText;
        onChunk?.(chunk, fullText);
      });
      if (!traLoi.trim()) {
        throw new Error("Dịch vụ AI chưa trả về câu trả lời.");
      }

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
        !streamStarted &&
        (err.isRateLimited ||
          err.isTemporary ||
          (err.status === undefined && err.name === "TypeError"));

      if (!shouldRetry) break;

      if (err.isRateLimited) {
        const retryDelay =
          layThoiGianCho(err.retryAfter) ?? 1000 * 2 ** attempt;
        await choVaCapNhatTrangThai(
          retryDelay,
          onChunk,
          "⏳ Đang chờ Groq cho phép thử lại."
        );
      } else {
        const retryDelay = 1000 * 2 ** (attempt + 1);
        await choVaCapNhatTrangThai(
          retryDelay,
          onChunk,
          "Đang kết nối lại với trợ lý."
        );
      }
    }
  }

  console.error("Lỗi chatbot:", lastError);
  if (streamedText) {
    return `${streamedText}\n\n⚠️ Kết nối bị gián đoạn trước khi hoàn tất câu trả lời.`;
  }

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
  if (lastError?.status === 500) {
    return "❌ Chatbot chưa cấu hình hoặc đang gặp sự cố máy chủ. Vui lòng báo giáo viên.";
  }
  if (lastError?.status === 429) {
    return "⏳ Groq đang giới hạn yêu cầu. Em vui lòng thử lại sau nhé!";
  }
  return "❌ Hệ thống đang bận. Em đợi một chút rồi thử lại nhé!";
}