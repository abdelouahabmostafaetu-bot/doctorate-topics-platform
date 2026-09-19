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