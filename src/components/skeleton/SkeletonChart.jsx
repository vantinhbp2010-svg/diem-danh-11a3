import Skeleton from "./Skeleton";

export default function SkeletonChart() {
  return (
    <div
      className="skeleton-chart"
      role="status"
      aria-label="Đang tải biểu đồ"
    >
      <Skeleton width="38%" height={18} />
      <div className="skeleton-chart-bars">
        {[45, 70, 56, 88, 62, 78, 51].map((height, index) => (
          <Skeleton
            key={index}
            width="8%"
            height={`${height}%`}
            borderRadius="6px 6px 0 0"
          />
        ))}
      </div>
    </div>
  );
}
