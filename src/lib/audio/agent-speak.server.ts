/**
 * Speak exact text through an xAI Voice Agent (realtime WebSocket).
 *
 * Docs: wss://api.x.ai/v1/realtime?model=grok-voice-latest
 * Saved builder agents: pass agent_id. force_message = hardcoded TTS,
 * no model improvisation (needed for Narragansett forms).
 *
 * Env: XAI_API_KEY + XAI_VOICE_AGENT_ID
 */

import WebSocket from "ws";

const SAMPLE_RATE = 24000;
const MODEL = "grok-voice-latest";

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
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
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

function audioFromEvent(event: {
  type?: string;
  delta?: unknown;
  audio?: unknown;
}): Buffer | null {
  const raw = event.delta ?? event.audio;
  if (typeof raw === "string" && raw.length > 0) {
    return Buffer.from(raw, "base64");
  }
  return null;
}

export function speakWithVoiceAgent(opts: {
  apiKey: string;
  agentId: string;
  text: string;
  timeoutMs?: number;
}): Promise<AgentSpeakResult> {
  const { apiKey, agentId, text } = opts;
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const url =
    `wss://api.x.ai/v1/realtime?model=${encodeURIComponent(MODEL)}` +
    `&agent_id=${encodeURIComponent(agentId)}`;

  return new Promise((resolve) => {
    let settled = false;
    const chunks: Buffer[] = [];
    let sentForce = false;

    const finish = (result: AgentSpeakResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      clearTimeout(forceFallback);
      try {
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close();
        }
      } catch {
        /* ignore */
      }
      resolve(result);
    };

    const timer = setTimeout(() => {
      if (chunks.length) {
        finish({ ok: true, wav: pcm16ToWav(Buffer.concat(chunks)), agentId });
      } else {
        finish({
          ok: false,
          error: "agent_timeout",
          detail: "Voice Agent did not finish audio in time",
        });
      }
    }, timeoutMs);

    const sendForce = () => {
      if (sentForce || settled) return;
      sentForce = true;
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
    };

    let ws: WebSocket;
    let forceFallback: ReturnType<typeof setTimeout>;
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

    forceFallback = setTimeout(sendForce, 2500);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          type: "session.update",
          session: {
            instructions:
              "Pronunciation only. Do not greet. Do not add words. Speak only the force_message text, then stop.",
            turn_detection: null,
            audio: {
              output: {
                format: { type: "audio/pcm", rate: SAMPLE_RATE },
                transport: "json",
                speed: 0.88,
              },
            },
          },
        }),
      );
    });

    ws.on("message", (raw) => {
      let textPayload: string | null = null;
      if (Buffer.isBuffer(raw)) {
        if (raw.length > 8 && raw[0] !== 0x7b) {
          chunks.push(raw);
          return;
        }
        textPayload = raw.toString("utf8");
      } else if (raw instanceof ArrayBuffer) {
        const buf = Buffer.from(raw);
        if (buf.length > 8 && buf[0] !== 0x7b) {
          chunks.push(buf);
          return;
        }
        textPayload = buf.toString("utf8");
      } else {
        textPayload = String(raw);
      }

      let event: {
        type?: string;
        delta?: unknown;
        audio?: unknown;
        error?: { message?: string };
      };
      try {
        event = JSON.parse(textPayload) as typeof event;
      } catch {
        return;
      }

      if (event.type === "session.updated" || event.type === "session.created") {
        sendForce();
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

      if (
        event.type === "response.output_audio.delta" ||
        event.type === "response.audio.delta"
      ) {
        const piece = audioFromEvent(event);
        if (piece) chunks.push(piece);
        return;
      }

      if (
        event.type === "response.done" ||
        event.type === "response.output_audio.done"
      ) {
        if (chunks.length === 0) {
          finish({
            ok: false,
            error: "agent_no_audio",
            detail: "Agent completed without audio — check the agent has a voice",
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

export function isVoiceAgentId(id: string | undefined | null): boolean {
  return Boolean(id && /^agent_/i.test(id.trim()));
}
