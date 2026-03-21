export interface BranchCard {
  id: string;
  label: string;
  preview: string;
}

interface BranchViewerProps {
  branches: BranchCard[];
}

export default function BranchViewer({ branches }: BranchViewerProps) {
  if (!branches.length) return null;
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Branches</h3>
      <div className="space-y-3">
        {branches.map((b) => (
          <article
            key={b.id}
            className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-gray-500 mb-2">{b.label}</p>
            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{b.preview}</p>
          </article>
        ))}
      </div>
    </div>
  );
}
