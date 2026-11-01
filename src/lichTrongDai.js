export const LICH_TRONG_DAI = [
  { ngay: "01-01", ten: "Tết Dương lịch", icon: "🎆", loai: "le" },
  { ngay: "03-02", ten: "Ngày thành lập Đảng Cộng sản Việt Nam", icon: "🚩", loai: "le" },
  { ngay: "08-03", ten: "Quốc tế Phụ nữ", icon: "🌹", loai: "le" },
  { ngay: "26-03", ten: "Ngày thành lập Đoàn TNCS Hồ Chí Minh", icon: "💙", loai: "doan" },
  { ngay: "30-04", ten: "Ngày Giải phóng miền Nam", icon: "🇻🇳", loai: "le" },
  { ngay: "01-05", ten: "Ngày Quốc tế Lao động", icon: "✊", loai: "le" },
  { ngay: "19-05", ten: "Ngày sinh Chủ tịch Hồ Chí Minh", icon: "🌻", loai: "le" },
  { ngay: "01-06", ten: "Ngày Quốc tế Thiếu nhi", icon: "🧸", loai: "le" },
  { ngay: "27-07", ten: "Ngày Thương binh Liệt sĩ", icon: "🕯️", loai: "le" },
  {
    ngay: "15-08",
    ten: "Tết Trung thu",
    icon: "🏮",
    loai: "le",
    amLich: true,
  },
  { ngay: "02-09", ten: "Quốc khánh nước Cộng hòa XHCN Việt Nam", icon: "🎉", loai: "le" },
  { ngay: "20-10", ten: "Ngày Phụ nữ Việt Nam", icon: "🌷", loai: "le" },
  { ngay: "20-11", ten: "Ngày Nhà giáo Việt Nam", icon: "👨‍🏫", loai: "le" },
  { ngay: "22-12", ten: "Ngày thành lập Quân đội Nhân dân Việt Nam", icon: "🎖️", loai: "le" },
  { ngay: "25-12", ten: "Giáng sinh", icon: "🎄", loai: "le" },
];

const TIME_ZONE = 7;
const PI = Math.PI;

function jdFromDate(day, month, year) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  let jd =
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045;

  if (jd < 2299161) {
    jd =
      day +
      Math.floor((153 * m + 2) / 5) +
      365 * y +
      Math.floor(y / 4) -
      32083;
  }
  return jd;
}

function jdToDate(jd) {
  let a = jd;
  if (jd >= 2299161) {
    const alpha = Math.floor((jd - 1867216.25) / 36524.25);
    a = jd + 1 + alpha - Math.floor(alpha / 4);
  }

  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return new Date(year, month - 1, day, 12);
}

function getNewMoonDay(k) {
  const t = k / 1236.85;
  const t2 = t * t;
  const t3 = t2 * t;
  const dr = PI / 180;
  let jd =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * t2 -
    0.000000155 * t3;
  jd += 0.00033 * Math.sin((166.56 + 132.87 * t - 0.009173 * t2) * dr);

  const meanAnomaly = 359.2242 + 29.10535608 * k - 0.0000333 * t2 - 0.00000347 * t3;
  const moonAnomaly = 306.0253 + 385.81691806 * k + 0.0107306 * t2 + 0.00001236 * t3;
  const f = 21.2964 + 390.67050646 * k - 0.0016528 * t2 - 0.00000239 * t3;
  let correction =
    (0.1734 - 0.000393 * t) * Math.sin(meanAnomaly * dr) +
    0.0021 * Math.sin(2 * meanAnomaly * dr) -
    0.4068 * Math.sin(moonAnomaly * dr) +
    0.0161 * Math.sin(2 * moonAnomaly * dr) -
    0.0004 * Math.sin(3 * moonAnomaly * dr) +
    0.0104 * Math.sin(2 * f * dr) -
    0.0051 * Math.sin((meanAnomaly + moonAnomaly) * dr) -
    0.0074 * Math.sin((meanAnomaly - moonAnomaly) * dr) +
    0.0004 * Math.sin((2 * f + meanAnomaly) * dr) -
    0.0004 * Math.sin((2 * f - meanAnomaly) * dr) -
    0.0006 * Math.sin((2 * f + moonAnomaly) * dr) +
    0.001 * Math.sin((2 * f - moonAnomaly) * dr) +
    0.0005 * Math.sin((2 * moonAnomaly + meanAnomaly) * dr);
  const deltaT =
    t < -11
      ? 0.001 + 0.000839 * t + 0.0002261 * t2 - 0.00000845 * t3 - 0.000000081 * t2 * t2
      : -0.000278 + 0.000265 * t + 0.000262 * t2;

  return Math.floor(jd + correction - deltaT + 0.5 + TIME_ZONE / 24);
}

