const sensitivePattern = /(authorization|cookie|token|secret|password|storage[-_ ]?state)\s*[:=]\s*[^\s,;]+/gi;

export function safeErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown import error";
  return message
    .replace(sensitivePattern, "$1=[REDACTED]")
    .replace(/([?&](?:token|key|secret|auth|session)=)[^&\s]+/gi, "$1[REDACTED]")
    .slice(0, 2000);
}

export function safeImportLog(event: string, details: Record<string, string | number | boolean | null>): void {
  const safeDetails = Object.fromEntries(
    Object.entries(details).filter(([key]) => !/cookie|authorization|token|secret|password|storage/i.test(key)),
  );
  console.log(JSON.stringify({ event, ...safeDetails }));
}

