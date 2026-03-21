interface ModelInsightPanelProps {
  text: string;
}

export default function ModelInsightPanel({ text }: ModelInsightPanelProps) {
  if (!text.trim()) return null;
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/80 px-4 py-3">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">
        Model insight
      </p>
      <p className="text-sm text-gray-700 leading-relaxed">{text}</p>
    </div>
  );
}
