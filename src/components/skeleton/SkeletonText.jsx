import Skeleton from "./Skeleton";

export default function SkeletonText({ lines = 3 }) {
  return (
    <div className="skeleton-text" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          width={index === lines - 1 ? "64%" : "100%"}
          height={12}
        />
      ))}
    </div>
  );
}
