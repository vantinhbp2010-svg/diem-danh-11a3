import { createGroqChatResult } from "../_shared/groqChat.js";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Nội dung yêu cầu không hợp lệ" }, { status: 400 });
  }

  const result = await createGroqChatResult(body, env.GROQ_API_KEY);
  const headers = new Headers({ "Content-Type": "application/json" });
  if (result.retryAfter) headers.set("Retry-After", result.retryAfter);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers,
  });
}
