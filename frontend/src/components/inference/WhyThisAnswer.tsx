interface WhyThisAnswerProps {
  bullets: string[];
}

export default function WhyThisAnswer({ bullets }: WhyThisAnswerProps) {
  if (!bullets.length) return null;
  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        Why this answer
      </h3>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 leading-relaxed marker:text-gray-400">
        {bullets.map((b, i) => (
          <li key={i}>{b}</li>
        ))}
      </ul>
    </section>
  );
}
