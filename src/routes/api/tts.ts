import { createFileRoute } from "@tanstack/react-router";

/**
 * Server-only Grok Text-to-Speech proxy.
 * Key never reaches the browser — set XAI_API_KEY on Vercel.
 *
 * XAI_TTS_VOICE must be a TTS voice_id (e.g. ara, eve) or a custom TTS voice id.
 * Do NOT use Voice Agent ids (agent_…) — those are a different product and return 404.
 */

const XAI_TTS_URL = "https://api.x.ai/v1/tts";
const DEFAULT_VOICE = "ara";

type TtsBody = {
  text?: string;
  kind?: "narragansett" | "english";
};

/** Normalize env voice; reject agent_ ids (Voice Agent ≠ TTS). */
function resolveVoiceId(): { voice: string; warning?: string } {
  const raw = process.env.XAI_TTS_VOICE?.trim() || "";
  if (!raw) return { voice: DEFAULT_VOICE };
  if (/^agent_/i.test(raw)) {
    return {
      voice: DEFAULT_VOICE,
      warning:
        "XAI_TTS_VOICE looks like a Voice Agent id (agent_…). TTS needs a voice name like ara/eve or a custom TTS voice id. Using ara.",
    };
  }
  return { voice: raw };
}

async function callXaiTts(opts: {
  apiKey: string;
  text: string;
  voiceId: string;
  speed: number;
}): Promise<{ ok: true; audio: ArrayBuffer; contentType: string } | { ok: false; status: number; body: string }> {
  const upstream = await fetch(XAI_TTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      "Content-Type": "application/json",
      Accept: "audio/mpeg, audio/*, application/json",
    },
    body: JSON.stringify({
      text: opts.text,
      voice_id: opts.voiceId,
      language: "en",
      speed: opts.speed,
    }),
  });

  if (!upstream.ok) {
    const body = await upstream.text().catch(() => "");
    return { ok: false, status: upstream.status, body: body.slice(0, 500) };
  }

  const contentType = upstream.headers.get("content-type") || "audio/mpeg";
  const audio = await upstream.arrayBuffer();
  return { ok: true, audio, contentType };
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(process.env.XAI_API_KEY?.trim());
        const { voice, warning } = resolveVoiceId();
        return Response.json({
          configured,
          provider: configured ? "xai-grok-tts" : "browser-fallback",
          voice: configured ? voice : null,
          envVoiceRaw: process.env.XAI_TTS_VOICE?.trim() || null,
          warning: warning ?? null,
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
        const speed = kind === "narragansett" ? 0.78 : 0.92;
        // Plain text first — speech tags are optional polish; some voices reject them
        const spoken = text;

        const { voice, warning } = resolveVoiceId();
        let usedVoice = voice;

        try {
          let result = await callXaiTts({
            apiKey,
            text: spoken,
            voiceId: usedVoice,
            speed,
          });

          // If custom/env voice fails, fall back to built-in ara once
          if (!result.ok && usedVoice !== DEFAULT_VOICE) {
            console.error(
              "[tts] voice failed, falling back to ara",
              usedVoice,
              result.status,
              result.body,
            );
            usedVoice = DEFAULT_VOICE;
            result = await callXaiTts({
              apiKey,
              text: spoken,
              voiceId: usedVoice,
              speed,
            });
          }

          if (!result.ok) {
            console.error("[tts] xAI error", result.status, result.body);
            return Response.json(
              {
                error: "upstream_tts_failed",
                status: result.status,
                message:
                  "Grok TTS request failed. Use a TTS voice id (ara, eve, …), not a Voice Agent id (agent_…).",
                detail: result.body.slice(0, 200),
                voiceAttempted: voice,
                warning: warning ?? null,
              },
              { status: 502 },
            );
          }

          return new Response(result.audio, {
            status: 200,
            headers: {
              "Content-Type": result.contentType,
              "Cache-Control": "private, max-age=86400",
              "X-TTS-Provider": "xai-grok",
              "X-TTS-Voice": usedVoice,
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
