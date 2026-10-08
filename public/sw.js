const CACHE_NAME = "diem-danh-11a3-v2";
const URLS_TO_CACHE = ["/", "/khach", "/login", "/models/tiny_face_detector_model-weights_manifest.json"];

// Cài đặt
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(URLS_TO_CACHE).catch(() => {});
    })
  );
  self.skipWaiting();
});

// Kích hoạt — xóa cache cũ
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Chặn request
self.addEventListener("fetch", (event) => {
  // Bỏ qua request Firebase, API
  if (
    event.request.url.includes("firebase") ||
    event.request.url.includes("googleapis") ||
    event.request.url.includes("imgbb")
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return (
        cached ||
        fetch(event.request)
          .then((response) => {
            // Cache các file tĩnh
            if (
              event.request.method === "GET" &&
              response.status === 200 &&
              (event.request.url.includes(".js") ||
                event.request.url.includes(".css") ||
                event.request.url.includes(".html") ||
                event.request.url.includes(".png") ||
                event.request.url.includes(".jpg") ||
                event.request.url.includes("models"))
            ) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, clone).catch(() => {});
              });
            }
            return response;
          })
          .catch(() => {
            // Nếu offline → trả về trang chủ
            if (event.request.mode === "navigate") {
              return caches.match("/khach");
            }
          })
      );
    })
  );
});