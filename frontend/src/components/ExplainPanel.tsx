"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SkeletonText } from "@/components/Skeleton";

interface ExplainPanelProps {
  signalId: string;
  paragraph?: string | null;
}

export default function ExplainPanel({ signalId, paragraph }: ExplainPanelProps) {
  const [deepDive, setDeepDive] = useState<string>("");
  const [streaming, setStreaming] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const startStream = () => {
    if (esRef.current) return;
    setExpanded(true);
    setStreaming(true);
    setDeepDive("");

    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    esRef.current = new EventSource(`${api}/explain/${signalId}`);

    esRef.current.onmessage = (e) => {
      if (e.data === "[DONE]") {
        setStreaming(false);
        esRef.current?.close();
        esRef.current = null;
        return;
      }
      setDeepDive((prev) => prev + e.data + " ");
    };

    esRef.current.onerror = () => {
      setStreaming(false);
      esRef.current?.close();
      esRef.current = null;
    };
  };

  useEffect(() => () => esRef.current?.close(), []);

  return (
    <div className="rounded-xl border p-5" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
      <h3 className="text-sm font-semibold text-slate-300 mb-3">AI Analysis</h3>

      {/* Paragraph */}
      {paragraph ? (
        <p className="text-sm text-slate-300 leading-relaxed">{paragraph}</p>
      ) : (
        <SkeletonText lines={3} />
      )}

      {/* Deep dive toggle */}
      <div className="mt-4 pt-4 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        <button
          onClick={expanded ? () => setExpanded(false) : startStream}
          className="flex items-center gap-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          {expanded ? "Collapse" : "Deep Dive Analysis"}
        </button>

        {expanded && (
          <div className="mt-3">
            {streaming && !deepDive && (
              <p className="text-sm text-slate-500 cursor">Generating deep dive analysis</p>
            )}
            {deepDive && (
              <p className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap ${streaming ? "cursor" : ""}`}>
                {deepDive}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-slate-600 pt-3 border-t" style={{ borderColor: "var(--border-subtle)" }}>
        This is not financial advice. Past patterns do not guarantee future results.
        Please consult a registered financial advisor before making investment decisions.
      </p>
    </div>
  );
}
