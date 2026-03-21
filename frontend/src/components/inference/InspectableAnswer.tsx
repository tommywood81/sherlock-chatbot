import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";
import type { AnswerTokenRow } from "../../types/inferenceTypes";
import { sortTopCandidatesByProb } from "../../utils/inferenceAnalytics";
import { getConfidenceTier, tierToClassName } from "../../utils/tokenConfidence";

function formatPct(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return `${Math.round(p * 1000) / 10}%`;
}

interface InspectableAnswerProps {
  answerPlain: string | null;
  tokens: AnswerTokenRow[];
  inspectMode: boolean;
  isStreaming: boolean;
}

export default function InspectableAnswer({
  answerPlain,
  tokens,
  inspectMode,
  isStreaming,
}: InspectableAnswerProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    btnRefs.current = tokens.map(() => null);
  }, [tokens]);

  useEffect(() => {
    setOpenIdx(null);
    setPopoverPos(null);
  }, [tokens, inspectMode, answerPlain]);

  const updatePopoverPosition = useCallback((el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const pad = 8;
    let left = r.left + r.width / 2;
    let top = r.bottom + pad;
    const w = 280;
    if (left + w / 2 > window.innerWidth - pad) left = window.innerWidth - w / 2 - pad;
    if (left - w / 2 < pad) left = w / 2 + pad;
    if (top + 220 > window.innerHeight) top = r.top - pad - 4;
    setPopoverPos({ top, left });
  }, []);

  const openForIndex = useCallback(
    (i: number) => {
      const el = btnRefs.current[i];
      if (!el) return;
      setOpenIdx(i);
      updatePopoverPosition(el);
    },
    [updatePopoverPosition]
  );

  useLayoutEffect(() => {
    if (openIdx == null) return;
    const el = btnRefs.current[openIdx];
    if (el) updatePopoverPosition(el);
  }, [openIdx, updatePopoverPosition, tokens]);

  useEffect(() => {
    if (openIdx == null) return;
    const onScroll = () => {
      const el = btnRefs.current[openIdx];
      if (el) updatePopoverPosition(el);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [openIdx, updatePopoverPosition]);

  useEffect(() => {
    if (openIdx == null) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (wrapRef.current?.contains(t)) return;
      const pop = document.getElementById("token-decision-popover");
      if (pop?.contains(t)) return;
      setOpenIdx(null);
      setPopoverPos(null);
    };
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenIdx(null);
        setPopoverPos(null);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [openIdx]);

  const popoverContent = useMemo(() => {
    if (openIdx == null || !tokens[openIdx]) return null;
    const row = tokens[openIdx];
    const sorted = sortTopCandidatesByProb(row.topCandidates);
    const topShow = sorted.slice(0, 5);
    return (
      <div
        id="token-decision-popover"
        className="fixed z-[100] w-[min(92vw,280px)] rounded-lg border border-gray-200 bg-white p-3 shadow-lg text-left"
        style={{
          top: popoverPos?.top ?? 0,
          left: popoverPos?.left ?? 0,
          transform: "translateX(-50%)",
        }}
        role="dialog"
        aria-label="Word choice details"
      >
        <p className="text-xs font-medium text-gray-500 mb-2">
          Chosen piece:{" "}
          <span className="text-gray-900 font-mono text-[11px] whitespace-pre-wrap break-all">
            {row.text || "∅"}
          </span>{" "}
          <span className="text-gray-600">({formatPct(row.confidence)})</span>
        </p>
        <ul className="space-y-1.5 text-sm text-gray-800 max-h-48 overflow-y-auto">
          {topShow.length === 0 ? (
            <li className="text-gray-500 text-xs">No scores returned for this step.</li>
          ) : (
            topShow.map((c, j) => {
              const isChosen = c.token === row.text;
              return (
                <li
                  key={`${j}-${c.token.slice(0, 24)}`}
                  className={`flex justify-between gap-2 font-mono text-xs ${
                    isChosen ? "text-gray-900 font-medium" : "text-gray-600"
                  }`}
                >
                  <span className="truncate" title={c.token}>
                    {isChosen ? "→ " : ""}
                    {c.token || "∅"}
                  </span>
                  <span className="shrink-0 tabular-nums">{formatPct(Number(c.prob) || 0)}</span>
                </li>
              );
            })
          )}
        </ul>
      </div>
    );
  }, [openIdx, tokens, popoverPos]);

  if (!answerPlain && !isStreaming) {
    return (
      <p className="text-gray-400 text-sm leading-relaxed">Your answer will appear here.</p>
    );
  }

  const showTokens = inspectMode && !isStreaming && tokens.length > 0;

  const onTokenKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (!inspectMode || tokens.length === 0) return;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault();
      btnRefs.current[Math.min(i + 1, tokens.length - 1)]?.focus();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault();
      btnRefs.current[Math.max(i - 1, 0)]?.focus();
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (openIdx === i) {
        setOpenIdx(null);
        setPopoverPos(null);
      } else {
        openForIndex(i);
      }
    }
  };

  return (
    <div className="space-y-3 transition-opacity duration-500" ref={wrapRef}>
      {!inspectMode && (
        <div
          className={`text-xl sm:text-2xl text-gray-900 leading-relaxed tracking-tight ${
            answerPlain ? "opacity-100" : "opacity-70"
          }`}
        >
          {isStreaming && (
            <p className="whitespace-pre-wrap font-normal">
              {answerPlain}
              <span className="inline-block w-0.5 h-6 ml-0.5 align-middle bg-gray-300 animate-pulse" />
            </p>
          )}
          {!isStreaming && <p className="whitespace-pre-wrap font-normal">{answerPlain}</p>}
        </div>
      )}

      {inspectMode && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Word choices
          </h3>
          <p className="text-xs text-gray-500">
            Tap a word to see what the model almost chose.
          </p>
          <div
            className={`text-xl sm:text-2xl text-gray-900 leading-relaxed tracking-tight ${
              showTokens ? "" : ""
            }`}
          >
            {isStreaming && (
              <p className="whitespace-pre-wrap font-normal text-gray-600">
                {answerPlain}
                <span className="inline-block w-0.5 h-6 ml-0.5 align-middle bg-gray-300 animate-pulse" />
              </p>
            )}
            {!isStreaming && showTokens && (
              <p className="whitespace-pre-wrap inline leading-relaxed font-normal">
                {tokens.map((row, i) => {
                  const tier = getConfidenceTier(row.confidence);
                  const cls = tierToClassName(tier, true);
                  return (
                    <button
                      key={`${i}-${row.text.slice(0, 20)}`}
                      type="button"
                      ref={(el) => {
                        btnRefs.current[i] = el;
                      }}
                      tabIndex={0}
                      className={`inline p-0 mx-0 align-baseline bg-transparent font-inherit text-inherit cursor-pointer rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-1 ${cls}`}
                      onClick={() => {
                        if (openIdx === i) {
                          setOpenIdx(null);
                          setPopoverPos(null);
                        } else {
                          openForIndex(i);
                        }
                      }}
                      onKeyDown={(e) => onTokenKeyDown(e, i)}
                      aria-expanded={openIdx === i}
                      aria-haspopup="dialog"
                    >
                      {row.text}
                    </button>
                  );
                })}
              </p>
            )}
            {!isStreaming && !showTokens && answerPlain && (
              <div className="space-y-2">
                <p className="whitespace-pre-wrap text-xl font-normal leading-relaxed tracking-tight text-gray-900 sm:text-2xl">
                  {answerPlain}
                </p>
                <p className="text-sm text-gray-500 leading-relaxed">
                  No per-word scores were returned for this run.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {typeof document !== "undefined" && openIdx != null && popoverPos && createPortal(popoverContent, document.body)}
    </div>
  );
}
