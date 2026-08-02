/**
 * Speak text through an xAI Voice Agent (realtime WebSocket).
 * Uses force_message so the agent voice speaks exactly our text (no free chat).
 *
 * Env: XAI_API_KEY + agent id (XAI_VOICE_AGENT_ID or XAI_TTS_VOICE=agent_…)
 */

import WebSocket from "ws";

const SAMPLE_RATE = 24000;

function pcm16ToWav(pcm: Buffer, sampleRate = SAMPLE_RATE): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcm.length;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36);
  header.writeUInt32LE(dataSize, 40);
  return Buffer.concat([header, pcm]);
}

export type AgentSpeakResult =
  | { ok: true; wav: Buffer; agentId: string }
  | { ok: false; error: string; detail?: string };

/**
 * Connect to Voice Agent, force-speak `text`, collect PCM, return WAV.
 */
export function speakWithVoiceAgent(opts: {
  apiKey: string;
  agentId: string;
  text: string;
  timeoutMs?: number;
}): Promise<AgentSpeakResult> {
  const { apiKey, agentId, text } = opts;
  const timeoutMs = opts.timeoutMs ?? 25_000;
  const url = `wss://api.x.ai/v1/realtime?agent_id=${encodeURIComponent(agentId)}`;

  return new Promise((resolve) => {
    let settled = false;
    const chunks: Buffer[] = [];
    let sawAudio = false;

    const finish = (result: AgentSpeakResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (sawAudio && chunks.length) {
        finish({
          ok: true,
          wav: pcm16ToWav(Buffer.concat(chunks)),
          agentId,
        });
      } else {
        finish({
          ok: false,
          error: "agent_timeout",
          detail: "Voice Agent did not finish audio in time",
        });
      }
    }, timeoutMs);

    let ws: WebSocket;
    try {
      ws = new WebSocket(url, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
    } catch (e) {
      finish({
        ok: false,
        error: "agent_connect_failed",
        detail: e instanceof Error ? e.message : String(e),
      });
      return;
    }

    ws.on("open", () => {
      // Prefer PCM @ 24kHz JSON transport (base64 deltas)
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            audio: {
              output: {
                format: { type: "audio/pcm", rate: SAMPLE_RATE },
                transport: "json",
                speed: 0.85,
              },
            },
          },
        }),
      );

      // Speak exact text with the agent’s configured voice (no model improvisation)
      ws.send(
        JSON.stringify({
          type: "conversation.item.create",
          item: {
            type: "force_message",
            role: "assistant",
            interruptible: false,
            content: [{ type: "output_text", text }],
          },
        }),
      );
    });

    ws.on("message", (raw) => {
      let event: {
        type?: string;
        delta?: string;
        error?: { message?: string };
      };
      try {
        event = JSON.parse(raw.toString()) as typeof event;
      } catch {
        return;
      }

      if (event.type === "error" || event.type === "response.failed") {
        finish({
          ok: false,
          error: "agent_error",
          detail: event.error?.message || event.type,
        });
        return;
      }

      // Audio chunk (docs: response.output_audio.delta; some stacks use response.audio.delta)
      if (
        (event.type === "response.output_audio.delta" ||
          event.type === "response.audio.delta") &&
        typeof event.delta === "string"
      ) {
        sawAudio = true;
        chunks.push(Buffer.from(event.delta, "base64"));
        return;
      }

      if (event.type === "response.done" || event.type === "response.output_audio.done") {
        if (chunks.length === 0) {
          finish({
            ok: false,
            error: "agent_no_audio",
            detail: "Agent completed without audio — check agent voice config",
          });
          return;
        }
        finish({
          ok: true,
          wav: pcm16ToWav(Buffer.concat(chunks)),
          agentId,
        });
      }
    });

    ws.on("error", (err) => {
      finish({
        ok: false,
        error: "agent_ws_error",
        detail: err.message,
      });
    });

    ws.on("close", () => {
      if (settled) return;
      if (chunks.length) {
        finish({
          ok: true,
          wav: pcm16ToWav(Buffer.concat(chunks)),
          agentId,
        });
      } else {
        finish({
          ok: false,
          error: "agent_closed",
          detail: "WebSocket closed before audio arrived",
        });
      }
    });
  });
}

/** True if string is an xAI Voice Agent id */
export function isVoiceAgentId(id: string | undefined | null): boolean {
  return Boolean(id && /^agent_/i.test(id.trim()));
}
