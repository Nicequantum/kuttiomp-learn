import { createFileRoute } from "@tanstack/react-router";
import {
  isVoiceAgentId,
  speakWithVoiceAgent,
} from "@/lib/audio/agent-speak.server";
import {
  getTtsVoiceId,
  getVoiceAgentId,
  getXaiApiKey,
} from "@/lib/audio/env.server";

/**
 * Server-only oral synthesis proxy.
 *
 * When XAI_VOICE_AGENT_ID is set (Vercel env), this route speaks ONLY
 * through that agent. It does not fall through to REST TTS or a
 * different computer voice — that was swapping speakers on deploy.
 *
 * Env (runtime, not build-time):
 *   XAI_API_KEY
 *   XAI_VOICE_AGENT_ID   agent_…
 *   XAI_TTS_VOICE        optional REST voice if no agent is set
 */

const XAI_TTS_URL = "https://api.x.ai/v1/tts";
const DEFAULT_TTS_VOICE = "ara";

type TtsBody = {
  text?: string;
  kind?: "narragansett" | "english";
};

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
        const apiKey = getXaiApiKey();
        const agentId = getVoiceAgentId();
        const ttsVoice = getTtsVoiceId();
        const configured = Boolean(apiKey);
        return Response.json({
          configured,
          provider: !configured
            ? "browser-fallback"
            : agentId
              ? "xai-voice-agent"
              : "xai-grok-tts",
          voice: configured ? (agentId ?? ttsVoice) : null,
          agentId,
          ttsVoice,
          notice: !configured
            ? "XAI_API_KEY is not set on the server."
            : agentId
              ? "Using your Voice Agent for pronunciation."
              : "Using Grok REST TTS. Set XAI_VOICE_AGENT_ID=agent_… to use your agent.",
        });
      },
      POST: async ({ request }) => {
        const apiKey = getXaiApiKey();
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
        const agentId = getVoiceAgentId();

        // Voice Agent is the only speaker when configured.
        if (agentId && isVoiceAgentId(agentId)) {
          try {
            const result = await speakWithVoiceAgent({
              apiKey,
              agentId,
              text,
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

            console.error("[tts] Voice Agent failed", result);
            return Response.json(
              {
                error: "voice_agent_failed",
                message:
                  "Your Voice Agent did not return audio. Check the agent is published and the API key can use it.",
                detail: result.error,
              },
              { status: 502 },
            );
          } catch (err) {
            console.error("[tts] Voice Agent exception", err);
            return Response.json(
              {
                error: "voice_agent_exception",
                message: "Voice Agent request failed.",
              },
              { status: 502 },
            );
          }
        }

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
                message: "Grok TTS failed. Check voice id and API key.",
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
