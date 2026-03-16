interface Props {
  onUsePrompt: (text: string) => void;
}

const SAMPLE_LABELS: { id: string; label: string }[] = [
  { id: "watson", label: "What do you think of Dr Watson?" },
  { id: "tiny-mystery", label: "Tiny mystery" },
  { id: "eiffel", label: "Where's the Eiffel Tower?" },
];

export function SamplePrompts({ onUsePrompt }: Props) {
  return (
    <div className="sample-prompts">
      <span className="sample-label">Sample prompts:</span>
      {SAMPLE_LABELS.map((s) => (
        <button
          key={s.id}
          type="button"
          className="chip-btn"
          onClick={() => onUsePrompt(s.label)}
        >
          {s.label}
        </button>
      ))}
    </div>
  );
}

