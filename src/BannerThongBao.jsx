import { useEffect, useState } from "react";
import { subscribeThongBaoAdmin } from "./bannerStorage";
import {
  LICH_TRONG_DAI,
  laySuKienHomNay,
} from "./lichTrongDai";
import "./App.css";

export default function BannerThongBao() {
  const [adminMsg, setAdminMsg] = useState(null);
  const [adminLoaded, setAdminLoaded] = useState(false);
  const [homNay, setHomNay] = useState(() => new Date());
  const [daDongKey, setDaDongKey] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeThongBaoAdmin(
      (data) => {
        setAdminMsg(data);
        setAdminLoaded(true);
      },
      (error) => {
        console.error("Không tải được thông báo toàn trường:", error);
        setAdminLoaded(true);
      }
    );
    const timer = setInterval(() => setHomNay(new Date()), 60_000);

    return () => {
      unsubscribe();
      clearInterval(timer);
    };
  }, []);

  const adminActive =
    adminMsg?.isActive === true && typeof adminMsg.noiDung === "string";
  if (!adminLoaded) return null;

  const holidays = adminActive
    ? []
    : laySuKienHomNay(LICH_TRONG_DAI, homNay);

  let banner = null;
  if (adminActive) {
    banner = {
      key: `admin:${adminMsg.ngay || ""}:${adminMsg.noiDung}`,
      kind: "admin",
      icon: "📢",
      title: "Thông báo từ nhà trường",
      message: adminMsg.noiDung,
    };
  } else if (holidays.length > 0) {
    banner = {
      key: `holiday:${homNay.getFullYear()}-${homNay.getMonth()}-${homNay.getDate()}`,
      kind: "holiday",
      icon: holidays.map((event) => event.icon).join(" "),
      title: "Sự kiện trọng đại",
      message: `Hôm nay là ${holidays.map((event) => event.ten).join(", ")}!`,
    };
  }

  if (!banner || daDongKey === banner.key) return null;

  return (
    <aside
      className={`banner-thong-bao banner-thong-bao-${banner.kind}`}
      role="status"
      aria-live="polite"
    >
      <span className="banner-thong-bao-icon" aria-hidden="true">
        {banner.icon}
      </span>
      <div className="banner-thong-bao-content">
        <p className="banner-thong-bao-title">{banner.title}</p>
        <p className="banner-thong-bao-message">{banner.message}</p>
      </div>
      <button
        className="banner-thong-bao-close"
        type="button"
        aria-label="Đóng thông báo"
        onClick={() => setDaDongKey(banner.key)}
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
