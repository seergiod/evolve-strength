import { useState, useRef, useEffect } from "react";
import { Sparkles, Loader2, Send, User, Bot, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

type Message = {
  role: "user" | "assistant";
  content: string;
};

function renderMarkdown(md: string) {
  const lines = md.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("### "))
      return <h4 key={i} className="font-display text-sm font-bold text-accent mt-3 mb-1">{line.slice(4)}</h4>;
    if (line.startsWith("## "))
      return <h3 key={i} className="font-display text-base font-bold text-gradient mt-4 mb-1">{line.slice(3)}</h3>;
    if (line.startsWith("# "))
      return <h2 key={i} className="font-display text-lg font-bold mt-4 mb-1">{line.slice(2)}</h2>;
    if (line.startsWith("- ") || line.startsWith("* "))
      return (
        <li key={i} className="ml-5 list-disc text-sm leading-relaxed">
          {boldify(line.slice(2))}
        </li>
      );
    if (line.trim() === "") return <div key={i} className="h-2" />;
    return <p key={i} className="text-sm leading-relaxed">{boldify(line)}</p>;
  });
}

function boldify(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? (
      <strong key={i} className="text-foreground font-semibold">{p.slice(2, -2)}</strong>
    ) : (
      <span key={i}>{p}</span>
    ),
  );
}

const QUICK_PROMPTS = [
  "Crea una rutina de fuerza de 4 días",
  "¿Cómo mejorar mi press de banca?",
  "Plan de nutrición para ganar músculo",
  "Rutina de cardio HIIT de 20 min",
];

export function AICoach() {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) loadHistory();
  }, [user]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("ai_chats")
      .select("role, content")
      .eq("user_id", user.id)
      .order("created_at")
      .limit(50);
    if (data) setMessages(data as Message[]);
    setLoadingHistory(false);
  };

  const clearHistory = async () => {
    if (!user) return;
    await supabase.from("ai_chats").delete().eq("user_id", user.id);
    setMessages([]);
  };

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setLoading(true);

    // Save user message
    if (user) {
      await supabase.from("ai_chats").insert({ user_id: user.id, role: "user", content: msg });
    }

    try {
      const res = await fetch("/api/ai-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.slice(-10), // last 10 messages for context
          userContext: {
            username: profile?.username,
            goal: profile?.goal,
          },
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        toast.error(txt || "Error al conectar con el coach");
        return;
      }

      const data = await res.json() as { reply: string };
      const assistantMsg: Message = { role: "assistant", content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);

      if (user) {
        await supabase.from("ai_chats").insert({ user_id: user.id, role: "assistant", content: data.reply });
      }
    } catch {
      toast.error("Error de red");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-elevated rounded-2xl flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_0_16px_-4px_oklch(0.85_0.2_175_/_0.5)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h2 className="font-display font-bold text-sm">Coach IA</h2>
            <p className="text-xs text-accent">Powered by Gemini</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clearHistory} className="text-muted-foreground hover:text-destructive transition-colors p-1">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/20">
              <Sparkles className="h-7 w-7 text-accent" />
            </div>
            <div>
              <p className="font-display font-bold">Tu coach personal de IA</p>
              <p className="text-sm text-muted-foreground mt-1">Pregunta sobre rutinas, nutrición, técnica o progreso</p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full mt-2">
              {QUICK_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-xs text-left p-2.5 rounded-xl border border-border/60 bg-background/40 hover:bg-background/70 hover:border-primary/40 transition-all text-muted-foreground hover:text-foreground"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                msg.role === "assistant" ? "bg-gradient-to-br from-primary to-accent" : "bg-muted"
              }`}>
                {msg.role === "assistant" ? (
                  <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-background/60 border border-border/40 rounded-tl-sm"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="space-y-0.5">{renderMarkdown(msg.content)}</div>
                ) : (
                  <p className="text-sm">{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent">
              <Sparkles className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="bg-background/60 border border-border/40 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-accent animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/40">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Pregunta a tu coach..."
            className="min-h-[44px] max-h-[120px] resize-none bg-input/60 border-border/60 text-sm"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
            size="icon"
            className="h-11 w-11 shrink-0 bg-gradient-to-br from-primary to-accent hover:opacity-90"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
