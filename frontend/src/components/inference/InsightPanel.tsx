/**
 * Static, jargon-free explanation of next-token “best-fit” decoding.
 */
export default function InsightPanel() {
  return (
    <section
      className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3 text-sm text-gray-600 leading-relaxed"
      aria-label="How the model builds its answer"
    >
      <p>
        The model builds its answer one word at a time by choosing the most likely (“best-fit”) next
        word. Small changes in those choices can lead to different outcomes.
      </p>
    </section>
  );
}
