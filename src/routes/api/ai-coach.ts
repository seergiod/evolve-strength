import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

const SYSTEM_PROMPT = `Eres un coach de fitness personal experto y motivador. Tu nombre es IronCoach.

Conoces sobre:
- Entrenamiento de fuerza, hipertrofia, resistencia y cardio
- Nutricion deportiva y planificacion de dietas
- Tecnica de ejercicios y prevencion de lesiones
- Periodizacion del entrenamiento
- Psicologia deportiva y motivacion

REGLAS:
1. Responde SIEMPRE en espanol
2. Usa formato Markdown claro y estructurado
3. Se directo, motivador y profesional
4. Adapta consejos al objetivo del usuario si lo conoces
5. Nunca reemplaces consejo medico profesional
6. Si no tienes suficiente contexto, pregunta brevemente`;

type ChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

async function requireAuth(request: Request) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return false;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !supabaseKey) return false;

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return !error && Boolean(data.user);
}

export const Route = createFileRoute("/api/ai-coach")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          if (!(await requireAuth(request))) {
            return new Response("Unauthorized", { status: 401 });
          }

          const { messages, userContext } = (await request.json()) as {
            messages: { role: string; content: string }[];
            userContext?: { username?: string; goal?: string };
          };

          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) return new Response("AI not configured", { status: 500 });

          const model = process.env.OPENROUTER_MODEL || "openrouter/free";
          const systemWithContext = userContext?.username
            ? `${SYSTEM_PROMPT}\n\nContexto del usuario:\n- Nombre: ${userContext.username}\n- Objetivo: ${
                userContext.goal || "fitness general"
              }`
            : SYSTEM_PROMPT;

          const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:5173",
              "X-Title": "GYMBROS",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemWithContext },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
              ],
              max_tokens: 1500,
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            if (res.status === 429) {
              return new Response("Demasiadas peticiones. Espera un momento.", {
                status: 429,
              });
            }
            if (res.status === 402) {
              return new Response("Creditos de IA agotados o modelo gratuito no disponible.", { status: 402 });
            }
            return new Response(`AI error: ${txt}`, { status: 500 });
          }

          const data = (await res.json()) as ChatCompletionResponse;
          const reply =
            data.choices?.[0]?.message?.content ||
            "Lo siento, no pude generar una respuesta.";
          return Response.json({ reply });
        } catch (e) {
          return new Response(
            `Error: ${e instanceof Error ? e.message : "unknown"}`,
            { status: 500 },
          );
        }
      },
    },
  },
});
