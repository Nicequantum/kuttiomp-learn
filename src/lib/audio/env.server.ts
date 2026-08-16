/**
 * Read server env at request time.
 *
 * Vite/Nitro can replace `process.env.XAI_API_KEY` with an empty string at
 * *build* time if the key is not present on the build machine. Vercel then
 * injects the real values at runtime — we must look them up by name so the
 * replacement cannot erase them.
 *
 * Never import this file from client code.
 */
function runtimeEnv(): Record<string, string | undefined> {
  const g = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  return g.process?.env ?? {};
}

export function readServerEnv(name: string): string {
  return (runtimeEnv()[name] ?? "").trim();
}

export function getXaiApiKey(): string {
  return readServerEnv("XAI_API_KEY");
}

export function getVoiceAgentId(): string | null {
  const dedicated = readServerEnv("XAI_VOICE_AGENT_ID");
  if (/^agent_/i.test(dedicated)) return dedicated;
  const asVoice = readServerEnv("XAI_TTS_VOICE");
  if (/^agent_/i.test(asVoice)) return asVoice;
  return null;
}

export function getTtsVoiceId(): string {
  const raw = readServerEnv("XAI_TTS_VOICE");
  if (!raw || /^agent_/i.test(raw)) return "ara";
  return raw;
}
