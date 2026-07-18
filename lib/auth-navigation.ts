export const genericLoginError = "Invalid email or password.";

const internalOrigin = "https://internal.invalid";

export function sanitizeCallbackUrl(
  callbackUrl: string | null | undefined,
  fallback = "/admin",
): string {
  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.includes("\\")
  ) {
    return fallback;
  }

  try {
    let decodedCallbackUrl = callbackUrl;
    for (let decodePass = 0; decodePass < 3; decodePass += 1) {
      const nextDecodedCallbackUrl = decodeURIComponent(decodedCallbackUrl);
      if (
        nextDecodedCallbackUrl.startsWith("//") ||
        nextDecodedCallbackUrl.includes("\\")
      ) {
        return fallback;
      }
      if (nextDecodedCallbackUrl === decodedCallbackUrl) break;
      decodedCallbackUrl = nextDecodedCallbackUrl;
    }

    const parsedUrl = new URL(callbackUrl, internalOrigin);
    if (parsedUrl.origin !== internalOrigin) return fallback;

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return fallback;
  }
}

export function mapLoginError(error: unknown): string {
  void error;
  return genericLoginError;
}
