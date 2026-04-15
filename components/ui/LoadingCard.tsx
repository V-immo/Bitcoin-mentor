import Skeleton from "./Skeleton";

type Props = {
  lines?: number;
  className?: string;
};

export default function LoadingCard({ lines = 3, className }: Props) {
  return (
    <div className={`card ${className ?? ""}`} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <Skeleton height={18} width="45%" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? "70%" : "100%"} />
      ))}
    </div>
  );
}
