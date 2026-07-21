export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  const path = value.trim();

  // يمنع open redirect مثل //evil.example أو المسارات التي تحتوي backslash.
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) {
    return fallback;
  }
  if (/[\u0000-\u001f\u007f]/.test(path)) return fallback;

  return path;
}
