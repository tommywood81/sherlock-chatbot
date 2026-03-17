export interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatWindowProps {
  messages: Message[];
  isStreaming?: boolean;
}

export default function ChatWindow({ messages, isStreaming }: ChatWindowProps) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50/50 p-4 min-h-[200px]">
      {messages.length === 0 ? (
        <p className="text-gray-500 text-sm">Send a prompt to start.</p>
      ) : (
        messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-lg bg-gray-200 px-4 py-2 text-gray-900"
                : "self-start max-w-[85%] rounded-lg border border-gray-200 bg-white px-4 py-2 text-gray-800"
            }
          >
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              {m.role === "user" ? "You" : "Model"}
            </span>
            <p className="mt-1 whitespace-pre-wrap break-words">{m.content}</p>
          </div>
        ))
      )}
      {isStreaming && (
        <span className="inline-block h-4 w-2 animate-pulse bg-gray-400 rounded" />
      )}
    </div>
  );
}
