export default function Skeleton({
  width = "100%",
  height = 16,
  borderRadius = 8,
  className = "",
}) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width, height, borderRadius }}
      aria-hidden="true"
    />
  );
}
