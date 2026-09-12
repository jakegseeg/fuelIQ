import type { ChatMessage } from './api';

const KEY = 'fueliq.coach.messages';

export function loadChatMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (m) =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0,
    );
  } catch {
    return [];
  }
}

export function saveChatMessages(messages: ChatMessage[]): void {
  localStorage.setItem(KEY, JSON.stringify(messages.slice(-100)));
}

export function clearChatMessages(): void {
  localStorage.removeItem(KEY);
}
