interface TokenStreamProps {
  tokens: string[];
  isStreaming?: boolean;
}

export default function TokenStream({ tokens, isStreaming }: TokenStreamProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
        Token stream
      </h3>
      <p className="font-mono text-sm text-gray-700 break-all">
        {tokens.length === 0 && !isStreaming ? (
          <span className="text-gray-400">Tokens will appear here as they are generated.</span>
        ) : (
          tokens.map((t, i) => (
            <span key={i}>
              <span className="text-gray-800">{t}</span>
              {i < tokens.length - 1 ? " | " : ""}
            </span>
          ))
        )}
        {isStreaming && tokens.length > 0 && (
          <span className="inline-block h-3 w-1.5 ml-0.5 align-middle bg-gray-400 animate-pulse" />
        )}
      </p>
    </div>
  );
}
