/**
 * Short note on how style was shaped (no API).
 */
export default function FineTuningLesson() {
  return (
    <section className="space-y-2" aria-labelledby="lj-step-ft">
      <h2
        id="lj-step-ft"
        className="border-l-2 border-amber-500 pl-2 text-[14px] font-semibold text-slate-800"
      >
        What shaped this style
      </h2>
      <ul className="list-disc space-y-1 pl-4 text-[13px] leading-snug text-gray-700 marker:text-amber-600">
        <li>Fine-tuned on structured, step-by-step reasoning examples.</li>
        <li>Common phrases (&quot;Let us…&quot;, &quot;Therefore…&quot;) match the training style.</li>
      </ul>
      <p className="text-[13px] leading-snug text-slate-600">
        Same mechanics as any chat model; the dataset nudged the style.
      </p>
    </section>
  );
}
