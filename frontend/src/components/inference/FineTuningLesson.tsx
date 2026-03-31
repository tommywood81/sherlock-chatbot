/**
 * Fine-tuning note (no API).
 */
export default function FineTuningLesson() {
  return (
    <section className="space-y-2" aria-labelledby="lj-step-ft">
      <h2
        id="lj-step-ft"
        className="border-l-2 border-amber-500 pl-2 text-[14px] font-semibold text-slate-800"
      >
        Fine-tuning
      </h2>
      <p className="text-[13px] leading-relaxed text-slate-700">
        This model was fine-tuned to reason in a structured way, chat naturally, and still handle general questions.
      </p>
    </section>
  );
}