function getSunLongitude(dayNumber) {
  const t = (dayNumber - 2451545.5) / 36525;
  const t2 = t * t;
  const dr = PI / 180;
  const meanAnomaly = 357.5291 + 35999.0503 * t - 0.0001559 * t2 - 0.00000048 * t2 * t;
  const meanLongitude = 280.46645 + 36000.76983 * t + 0.0003032 * t2;
  const correction =
    (1.9146 - 0.004817 * t - 0.000014 * t2) * Math.sin(meanAnomaly * dr) +
    (0.019993 - 0.000101 * t) * Math.sin(2 * meanAnomaly * dr) +
    0.00029 * Math.sin(3 * meanAnomaly * dr);
  let longitude = (meanLongitude + correction) * dr;
  longitude -= 2 * PI * Math.floor(longitude / (2 * PI));
  return Math.floor((longitude / PI) * 6);
}

function getLunarMonth11(year) {
  const offset = jdFromDate(31, 12, year) - 2415021;
  const k = Math.floor(offset / 29.530588853);
  let newMoon = getNewMoonDay(k);
  if (getSunLongitude(newMoon) >= 9) {
    newMoon = getNewMoonDay(k - 1);
  }
  return newMoon;
}

function getLeapMonthOffset(lunarMonth11) {
  const k = Math.floor((lunarMonth11 - 2415021.076998695) / 29.530588853 + 0.5);
  let previousSunLongitude = 0;
  let i = 1;
  let sunLongitude = getSunLongitude(getNewMoonDay(k + i));

  while (sunLongitude !== previousSunLongitude && i < 14) {
    previousSunLongitude = sunLongitude;
    i++;
    sunLongitude = getSunLongitude(getNewMoonDay(k + i));
  }
  return i - 1;
}

function getLunarDate(day, month, year) {
  const lunarMonth11 = getLunarMonth11(month < 11 ? year - 1 : year);
  const nextLunarMonth11 = getLunarMonth11(month < 11 ? year : year + 1);
  const k = Math.floor((lunarMonth11 - 2415021.076998695) / 29.530588853 + 0.5);
  let monthOffset = month - 11;
  if (monthOffset < 0) monthOffset += 12;

  if (nextLunarMonth11 - lunarMonth11 > 365) {
    const leapMonthOffset = getLeapMonthOffset(lunarMonth11);
    if (monthOffset >= leapMonthOffset) monthOffset++;
  }

  return jdToDate(getNewMoonDay(k + monthOffset) + day - 1);
}

function getEventDate(event, year) {
  const [day, month] = event.ngay.split("-").map(Number);
  return event.amLich
    ? getLunarDate(day, month, year)
    : new Date(year, month - 1, day, 12);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

function daysBetween(first, second) {
  const firstUtc = Date.UTC(first.getFullYear(), first.getMonth(), first.getDate());
  const secondUtc = Date.UTC(second.getFullYear(), second.getMonth(), second.getDate());
  return Math.round((secondUtc - firstUtc) / 86400000);
}

export function layNgayHomNayDDMM(date = new Date()) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}`;
}

export function laySuKienSapToi(danhSach, soLuong = 5, date = new Date()) {
  const today = startOfDay(date);
  const upcoming = danhSach
    .map((event) => {
      const eventDate = [today.getFullYear(), today.getFullYear() + 1]
        .map((year) => getEventDate(event, year))
        .find((candidate) => candidate >= today);

      return eventDate
        ? {
            ...event,
            ngayDuong: eventDate,
            soNgayConLai: daysBetween(today, eventDate),
          }
        : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.ngayDuong - b.ngayDuong);

  return upcoming.slice(0, Math.max(0, Math.floor(soLuong)));
}

export function laySuKienHomNay(danhSach, date = new Date()) {
  const today = startOfDay(date);
  return danhSach.filter(
    (event) => getEventDate(event, today.getFullYear()).getTime() === today.getTime()
  );
}
