type Props = {
  label: string;
  value: string;
  color?: "green" | "orange" | "red";
};

export default function StatusCard({ label, value, color }: Props) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className={`value-sm ${color ?? ""}`}>{value}</div>
    </div>
  );
}
