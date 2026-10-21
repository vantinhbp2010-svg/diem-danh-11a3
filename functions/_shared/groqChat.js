const GROQ_CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "openai/gpt-oss-20b";

export async function createGroqChatResult(body, apiKey, fetcher = fetch) {
  const { cauHoi, lichSu, systemPrompt } = body || {};

  if (typeof cauHoi !== "string" || !cauHoi.trim()) {
    return { status: 400, body: { error: "Thiếu câu hỏi" } };
  }

  if (!apiKey) {
    return {
      status: 500,
      body: {
        code: "MISSING_API_KEY",
        error: "Chưa cấu hình GROQ_API_KEY trên máy chủ.",
      },
    };
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
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Groq API trả lỗi:", response.status, data.error?.type);
      if (response.status === 429) {
        return {
          status: 429,
          retryAfter: response.headers.get("retry-after"),
          body: {
            code: "RATE_LIMITED",
            error: "Groq đang giới hạn tần suất yêu cầu.",
          },
        };
      }
      if (response.status === 401 || response.status === 403) {
        return {
          status: 500,
          body: {
            code: "INVALID_API_KEY",
            error: "Máy chủ chưa xác thực được với Groq.",
          },
        };
      }
      return {
        status: 502,
        body: {
          code: "PROVIDER_ERROR",
          error: "Dịch vụ AI tạm thời không xử lý được yêu cầu.",
        },
      };
    }

    const traLoi = data.choices?.[0]?.message?.content;
    if (typeof traLoi !== "string" || !traLoi.trim()) {
      console.error("Groq API trả về nội dung rỗng.");
      return {
        status: 502,
        body: {
          code: "EMPTY_RESPONSE",
          error: "Dịch vụ AI chưa trả về câu trả lời.",
        },
      };
    }

    return { status: 200, body: { traLoi } };
  } catch (err) {
    console.error("Lỗi kết nối Groq:", err);
    return {
      status: 502,
      body: {
        code: "PROVIDER_UNAVAILABLE",
        error: "Không kết nối được với dịch vụ AI.",
      },
    };
  }
}
