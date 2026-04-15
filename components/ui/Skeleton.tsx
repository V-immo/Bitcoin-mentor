type Props = {
  width?: string | number;
  height?: string | number;
  className?: string;
  rounded?: boolean;
};

export default function Skeleton({ width, height = 14, className, rounded }: Props) {
  return (
    <div
      className={`skeleton${rounded ? " skeleton-circle" : ""} ${className ?? ""}`}
      style={{ width: width ?? "100%", height }}
    />
  );
}
