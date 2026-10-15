export const MAU_THONG_BAO = {
  vang: "Kính gửi phụ huynh em {ten}, em đã VẮNG tiết {tiet} buổi {buoi} ngày {ngay} mà không có phép. Vui lòng liên hệ với giáo viên chủ nhiệm để xác nhận và hỗ trợ em học tập.",
  tre: "Kính gửi phụ huynh em {ten}, em đã ĐI TRỄ {phut} phút tiết {tiet} buổi {buoi} ngày {ngay}. Xin phụ huynh nhắc nhở em đúng giờ trong những tiết học sau.",
  coPhep: "Kính gửi phụ huynh em {ten}, em vắng CÓ PHÉP tiết {tiet} buổi {buoi} ngày {ngay}. Xin lưu ý lịch học và hỗ trợ em bù kiến thức kịp thời.",
};

export function renderMauThongBao(type, data) {
  const template = MAU_THONG_BAO[type] || MAU_THONG_BAO.vang;
  const values = {
    ten: data.ten || "em",
    tiet: data.tiet || "",
    buoi: data.buoi === "chieu" ? "chiều" : "sáng",
    ngay: data.ngay || "hôm nay",
    phut: data.phut || "",
    lyDo: data.lyDo || "",
  };

  return template.replace(/\{(\w+)\}/g, (_, key) => values[key] ?? "");
}
