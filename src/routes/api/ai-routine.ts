import { createFileRoute } from "@tanstack/react-router";
import "@tanstack/react-start";

const SYSTEM_PROMPT = `Eres un entrenador personal experto. Genera rutinas de gimnasio claras, estructuradas y seguras.
Responde SIEMPRE en español, en formato Markdown.
Estructura: introducción breve, días de entrenamiento (Día 1, Día 2, ...) con ejercicios, series y repeticiones, y consejos finales.
Sé conciso pero útil.`;

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

          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey)
            return new Response("AI not configured", { status: 500 });

          const userPrompt = `Crea una rutina de gimnasio para el siguiente objetivo: "${goal}".
Nivel del usuario: ${level ?? "intermedio"}.
Días por semana: ${days ?? 4}.
Incluye calentamiento, ejercicios principales con series x reps, descansos y consejos.`;

          const res = await fetch(
            "https://ai.gateway.lovable.dev/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: "google/gemini-2.5-flash",
                messages: [
                  { role: "system", content: SYSTEM_PROMPT },
                  { role: "user", content: userPrompt },
                ],
              }),
            },
          );

          if (!res.ok) {
            const txt = await res.text();
            if (res.status === 429)
              return new Response(
                "Demasiadas peticiones. Inténtalo en un momento.",
                { status: 429 },
              );
            if (res.status === 402)
              return new Response(
                "Créditos de IA agotados. Añade créditos en Settings.",
                { status: 402 },
              );
            return new Response(`AI error: ${txt}`, { status: 500 });
          }

          const data = (await res.json()) as {
            choices?: { message?: { content?: string } }[];
          };
          const content = data.choices?.[0]?.message?.content ?? "";
          return Response.json({ routine: content });
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
