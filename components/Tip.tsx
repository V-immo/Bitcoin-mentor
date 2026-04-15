type Props = { text: string; wide?: boolean };

export default function Tip({ text, wide }: Props) {
  return (
    <span className="tip-wrap">
      <span className="tip-icon">ⓘ</span>
      <span className={`tip-box${wide ? " tip-box-wide" : ""}`}>{text}</span>
    </span>
  );
}
