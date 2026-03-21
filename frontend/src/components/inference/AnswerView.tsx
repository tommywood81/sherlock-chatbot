interface AnswerViewProps {
  answer: string | null;
  isStreaming?: boolean;
}

/** Hero final answer — no probabilities, calm typography. */
export default function AnswerView({ answer, isStreaming }: AnswerViewProps) {
  if (!answer && !isStreaming) {
    return (
      <p className="text-gray-400 text-sm leading-relaxed">
        The model&apos;s conclusion will appear here.
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Answer</h2>
      <p className="text-2xl sm:text-3xl font-light text-gray-900 leading-snug tracking-tight whitespace-pre-wrap">
        {answer}
        {isStreaming && (
          <span className="inline-block w-2 h-6 ml-1 align-middle bg-gray-300 animate-pulse rounded-sm" />
        )}
      </p>
    </div>
  );
}
