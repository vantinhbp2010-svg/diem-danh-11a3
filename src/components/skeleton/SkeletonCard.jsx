import Skeleton from "./Skeleton";
import SkeletonText from "./SkeletonText";

export default function SkeletonCard({ ariaHidden = false }) {
  return (
    <div
      className="skeleton-card"
      role={ariaHidden ? undefined : "status"}
      aria-label={ariaHidden ? undefined : "Đang tải thẻ"}
      aria-hidden={ariaHidden || undefined}
    >
      <Skeleton width={42} height={42} borderRadius={12} />
      <Skeleton width="58%" height={18} />
      <SkeletonText lines={2} />
    </div>
  );
}
