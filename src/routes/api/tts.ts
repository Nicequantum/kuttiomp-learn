import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-only Grok Text-to-Speech proxy.
 * Key never reaches the browser — set XAI_API_KEY on Vercel.
 *
 * This serves our people by giving a human-quality oral stand-in for demo
 * content until speaker-attributed recordings replace every entry.
 */

const XAI_TTS_URL = "https://api.x.ai/v1/tts";

type TtsBody = {
  text?: string;
  /** Optional: "narragansett" | "english" for mild delivery tuning */
  kind?: "narragansett" | "english";
};

function getVoiceId() {
  return process.env.XAI_TTS_VOICE?.trim() || "ara";
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(process.env.XAI_API_KEY?.trim());
        return Response.json({
          configured,
          provider: configured ? "xai-grok-tts" : "browser-fallback",
          voice: configured ? getVoiceId() : null,
          notice:
            "Demo pronunciation uses Grok TTS when XAI_API_KEY is set. Living speaker recordings remain the cultural authority.",
        });
      },
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY?.trim();
        if (!apiKey) {
          return Response.json(
            {
              error: "tts_not_configured",
              message:
                "XAI_API_KEY is not set. Add it in Vercel project settings.",
            },
            { status: 503 },
          );
        }

        let body: TtsBody;
        try {
          body = (await request.json()) as TtsBody;
        } catch {
          return Response.json({ error: "invalid_json" }, { status: 400 });
        }

        const text = (body.text ?? "").trim();
        if (!text || text.length > 500) {
          return Response.json(
            { error: "invalid_text", message: "text required (max 500 chars)" },
            { status: 400 },
          );
        }

        const kind = body.kind === "english" ? "english" : "narragansett";
        // Slow, careful delivery for reconstructed forms; slightly faster English.
        const speed = kind === "narragansett" ? 0.78 : 0.92;
        // Speech tags: gentle, clear — never claim native speaker authenticity.
        const spoken =
          kind === "narragansett"
            ? `<slow>${text}</slow>`
            : text;

        try {
          const upstream = await fetch(XAI_TTS_URL, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              Accept: "audio/mpeg, audio/*, application/json",
            },
            body: JSON.stringify({
              text: spoken,
              voice_id: getVoiceId(),
              language: "en",
              speed,
            }),
          });

          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            console.error(
              "[tts] xAI error",
              upstream.status,
              errText.slice(0, 400),
            );
            return Response.json(
              {
                error: "upstream_tts_failed",
                status: upstream.status,
                message:
                  "Grok TTS request failed. Check API key and voice availability.",
              },
              { status: 502 },
            );
          }

          const contentType =
            upstream.headers.get("content-type") || "audio/mpeg";
          const audio = await upstream.arrayBuffer();

          return new Response(audio, {
            status: 200,
            headers: {
              "Content-Type": contentType,
              "Cache-Control": "private, max-age=86400",
              "X-TTS-Provider": "xai-grok",
              "X-TTS-Voice": getVoiceId(),
            },
          });
        } catch (err) {
          console.error("[tts] network error", err);
          return Response.json(
            { error: "tts_network_error" },
            { status: 502 },
          );
        }
      },
    },
  },
});
