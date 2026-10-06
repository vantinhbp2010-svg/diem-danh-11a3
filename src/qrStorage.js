const KEY = "qr_cccd_11A3";

export function getQRs() {
  const raw = localStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : {};
}

export function saveQR(studentId, qrText) {
  const data = getQRs();
  data[studentId] = qrText;
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function deleteQR(studentId) {
  const data = getQRs();
  delete data[studentId];
  localStorage.setItem(KEY, JSON.stringify(data));
}

/**
 * Tìm học sinh theo QR đã quét.
 * So khớp linh hoạt: nếu chuỗi quét được dài hơn
 * (do QR CCCD chứa nhiều thông tin), thì so khớp phần đầu.
 */
export function findStudentByQR(qrText) {
  const data = getQRs();
  const cleaned = qrText.trim();

  // 1. Khớp chính xác
  let found = Object.keys(data).find((id) => data[id] === cleaned);
  if (found) return found;

  // 2. Khớp mờ: chuỗi lưu là 1 phần của chuỗi quét
  found = Object.keys(data).find((id) => {
    const saved = data[id];
    if (!saved || saved.length < 6) return false;
    return cleaned.includes(saved) || saved.includes(cleaned);
  });
  if (found) return found;

  // 3. Trích số CCCD (9 hoặc 12 số) từ chuỗi quét rồi so
  const match = cleaned.match(/\d{9,12}/);
  if (match) {
    const cccd = match[0];
    found = Object.keys(data).find((id) => {
      const saved = data[id];
      return saved && saved.includes(cccd);
    });
  }
  return found || null;
}