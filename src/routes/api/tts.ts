import { createFileRoute } from "@tanstack/react-router";
import {
  isVoiceAgentId,
  speakWithVoiceAgent,
} from "@/lib/audio/agent-speak.server";

/**
 * Server-only oral synthesis proxy.
 *
 * Paths:
 * 1) Voice Agent (agent_…) via realtime WebSocket + force_message
 * 2) Grok REST TTS (ara, eve, custom TTS voice ids)
 *
 * Env:
 *   XAI_API_KEY              required
 *   XAI_VOICE_AGENT_ID       optional — e.g. agent_K9qbsc619Vbg0nvm
 *   XAI_TTS_VOICE            optional — TTS voice, OR agent_ id (we detect)
 */

const XAI_TTS_URL = "https://api.x.ai/v1/tts";
const DEFAULT_TTS_VOICE = "ara";

type TtsBody = {
  text?: string;
  kind?: "narragansett" | "english";
};

function getAgentId(): string | null {
  const fromDedicated = process.env.XAI_VOICE_AGENT_ID?.trim();
  if (isVoiceAgentId(fromDedicated)) return fromDedicated!;
  const fromVoice = process.env.XAI_TTS_VOICE?.trim();
  if (isVoiceAgentId(fromVoice)) return fromVoice!;
  return null;
}

function getTtsVoiceId(): string {
  const raw = process.env.XAI_TTS_VOICE?.trim() || "";
  if (!raw || isVoiceAgentId(raw)) return DEFAULT_TTS_VOICE;
  return raw;
}

async function callXaiRestTts(opts: {
  apiKey: string;
  text: string;
  voiceId: string;
  speed: number;
}): Promise<
  | { ok: true; audio: ArrayBuffer; contentType: string }
  | { ok: false; status: number; body: string }
> {
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

  return {
    ok: true,
    audio: await upstream.arrayBuffer(),
    contentType: upstream.headers.get("content-type") || "audio/mpeg",
  };
}

export const Route = createFileRoute("/api/tts")({
  server: {
    handlers: {
      GET: async () => {
        const configured = Boolean(process.env.XAI_API_KEY?.trim());
        const agentId = getAgentId();
        const ttsVoice = getTtsVoiceId();
        return Response.json({
          configured,
          provider: !configured
            ? "browser-fallback"
            : agentId
              ? "xai-voice-agent"
              : "xai-grok-tts",
          voice: configured ? (agentId ?? ttsVoice) : null,
          agentId: agentId,
          ttsVoice: ttsVoice,
          notice: agentId
            ? "Using your Voice Agent (realtime) for pronunciation."
            : "Using Grok REST TTS. Set XAI_VOICE_AGENT_ID=agent_… to use your agent.",
        });
      },
      POST: async ({ request }) => {
        const apiKey = process.env.XAI_API_KEY?.trim();
        if (!apiKey) {
          return Response.json(
            {
              error: "tts_not_configured",
              message: "XAI_API_KEY is not set.",
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
        const agentId = getAgentId();

        // —— Path 1: Voice Agent (your agent_ id) ——
        if (agentId) {
          try {
            const spoken =
              kind === "narragansett"
                ? text // exact form, slow handled by session speed
                : text;

            const result = await speakWithVoiceAgent({
              apiKey,
              agentId,
              text: spoken,
              timeoutMs: 28_000,
            });

            if (result.ok) {
              return new Response(new Uint8Array(result.wav), {
                status: 200,
                headers: {
                  "Content-Type": "audio/wav",
                  "Cache-Control": "private, max-age=86400",
                  "X-TTS-Provider": "xai-voice-agent",
                  "X-TTS-Voice": agentId,
                },
              });
            }

            console.error("[tts] agent failed, trying REST TTS", result);
            // fall through to REST TTS
          } catch (err) {
            console.error("[tts] agent exception", err);
          }
        }

        // —— Path 2: REST TTS (ara / eve / custom TTS voice) ——
        const voiceId = getTtsVoiceId();
        try {
          let result = await callXaiRestTts({
            apiKey,
            text,
            voiceId,
            speed,
          });

          if (!result.ok && voiceId !== DEFAULT_TTS_VOICE) {
            result = await callXaiRestTts({
              apiKey,
              text,
              voiceId: DEFAULT_TTS_VOICE,
              speed,
            });
          }

          if (!result.ok) {
            return Response.json(
              {
                error: "upstream_tts_failed",
                status: result.status,
                message:
                  agentId
                    ? "Voice Agent and REST TTS both failed. Check API key and agent status."
                    : "Grok TTS failed. Check voice id and API key.",
                detail: result.body.slice(0, 200),
              },
              { status: 502 },
            );
          }

          return new Response(result.audio, {
            status: 200,
            headers: {
              "Content-Type": result.contentType,
              "Cache-Control": "private, max-age=86400",
              "X-TTS-Provider": "xai-grok-tts",
              "X-TTS-Voice": voiceId,
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
