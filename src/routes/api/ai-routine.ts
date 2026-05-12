import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";


const SYSTEM_PROMPT = `Eres un entrenador personal experto. Genera rutinas de gimnasio claras, estructuradas y seguras.
Responde SIEMPRE en espanol, en formato Markdown.
Estructura: introduccion breve, dias de entrenamiento (Dia 1, Dia 2, ...) con ejercicios, series y repeticiones, y consejos finales.
Se conciso pero util.`;

type ChatCompletionResponse = {
  choices?: {
    message?: {
      content?: string;
    };
  }[];
};

export const Route = createFileRoute("/api/ai-routine")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        try {
          const { goal, level, days } = (await request.json()) as {
            goal?: string;
            level?: string;
            days?: number;
          };
          if (!goal) return new Response("Goal required", { status: 400 });

          const apiKey = process.env.OPENROUTER_API_KEY;
          if (!apiKey) return new Response("AI not configured", { status: 500 });

          const model = process.env.OPENROUTER_MODEL || "openrouter/free";
          const userPrompt = `Crea una rutina de gimnasio para el siguiente objetivo: "${goal}".
Nivel del usuario: ${level ?? "intermedio"}.
Dias por semana: ${days ?? 4}.
Incluye calentamiento, ejercicios principales con series x reps, descansos y consejos.`;

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
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
              ],
              max_tokens: 1600,
            }),
          });

          if (!res.ok) {
            const txt = await res.text();
            if (res.status === 429) {
              return new Response(
                "Demasiadas peticiones. Intentalo en un momento.",
                { status: 429 },
              );
            }
            if (res.status === 402) {
              return new Response(
                "Creditos de IA agotados o modelo gratuito no disponible.",
                { status: 402 },
              );
            }
            return new Response(`AI error: ${txt}`, { status: 500 });
          }

          const data = (await res.json()) as ChatCompletionResponse;
          return new Response(
            JSON.stringify({
              routine: data.choices?.[0]?.message?.content ?? "",
            }),
            { headers: { "Content-Type": "application/json" } },
          );
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
