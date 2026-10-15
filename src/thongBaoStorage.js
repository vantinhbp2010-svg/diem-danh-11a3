const THONG_BAO_KEY = "thong_bao_templates";
const LICH_SU_KEY = "lich_su_gui_thong_bao";

export function getThongBaoAll() {
  try {
    const raw = localStorage.getItem(THONG_BAO_KEY);
    if (!raw) {
      return [
        "Kính gửi phụ huynh em {ten}, em đã vắng tiết {tiet} buổi {buoi} ngày {ngay}.",
        "Kính gửi phụ huynh em {ten}, em đã đi trễ {phut} phút tiết {tiet} buổi {buoi} ngày {ngay}.",
        "Kính gửi phụ huynh em {ten}, em vắng có phép tiết {tiet} buổi {buoi} ngày {ngay}.",
      ];
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : [];
  } catch (error) {
    console.warn("Không đọc được mẫu thông báo:", error);
    return [];
  }
}

export function luuLichSuGui(maLop, ngay, dsGui) {
  try {
    const all = JSON.parse(localStorage.getItem(LICH_SU_KEY) || "{}");
    const key = `${maLop || "lop"}-${ngay}`;
    all[key] = Array.isArray(dsGui) ? dsGui : [];
    localStorage.setItem(LICH_SU_KEY, JSON.stringify(all));
    return true;
  } catch (error) {
    console.warn("Không lưu lịch sử gửi:", error);
    return false;
  }
}

export function getLichSuGui(maLop, ngay) {
  try {
    const all = JSON.parse(localStorage.getItem(LICH_SU_KEY) || "{}");
    const key = `${maLop || "lop"}-${ngay}`;
    return Array.isArray(all[key]) ? all[key] : [];
  } catch (error) {
    console.warn("Không đọc lịch sử gửi:", error);
    return [];
  }
}
