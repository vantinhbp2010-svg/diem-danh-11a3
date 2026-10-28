import { useEffect, useState } from "react";
import "./ux.css";

export function EmptyState({
  icon = "📭",
  title,
  description,
  actionText,
  onAction,
}) {
  return (
    <section className="empty-state" aria-live="polite">
      <div className="empty-state-icon" aria-hidden="true">
        {icon}
      </div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {actionText && onAction && (
        <button type="button" onClick={onAction}>
          {actionText}
        </button>
      )}
    </section>
  );
}

export function SkeletonLoading({ variant = "content", rows = 4 }) {
  if (variant === "table") {
    return (
      <div className="skeleton-table" role="status" aria-label="Đang tải dữ liệu">
        {Array.from({ length: rows }, (_, index) => (
          <div className="skeleton-table-row" key={index}>
            <span />
            <span />
            <span />
            <span />
          </div>
        ))}
      </div>
    );
  }

  if (variant === "stats") {
    return (
      <div className="skeleton-stats" role="status" aria-label="Đang tải thống kê">
        <div className="skeleton-card-row">
          <span />
          <span />
          <span />
        </div>
        <span className="skeleton-line" />
        <span className="skeleton-line short" />
        <div className="skeleton-table-row">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="skeleton-table-row">
          <span />
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="tab-skeleton" role="status" aria-label="Đang tải nội dung">
      <span />
      <span />
      <span />
    </div>
  );
}

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener("online", setOnline);
    window.addEventListener("offline", setOffline);
    return () => {
      window.removeEventListener("online", setOnline);
      window.removeEventListener("offline", setOffline);
    };
  }, []);

  if (isOnline) return null;
  return (
    <div className="offline-banner" role="status">
      📡 Bạn đang ngoại tuyến. Điểm danh sẽ được đồng bộ khi có mạng.
    </div>
  );
}
