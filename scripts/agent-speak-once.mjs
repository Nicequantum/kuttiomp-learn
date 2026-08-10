#!/usr/bin/env node
/**
 * One-shot Voice Agent speak → WAV/MP3 file.
 * Usage: node scripts/agent-speak-once.mjs "text" /path/out.mp3
 * Requires XAI_API_KEY + XAI_VOICE_AGENT_ID
 */
import WebSocket from "ws";
import { writeFileSync, unlinkSync } from "fs";
import { spawnSync } from "child_process";

const text = process.argv[2];
const out = process.argv[3];
const apiKey = process.env.XAI_API_KEY?.trim();
const agentId = process.env.XAI_VOICE_AGENT_ID?.trim();
if (!text || !out || !apiKey || !agentId) {
  console.error("usage/env missing");
  process.exit(2);
}

const SAMPLE_RATE = 24000;
const url = `wss://api.x.ai/v1/realtime?agent_id=${encodeURIComponent(agentId)}`;

function pcm16ToWav(pcm) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const chunks = [];
let saw = false;
const ws = new WebSocket(url, { headers: { Authorization: `Bearer ${apiKey}` } });
const timer = setTimeout(() => {
  finish(saw && chunks.length ? 0 : 1);
}, 28000);

function finish(code) {
  clearTimeout(timer);
  try { ws.close(); } catch {}
  if (code !== 0) process.exit(code);
  const wav = pcm16ToWav(Buffer.concat(chunks));
  const wavPath = out.endsWith(".wav") ? out : out + ".wav.tmp";
  writeFileSync(wavPath, wav);
  if (out.endsWith(".mp3")) {
    const r = spawnSync("ffmpeg", ["-y", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "128k", out], { stdio: "ignore" });
    try { unlinkSync(wavPath); } catch {}
    process.exit(r.status === 0 ? 0 : 1);
  }
  process.exit(0);
}

ws.on("open", () => {
  ws.send(JSON.stringify({
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
  }));
  // Match agent-speak.server.ts: force_message speaks exact text (no free chat)
  ws.send(JSON.stringify({
    type: "conversation.item.create",
    item: {
      type: "force_message",
      role: "assistant",
      interruptible: false,
      content: [{ type: "output_text", text }],
    },
  }));
});

ws.on("message", (data) => {
  try {
    const msg = JSON.parse(data.toString());
    if (msg.type === "response.output_audio.delta" || msg.type === "response.audio.delta") {
      const b64 = msg.delta || msg.audio;
      if (b64) {
        chunks.push(Buffer.from(b64, "base64"));
        saw = true;
      }
    }
    if (msg.type === "response.done" || msg.type === "response.output_audio.done") {
      finish(saw ? 0 : 1);
    }
  } catch {}
});
ws.on("error", (e) => {
  console.error(e);
  finish(1);
});
