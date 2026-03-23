interface RawReasoningCollapsibleProps {
  text: string;
}

export default function RawReasoningCollapsible({ text }: RawReasoningCollapsibleProps) {
  if (!text.trim()) {
    return null;
  }

  return (
    <details className="group text-[15px]">
      <summary className="cursor-pointer text-[13px] font-medium text-gray-900 underline decoration-gray-300 underline-offset-4 hover:decoration-gray-500 list-none [&::-webkit-details-marker]:hidden">
        <span className="inline">View raw reasoning</span>
      </summary>
      <pre className="mt-4 whitespace-pre-wrap break-words font-sans text-[15px] leading-relaxed text-gray-600 border-0 p-0 m-0 bg-transparent">
        {text.trim()}
      </pre>
    </details>
  );
}
