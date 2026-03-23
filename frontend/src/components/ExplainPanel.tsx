"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { SkeletonText } from "@/components/Skeleton";

interface ExplainPanelProps {
  signalId: string;
  paragraph?: string | null;
}

/** Convert a deep_dive value to clean readable text.
 *  The backend sometimes stores/streams it as a JSON object. */
function extractDeepDiveText(raw: string): string {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      // Build a readable narrative from known keys
      const sections: string[] = [];
      if (parsed.pattern_interpretation) sections.push(parsed.pattern_interpretation);
      if (parsed.historical_context) sections.push(parsed.historical_context);
      if (parsed.corporate_events) sections.push(parsed.corporate_events);
      if (parsed.key_risks) sections.push("⚠ Key Risks: " + parsed.key_risks);
      if (parsed.disclaimer) sections.push(parsed.disclaimer);
      return sections.join("\n\n") || raw;
    }
  } catch {}
  return raw;
}

export default function ExplainPanel({ signalId, paragraph }: ExplainPanelProps) {
  const [chunks, setChunks] = useState<string[]>([]);
  const [fullText, setFullText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  const startStream = () => {
    if (esRef.current || done) return;
    setExpanded(true);
    setStreaming(true);
    setChunks([]);
    setFullText("");

    const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
    esRef.current = new EventSource(`${api}/explain/${signalId}`);

    esRef.current.onmessage = (e) => {
      const data = e.data?.trim();
      if (!data) return;
      if (data === "[DONE]") {
        setStreaming(false);
        setDone(true);
        esRef.current?.close();
        esRef.current = null;
        return;
      }
      // Accumulate and try to parse as JSON at each step
      setFullText((prev) => {
        const next = prev + " " + data;
        const cleaned = extractDeepDiveText(next.trim());
        setChunks(cleaned.split("\n\n").filter(Boolean));
        return next;
      });
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
          <div className="mt-3 space-y-3">
            {streaming && chunks.length === 0 && (
              <p className="text-sm text-slate-500 cursor">Generating deep dive analysis…</p>
            )}
            {chunks.map((section, i) => (
              <p
                key={i}
                className={`text-sm text-slate-300 leading-relaxed ${i === chunks.length - 1 && streaming ? "cursor" : ""}`}
              >
                {section}
              </p>
            ))}
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
