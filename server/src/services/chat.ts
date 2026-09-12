/** FuelIQ Coach chat — rule-based, data-driven responses. */
import { answerCoachQuestion } from './coachEngine.js';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export type StreamChunk =
  | { type: 'delta'; text: string }
  | { type: 'done'; reply: string };

/** Non-streaming chat (POST /api/ai/chat). */
export function chat(
  messages: ChatMessage[],
  userId: string,
): { reply: string } {
  const last = [...messages].reverse().find((m) => m.role === 'user');
  const reply = last ? answerCoachQuestion(userId, last.content) : 'Ask me a question about your nutrition or training.';
  return { reply };
}

/** Async generator: simulated streaming for a smoother UI. */
export async function* streamChat(
  messages: ChatMessage[],
  userId: string,
): AsyncGenerator<StreamChunk> {
  const { reply } = chat(messages, userId);
  for (const piece of chunkText(reply, 28)) {
    yield { type: 'delta', text: piece };
    await sleep(12);
  }
  yield { type: 'done', reply };
}

function chunkText(text: string, size: number): string[] {
  const out: string[] = [];
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size));
  return out.length ? out : [text];
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
