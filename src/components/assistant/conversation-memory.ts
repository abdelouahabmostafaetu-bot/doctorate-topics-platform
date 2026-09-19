export type ConversationMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * Keep older turns available without sending the whole local transcript on
 * every request. The latest turns are sent as normal model messages; this
 * compact block carries continuity for longer conversations.
 */
export function buildConversationMemory(
  messages: ConversationMessage[],
  maxChars = 6000,
) {
  const older = messages.slice(0, -12);
  if (!older.length) return "";

  const lines = older.map((message) => {
    const speaker = message.role === "user" ? "المستخدم" : "Mathora";
    const content = message.content.replace(/\s+/g, " ").trim().slice(0, 900);
    return `${speaker}: ${content}`;
  });

  return lines.join("\n").slice(-maxChars);
}

export async function recoverAssistantStream(
  streamId: string,
  onText?: (text: string) => void,
) {
  let latest = "";
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`/api/assistant/stream/${streamId}`, {
      cache: "no-store",
    }).catch(() => null);
    if (response?.ok) {
      const snapshot = (await response.json().catch(() => null)) as
        | { text?: unknown; done?: boolean; error?: unknown }
        | null;
      const text = typeof snapshot?.text === "string" ? snapshot.text : "";
      if (text.length >= latest.length) {
        latest = text;
        onText?.(latest);
      }
      if (snapshot?.done) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 650));
  }
  return latest;
}