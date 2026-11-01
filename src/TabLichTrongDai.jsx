import { useEffect, useState } from "react";
import {
  LICH_TRONG_DAI,
  laySuKienHomNay,
  laySuKienSapToi,
} from "./lichTrongDai";

const ngayHienThi = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
});

export default function TabLichTrongDai() {
  const [homNay, setHomNay] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setHomNay(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const suKienHomNay = laySuKienHomNay(LICH_TRONG_DAI, homNay);
  const suKienSapToi = laySuKienSapToi(LICH_TRONG_DAI, 3, homNay);
  const tatCaSuKien = laySuKienSapToi(
    LICH_TRONG_DAI,
    LICH_TRONG_DAI.length,
    homNay
  );

  return (
    <section className="lich-trong-dai" aria-labelledby="lich-trong-dai-title">
      <header className="lich-trong-dai-header">
        <span className="lich-trong-dai-header-icon" aria-hidden="true">
          📅
        </span>
        <div>
          <h2 id="lich-trong-dai-title">Lịch trọng đại</h2>
          <p>Ngày lễ và sự kiện đáng nhớ trong năm</p>
        </div>
      </header>

      {suKienHomNay.length > 0 && (
        <section className="lich-trong-dai-today" aria-live="polite">
          <h3>🎉 Hôm nay có sự kiện</h3>
          {suKienHomNay.map((event) => (
            <p key={event.ten}>
              <span aria-hidden="true">{event.icon}</span> {event.ten}
            </p>
          ))}
        </section>
      )}

      <section className="lich-trong-dai-upcoming" aria-labelledby="su-kien-sap-toi">
        <div className="lich-trong-dai-section-title">
          <div>
            <h3 id="su-kien-sap-toi">Sắp diễn ra</h3>
            <p>Đếm ngược đến những ngày đáng nhớ</p>
          </div>
          <span aria-hidden="true">⏰</span>
        </div>
        <div className="lich-trong-dai-cards">
          {suKienSapToi.map((event) => (
            <article className="lich-trong-dai-card" key={event.ten}>
              <div className="lich-trong-dai-date">
                <strong>{ngayHienThi.format(event.ngayDuong)}</strong>
                <span>{event.ngayDuong.getFullYear()}</span>
              </div>
              <div className="lich-trong-dai-event">
                <span className="lich-trong-dai-event-icon" aria-hidden="true">
                  {event.icon}
                </span>
                <div>
                  <h4>{event.ten}</h4>
                  <p>
                    {event.amLich ? "15 tháng 8 âm lịch" : "Dương lịch"}
                  </p>
                </div>
              </div>
              <span className="lich-trong-dai-countdown">
                {event.soNgayConLai === 0
                  ? "Hôm nay"
                  : `Còn ${event.soNgayConLai} ngày`}
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="lich-trong-dai-all" aria-labelledby="tat-ca-su-kien">
        <div className="lich-trong-dai-section-title">
          <div>
            <h3 id="tat-ca-su-kien">Tất cả sự kiện</h3>
            <p>Lịch ngày dương tương ứng trong chu kỳ tiếp theo</p>
          </div>
          <span aria-hidden="true">📜</span>
        </div>
        <div className="lich-trong-dai-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Ngày</th>
                <th scope="col">Sự kiện</th>
                <th scope="col">Lịch</th>
              </tr>
            </thead>
            <tbody>
              {tatCaSuKien.map((event) => (
                <tr key={event.ten}>
                  <td>{ngayHienThi.format(event.ngayDuong)}</td>
                  <td>
                    <span aria-hidden="true">{event.icon}</span> {event.ten}
                  </td>
                  <td>{event.amLich ? "Âm lịch" : "Dương lịch"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}
