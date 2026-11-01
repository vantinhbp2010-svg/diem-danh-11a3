import Skeleton from "./Skeleton";
import SkeletonText from "./SkeletonText";

export default function SkeletonRow() {
  return (
    <div className="skeleton-row" aria-hidden="true">
      <Skeleton width={38} height={38} borderRadius="50%" />
      <SkeletonText lines={2} />
    </div>
  );
}
