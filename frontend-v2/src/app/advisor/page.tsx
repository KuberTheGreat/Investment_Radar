"use client";

import { useState, useRef, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Bot, User, Trash2, Sparkles } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { radarApi } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  isStreaming?: boolean;
  linkedSymbol?: string;
}

const SUGGESTED_QUESTIONS = [
  "Why is TATAMOTORS moving today?",
  "Is the banking sector bullish?",
  "Explain the Morning Star pattern",
  "What is a confluence score?",
  "Should I hold RELIANCE?",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          animate={{ y: [0, -4, 0] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          className="w-1.5 h-1.5 rounded-full bg-muted inline-block"
        />
      ))}
    </div>
  );
}

function AdvisorChat() {
  const searchParams = useSearchParams();
  const initialSymbol = searchParams.get("symbol");
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<EventSource | null>(null);
  const hasAutoTriggered = useRef(false);

  const { data: signalsData } = useQuery({
    queryKey: ['signals'],
    queryFn: () => radarApi.getSignals(),
  });
  
  const signals = signalsData?.data || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    // Return early if we already triggered, no symbol requested, or signals not loaded
    if (hasAutoTriggered.current || !initialSymbol || signals.length === 0) return;
    
    const targetSignal = signals.find(s => s.symbol === initialSymbol);
    if (targetSignal) {
      hasAutoTriggered.current = true;
      
      // Add the user request first
      const msgId = Date.now().toString();
      setMessages([{
        id: msgId,
        role: "user",
        content: `Explain the current signal for ${initialSymbol}`
      }]);
      
      // Then trigger the explanation
      triggerExplanation(targetSignal.id, initialSymbol);
    }
  }, [initialSymbol, signals]);

  useEffect(() => {
    // Cleanup any active streams unmounting
    return () => {
      if (streamRef.current) {
        streamRef.current.close();
      }
    };
  }, []);

  const triggerExplanation = (signalId: string, linkedSymbol?: string) => {
    setIsThinking(true);
    
    // Close any existing stream
    if (streamRef.current) {
      streamRef.current.close();
    }

    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: "ai",
      content: "",
      isStreaming: true,
      linkedSymbol
    }]);

    setIsThinking(false);

    // Initialize EventSource pointing to our FastAPI backend
    const sse = new EventSource(`/api/explain/${signalId}`);
    streamRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.event === "done" || payload.event === "error") {
          sse.close();
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
          ));
          return;
        }

        if (payload.chunk) {
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, content: m.content + payload.chunk } : m
          ));
        }
      } catch (e) {
        // raw string fallback for basic chunks
        if (event.data === "[DONE]") {
          sse.close();
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
          ));
        } else {
          setMessages(prev => prev.map(m => 
            m.id === aiMsgId ? { ...m, content: m.content + event.data.replace(/\\n/g, '\n') } : m
          ));
        }
      }
    };

    sse.onerror = () => {
      sse.close();
      setMessages(prev => prev.map(m => 
        m.id === aiMsgId ? { ...m, isStreaming: false } : m
      ));
    };
  };

  const triggerChat = async (history: Message[]) => {
    setIsThinking(true);
    const aiMsgId = (Date.now() + 1).toString();
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: "ai",
      content: "",
      isStreaming: true
    }]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map(m => ({ 
            role: m.role === "ai" ? "assistant" : m.role, 
            content: m.content 
          }))
        })
      });

      setIsThinking(false);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status} ${response.statusText}`);
      }
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          setMessages(prev => prev.map(m =>
            m.id === aiMsgId ? { ...m, isStreaming: false } : m
          ));
          break;
        }
        
        const chunk = decoder.decode(value);
        setMessages(prev => prev.map(m =>
          m.id === aiMsgId ? { ...m, content: m.content + chunk } : m
        ));
      }
    } catch (e) {
      setIsThinking(false);
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId ? { ...m, isStreaming: false, content: "Sorry, I'm having trouble connecting to the advisory service." } : m
      ));
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isThinking) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    
    const lowerText = text.toLowerCase();
    
    // Attempt to parse out a symbol if they ask a generic query like "Why is TATAMOTORS moving"
    const matchedSignal = signals.find(s => lowerText.includes(s.symbol.toLowerCase()));
    
    if (matchedSignal) {
      triggerExplanation(matchedSignal.id, matchedSignal.symbol);
    } else {
      triggerChat([...messages, userMsg]);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-border-subtle bg-background z-10 sticky top-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent to-accent-2 flex items-center justify-center">
            <Bot className="w-4.5 h-4.5 text-background" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-foreground">AI Advisor</h1>
            <p className="text-[11px] text-bullish font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-bullish inline-block" /> Online · Llama 3.3-70B
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="p-2 rounded-full hover:bg-surface-3 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-muted" />
          </button>
        )}
      </div>

      {/* Conversation area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
        {/* Suggested questions – only when chat is empty */}
        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-4"
            >
              <div className="text-center pt-8">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent/20 to-accent-2/20 flex items-center justify-center mx-auto mb-3">
                  <Sparkles className="w-7 h-7 text-accent" />
                </div>
                <h2 className="text-base font-bold text-foreground mb-1">Ask me anything</h2>
                <p className="text-xs text-muted max-w-xs mx-auto">
                  I have context on today&apos;s signals, live prices, corporate events, and market trends.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTED_QUESTIONS.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="px-3.5 py-2 rounded-xl border border-border-subtle bg-surface-2 text-xs text-muted
                               hover:bg-surface-3 hover:text-foreground hover:border-accent/40 transition-all"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Messages */}
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              {/* Avatar */}
              <div className={cn(
                "w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-1",
                msg.role === "user" ? "bg-accent text-background" : "bg-surface-3 text-accent"
              )}>
                {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              {/* Bubble */}
              <div className={cn(
                "max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-accent text-background rounded-tr-sm"
                  : "bg-surface-2 text-foreground border border-border-subtle rounded-tl-sm"
              )}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.linkedSymbol && (
                  <button className="mt-2 text-xs text-accent underline underline-offset-2">
                    View {msg.linkedSymbol} Analysis →
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Thinking indicator */}
        <AnimatePresence>
          {isThinking && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-surface-3 flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-accent" />
              </div>
              <div className="bg-surface-2 border border-border-subtle rounded-2xl rounded-tl-sm px-4 py-3">
                <TypingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="sticky bottom-20 md:bottom-4 px-4 pb-2 bg-background">
        <div className="flex items-center gap-3 p-2 rounded-2xl border border-border bg-surface-2">
          <input
            type="text"
            placeholder="Ask about any stock or signal..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none px-2"
          />
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isThinking}
            className={cn(
              "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
              input.trim() && !isThinking ? "bg-accent text-background" : "bg-surface-3 text-muted"
            )}
          >
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </div>
  );
}

export default function AdvisorPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <span className="text-3xl mb-3">🤖</span>
          <p className="text-sm font-medium">Loading Advisor...</p>
        </div>
      </div>
    }>
      <AdvisorChat />
    </Suspense>
  );
}
