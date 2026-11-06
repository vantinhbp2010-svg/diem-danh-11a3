export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Method not allowed." },
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  if (!env.VERCEL_API_ORIGIN) {
    return Response.json(
      { error: "Máy chủ chưa cấu hình dịch vụ tải ảnh." },
      { status: 503 }
    );
  }

  try {
    const apiUrl = new URL("/api/upload-image", env.VERCEL_API_ORIGIN);
    if (apiUrl.protocol !== "https:") {
      return Response.json(
        { error: "Cấu hình máy chủ tải ảnh không hợp lệ." },
        { status: 500 }
      );
    }

    const headers = new Headers({
      "Content-Type": request.headers.get("content-type") || "application/json",
    });
    const authorization = request.headers.get("authorization");
    if (authorization) headers.set("Authorization", authorization);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers,
      body: await request.text(),
    });

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type":
          response.headers.get("content-type") || "application/json",
      },
    });
  } catch (error) {
    console.error("Không thể chuyển tiếp yêu cầu tải ảnh:", error.message);
    return Response.json(
      { error: "Không thể kết nối máy chủ tải ảnh." },
      { status: 502 }
    );
  }
}
