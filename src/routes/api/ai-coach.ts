import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const SYSTEM_PROMPT = `Eres un coach de fitness personal experto y motivador. Tu nombre es IronCoach.

Conoces sobre:
- Entrenamiento de fuerza, hipertrofia, resistencia y cardio
- Nutrición deportiva y planificación de dietas
- Técnica de ejercicios y prevención de lesiones
- Periodización del entrenamiento
- Psicología deportiva y motivación

REGLAS:
1. Responde SIEMPRE en español
2. Usa formato Markdown claro y estructurado
3. Sé directo, motivador y profesional
4. Adapta consejos al objetivo del usuario si lo conoces
5. Nunca reemplaces consejo médico profesional
6. Si no tienes suficiente contexto, pregunta brevemente`;

export const Route = createFileRoute("/api/ai-coach")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { messages, userContext } = await request.json() as {
            messages: { role: string; content: string }[];
            userContext?: { username?: string; goal?: string };
          };

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return new Response("AI not configured", { status: 500 });

          const systemWithContext = userContext?.username
            ? `${SYSTEM_PROMPT}\n\nContexto del usuario:\n- Nombre: ${userContext.username}\n- Objetivo: ${userContext.goal || "fitness general"}`
            : SYSTEM_PROMPT;

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: systemWithContext },
                ...messages.map((m) => ({ role: m.role, content: m.content })),
              ],
              max_tokens: 1500,
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            if (res.status === 429) return new Response("Demasiadas peticiones. Espera un momento.", { status: 429 });
            if (res.status === 402) return new Response("Créditos de IA agotados.", { status: 402 });
            return new Response(`AI error: ${txt}`, { status: 500 });
          }

          const data = await res.json() as { choices?: { message?: { content?: string } }[] };
          const reply = data.choices?.[0]?.message?.content ?? "Lo siento, no pude generar una respuesta.";
          return Response.json({ reply });
        } catch (e) {
          return new Response(`Error: ${e instanceof Error ? e.message : "unknown"}`, { status: 500 });
        }
      },
    },
  },
});
