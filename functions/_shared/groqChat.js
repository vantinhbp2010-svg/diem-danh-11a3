const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

function errorResult(status, code, error, retryAfter = null) {
  return {
    status,
    retryAfter,
    body: { code, error, ...(retryAfter ? { retryAfter } : {}) },
  };
}

export function buildGroqMessages(body) {
  const { cauHoi, lichSu, systemPrompt } = body || {};
  if (typeof cauHoi !== "string" || !cauHoi.trim()) {
    return { error: errorResult(400, "INVALID_QUESTION", "Thiếu câu hỏi") };
  }

  const messages = [];
  if (typeof systemPrompt === "string" && systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }

  if (Array.isArray(lichSu)) {
    for (const item of lichSu.slice(-20)) {
      if (typeof item?.text !== "string" || !item.text.trim()) continue;
      messages.push({
        role: item.role === "model" ? "assistant" : "user",
        content: item.text,
      });
    }
  }

  messages.push({ role: "user", content: cauHoi.trim() });
  return { messages };
}

export async function createGroqChatStream(body, apiKey, fetcher = fetch) {
  const { messages, error } = buildGroqMessages(body);
  if (error) return error;

  if (!apiKey) {
    return errorResult(
      500,
      "MISSING_API_KEY",
      "Chưa cấu hình GROQ_API_KEY trên máy chủ."
    );
  }

  try {
    const response = await fetcher(GROQ_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature: 0.5,
        max_completion_tokens: 1024,
        stream: true,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      console.error("Groq API trả lỗi:", response.status, data.error?.type);
      if (response.status === 429) {
        return errorResult(
          429,
          "RATE_LIMITED",
          "Groq đang giới hạn tần suất yêu cầu.",
          response.headers.get("retry-after")
        );
      }
      if (response.status === 401 || response.status === 403) {
        return errorResult(
          500,
          "INVALID_API_KEY",
          "Máy chủ chưa xác thực được với Groq."
        );
      }
      return errorResult(
        502,
        "PROVIDER_ERROR",
        "Dịch vụ AI tạm thời không xử lý được yêu cầu."
      );
    }

    if (!response.body) {
      console.error("Groq API không trả stream body.");
      return errorResult(
        502,
        "EMPTY_RESPONSE",
        "Dịch vụ AI chưa trả về câu trả lời."
      );
    }

    return { status: 200, stream: response.body };
  } catch (err) {
    console.error("Lỗi kết nối Groq:", err);
    return errorResult(
      502,
      "PROVIDER_UNAVAILABLE",
      "Không kết nối được với dịch vụ AI."
    );
  }
}
