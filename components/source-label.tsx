export function SourceLabel({ label }: { label: string }) {
  return <>{label.split(/(https?:\/\/[^\s]+)/).map((part, i) => /^https?:\/\//.test(part) ? <a key={i} href={part} target="_blank" rel="noreferrer">查看原始出处 ↗</a> : part)}</>;
}
