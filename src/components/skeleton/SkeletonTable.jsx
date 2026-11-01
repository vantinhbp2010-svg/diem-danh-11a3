import Skeleton from "./Skeleton";
import SkeletonRow from "./SkeletonRow";

export default function SkeletonTable({ rows = 8, cols = 5, ariaHidden = false }) {
  return (
    <div
      className="skeleton-table-view"
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaHidden ? undefined : "Đang tải bảng dữ liệu"}
      aria-hidden={ariaHidden || undefined}
    >
      <div
        className="skeleton-table-head"
        aria-hidden="true"
        style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: cols }, (_, index) => (
          <Skeleton key={index} height={18} />
        ))}
      </div>
      <div className="skeleton-table-body" aria-hidden="true">
        {Array.from({ length: rows }, (_, index) => (
          <div
            className="skeleton-table-line"
            key={index}
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {index === 0 ? <SkeletonRow /> : null}
            {Array.from({ length: cols - (index === 0 ? 1 : 0) }, (_, cell) => (
              <Skeleton key={cell} height={16} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
