// ============ THỜI KHÓA BIỂU ============
// Sáng: 5 tiết
// Chiều: 4 tiết

export const GIO_SANG = [
  { tiet: 1, vao: "07:00", ra: "07:45" },
  { tiet: 2, vao: "07:50", ra: "08:35" },
  { tiet: 3, vao: "08:55", ra: "09:40" },
  { tiet: 4, vao: "09:45", ra: "10:30" },
  { tiet: 5, vao: "10:35", ra: "11:20" },
];

export const GIO_CHIEU = [
  { tiet: 2, vao: "13:30", ra: "14:15" },
  { tiet: 3, vao: "14:20", ra: "15:05" },
  { tiet: 4, vao: "15:20", ra: "16:05" },
  { tiet: 5, vao: "16:10", ra: "16:55" },
];

// Tên thứ
export const TEN_THU = {
  thu2: "Thứ 2",
  thu3: "Thứ 3",
  thu4: "Thứ 4",
  thu5: "Thứ 5",
  thu6: "Thứ 6",
  thu7: "Thứ 7",
};

// Alias để tương thích code cũ
export const TKB_SANG = GIO_SANG;
export const TKB_CHIEU = GIO_CHIEU;

// TKB mặc định — tất cả tiết đều có học
export function tkbMacDinh() {
  return {
    sang: [true, true, true, true, true],
    chieu: [false, false, false, false],
  };
}

// TKB đầy đủ cho 1 lớp — tất cả các thứ đều mặc định
export function tkbDayDu() {
  return {
    thu2: tkbMacDinh(),
    thu3: tkbMacDinh(),
    thu4: tkbMacDinh(),
    thu5: tkbMacDinh(),
    thu6: tkbMacDinh(),
    thu7: tkbMacDinh(),
  };
}

function gioToPhut(gio) {
  const [h, m] = gio.split(":").map(Number);
  return h * 60 + m;
}

export function gioHienTai() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/**
 * Lấy key thứ hiện tại: "thu2" → "thu7", Chủ nhật → null
 */
export function layThuHienTai() {
  const day = new Date().getDay();
  if (day === 0) return null;
  return `thu${day + 1}`;
}

/**
 * Tính tiết đang diễn ra theo giờ (CÓ xử lý ra chơi)
 * Quy tắc:
 *  - Trong tiết → chấm tiết đó
 *  - Ra chơi ngắn (≤10 phút) → chấm cho tiết sau luôn
 *  - Ra chơi dài (>10 phút) → chỉ chấm 5 phút cuối
 *  - Trước tiết 2 chiều 15 phút → chấm tiết 2 chiều
 */
export function tietDangDienRaTheoGio() {
  const phut = gioHienTai();

  // ============ BUỔI SÁNG ============
  for (let i = 0; i < GIO_SANG.length; i++) {
    const t = GIO_SANG[i];
    const vao = gioToPhut(t.vao);
    const ra = gioToPhut(t.ra);

    if (phut >= vao && phut <= ra) {
      return { buoi: "sang", ...t };
    }

    const tietSau = GIO_SANG[i + 1];
    if (!tietSau) continue;

    const vaoSau = gioToPhut(tietSau.vao);

    if (phut > ra && phut < vaoSau) {
      const thoiGianRaChoi = vaoSau - ra;

      if (thoiGianRaChoi <= 10) {
        return { buoi: "sang", ...tietSau };
      }

      if (phut >= vaoSau - 5) {
        return { buoi: "sang", ...tietSau };
      }

      return null;
    }
  }

  // ============ BUỔI CHIỀU ============
  const tiet2Chieu = GIO_CHIEU[0];
  const vaoChieu = gioToPhut(tiet2Chieu.vao);
  if (phut >= vaoChieu - 15 && phut < vaoChieu) {
    return { buoi: "chieu", ...tiet2Chieu };
  }

  for (let i = 0; i < GIO_CHIEU.length; i++) {
    const t = GIO_CHIEU[i];
    const vao = gioToPhut(t.vao);
    const ra = gioToPhut(t.ra);

    if (phut >= vao && phut <= ra) {
      return { buoi: "chieu", ...t };
    }

    const tietSau = GIO_CHIEU[i + 1];
    if (!tietSau) continue;

    const vaoSau = gioToPhut(tietSau.vao);

    if (phut > ra && phut < vaoSau) {
      const thoiGianRaChoi = vaoSau - ra;

      if (thoiGianRaChoi <= 10) {
        return { buoi: "chieu", ...tietSau };
      }

      if (phut >= vaoSau - 5) {
        return { buoi: "chieu", ...tietSau };
      }

      return null;
    }
  }

  return null;
}

/**
 * Tính tiết + kiểm tra TKB có tiết đó không
 * @param tkb TKB của lớp
 */
export function tietDangDienRa(tkb) {
  const tiet = tietDangDienRaTheoGio();
  if (!tiet) return null;

  if (!tkb) return tiet;

  const thu = layThuHienTai();
  if (!thu) return null;

  const tkbThu = tkb[thu];
  if (!tkbThu) return null;

  const mangTiet = tiet.buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
  const indexTiet = tiet.tiet - 1;

  if (mangTiet && mangTiet[indexTiet] === true) {
    return tiet;
  }

  return null;
}

export function tinhTrangThai(buoi, tiet, gioQuet) {
  const dsTiet = buoi === "sang" ? GIO_SANG : GIO_CHIEU;
  const tietInfo = dsTiet.find((t) => t.tiet === tiet);

  if (!tietInfo) {
    return { trangThai: "Sai tiết", phutTre: 0, diemTru: 0 };
  }

  const phutVao = gioToPhut(tietInfo.vao);
  const phutQuet = gioToPhut(gioQuet);

  if (phutQuet <= phutVao) {
    return { trangThai: "Đúng giờ", phutTre: 0, diemTru: 0 };
  }

  const phutTre = phutQuet - phutVao;
  return { trangThai: "Đi trễ", phutTre, diemTru: -3 };
}

export function tietDaHet(buoi, tiet) {
  const dsTiet = buoi === "sang" ? GIO_SANG : GIO_CHIEU;
  const tietInfo = dsTiet.find((t) => t.tiet === tiet);

  if (!tietInfo) return false;

  const phut = gioHienTai();
  const phutRa = gioToPhut(tietInfo.ra);

  return phut > phutRa;
}

/**
 * Lấy danh sách tiết đã kết thúc
 */
export function layTietDaKetThuc(buoi, tkb) {
  const dsTiet = buoi === "sang" ? GIO_SANG : GIO_CHIEU;
  const phut = gioHienTai();
  const thu = layThuHienTai();

  return dsTiet.filter((t) => {
    if (gioToPhut(t.ra) >= phut) return false;
    if (!tkb) return true;
    if (!thu) return false;

    const tkbThu = tkb[thu];
    if (!tkbThu) return false;

    const mangTiet = buoi === "sang" ? tkbThu.sang : tkbThu.chieu;
    const indexTiet = t.tiet - 1;

    return mangTiet && mangTiet[indexTiet] === true;
  });
}