interface PromptSectionProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
}

/**
 * Minimal prompt input — product-style, low visual noise.
 */
export default function PromptSection({ onSubmit, disabled }: PromptSectionProps) {
  return (
    <section className="space-y-2">
      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide">
        Your question
      </label>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const raw = String(fd.get("q") ?? "").trim();
          if (!raw || disabled) return;
          onSubmit(raw);
          e.currentTarget.reset();
        }}
      >
        <textarea
          name="q"
          rows={2}
          disabled={disabled}
          placeholder="Ask Sherlock a question…"
          className="w-full resize-y rounded-lg border-0 bg-gray-100/80 px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-gray-300 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled}
          className="self-start rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-40 transition-colors"
        >
          Ask
        </button>
      </form>
    </section>
  );
}
