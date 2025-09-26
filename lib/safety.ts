export function filterOutput(text: string): {
  text: string;
  redactions: number;
} {
  let redactions = 0;
  let out = text;

  // Mask secret tokens first
  out = out.replace(/(sk-[a-zA-Z0-9_\-]{16,})/g, () => {
    redactions += 1;
    return "[secret]";
  });

  // Mask localhost URLs and standalone localhost
  out = out.replace(
    /(https?:\/\/)?(localhost|127\.0\.0\.1|0\.0\.0\.0)(:\d+)?/gi,
    () => {
      redactions += 1;
      return "[redacted]";
    }
  );

  // Mask key patterns - replace the entire pattern including the value
  out = out.replace(/((api[_-]?key|key)\s*[:=]\s*)([^\s]+)/gi, () => {
    redactions += 1;
    return "[redacted]: [secret]";
  });

  return { text: out, redactions };
}
