const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";
const MAX_IMAGE_BASE64_LENGTH = 2_800_000;

function errorResult(status, error) {
  return { status, body: { error } };
}

export async function uploadImageToImgBB(body, apiKey, fetcher = fetch) {
  if (!apiKey) {
    return errorResult(500, "Máy chủ chưa cấu hình dịch vụ tải ảnh.");
  }

  const image = body?.image;
  if (
    typeof image !== "string" ||
    image.length === 0 ||
    image.length > MAX_IMAGE_BASE64_LENGTH ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      image
    )
  ) {
    return errorResult(400, "Dữ liệu ảnh không hợp lệ hoặc vượt quá giới hạn.");
  }

  try {
    const formData = new FormData();
    formData.append("key", apiKey);
    formData.append("image", image);

    const response = await fetcher(IMGBB_UPLOAD_URL, {
      method: "POST",
      body: formData,
    });
    const result = await response.json();
    const url = result?.data?.url;

    if (!response.ok || result?.success !== true || typeof url !== "string") {
      console.error("ImgBB từ chối tải ảnh:", response.status);
      return errorResult(502, "Dịch vụ ảnh không thể nhận file lúc này.");
    }

    if (new URL(url).protocol !== "https:") {
      console.error("ImgBB trả về URL ảnh không an toàn.");
      return errorResult(502, "Dịch vụ ảnh trả về liên kết không hợp lệ.");
    }

    return { status: 200, body: { url } };
  } catch (error) {
    console.error("Không thể tải ảnh lên ImgBB:", error.message);
    return errorResult(502, "Không thể kết nối dịch vụ tải ảnh.");
  }
}
