import { createGroqChatStream } from "../_shared/groqChat.js";

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

  const result = await createGroqChatStream(body, env.GROQ_API_KEY);
  const headers = new Headers();
  if (result.status !== 200) {
    headers.set("Content-Type", "application/json");
    if (result.retryAfter) headers.set("Retry-After", result.retryAfter);

    return new Response(JSON.stringify(result.body), { status: result.status, headers });
  }

  headers.set("Content-Type", "text/event-stream; charset=utf-8");
  headers.set("Cache-Control", "no-cache, no-transform");
  headers.set("X-Accel-Buffering", "no");
  return new Response(result.stream, { status: 200, headers });
}
