interface WhyThisAnswerProps {
  bullets: string[];
  /** When false, only the bullet list (e.g. inside a &lt;details&gt; summary). */
  showHeading?: boolean;
}

export default function WhyThisAnswer({ bullets, showHeading = true }: WhyThisAnswerProps) {
  if (!bullets.length) return null;
  return (
    <section className="space-y-3">
      {showHeading ? (
        <h3 className="text-[13px] font-medium text-gray-500">Why this answer</h3>
      ) : null}
      <ul className="list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-gray-800 marker:text-gray-400">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </section>
  );
}
