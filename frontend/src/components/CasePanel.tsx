interface CaseData {
  title: string;
  suspects: string[];
  clues: string[];
}

interface Props {
  caseData: CaseData | null;
  revealed: boolean;
  onReveal: () => void;
}

export function CasePanel({ caseData, revealed, onReveal }: Props) {
  if (!caseData) return null;
  return (
    <section className="case-panel">
      <header className="case-header">
        <div>
          <h2>{caseData.title}</h2>
          <p className="muted">Current mystery case</p>
        </div>
        <button type="button" className="secondary-btn" onClick={onReveal}>
          {revealed ? "Hide clues" : "Reveal clues"}
        </button>
      </header>
      {revealed && (
        <div className="case-body">
          <div>
            <h3>Suspects</h3>
            <ul>
              {caseData.suspects.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3>Clues</h3>
            <ul>
              {caseData.clues.map((c, idx) => (
                <li key={idx}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

