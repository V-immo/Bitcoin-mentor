type Props = {
  label: string;
  value: string;
};

export default function TradePlanCard({ label, value }: Props) {
  return (
    <div className="card">
      <div className="label">{label}</div>
      <div className="value-sm">{value}</div>
    </div>
  );
}
