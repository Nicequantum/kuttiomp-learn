/**
 * Read server env at request time.
 *
 * Vite can replace `process.env.XAI_API_KEY` with "" at build time.
 * Look up by name so Vercel runtime values survive.
 * Never import this from client code.
 */
export function readServerEnv(name: string): string {
  try {
    const read = new Function(
      "k",
      "try { return (typeof process !== 'undefined' && process.env && process.env[k]) || ''; } catch (e) { return ''; }",
    ) as (k: string) => unknown;
    return String(read(name) ?? "").trim();
  } catch {
    return "";
  }
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
