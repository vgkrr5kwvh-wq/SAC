import { access } from "node:fs/promises";

export type BrowserImportConfig = {
  headless: boolean;
  storageStatePath: string | null;
  minDelayMs: number;
  maxDelayMs: number;
};

function boundedDelay(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 500 && parsed <= 60_000 ? parsed : fallback;
}

export function browserImportConfig(environment = process.env): BrowserImportConfig {
  const minDelayMs = boundedDelay(environment.UNIVERSITY_IMPORT_MIN_DELAY_MS, 1500);
  const maxDelayMs = boundedDelay(environment.UNIVERSITY_IMPORT_MAX_DELAY_MS, 3500);
  if (maxDelayMs < minDelayMs) throw new Error("UNIVERSITY_IMPORT_MAX_DELAY_MS must be at least the minimum delay.");
  return {
    headless: environment.UNIVERSITY_IMPORT_HEADLESS !== "false",
    storageStatePath: environment.UNIVERSITY_IMPORT_STORAGE_STATE?.trim() || null,
    minDelayMs,
    maxDelayMs,
  };
}

export async function validateStorageStatePath(path: string | null): Promise<void> {
  if (!path) return;
  await access(path);
}

export async function conservativeDelay(config = browserImportConfig()): Promise<void> {
  const duration = config.minDelayMs + Math.floor(Math.random() * (config.maxDelayMs - config.minDelayMs + 1));
  await new Promise((resolve) => setTimeout(resolve, duration));
}

export async function withChromiumPage<T>(
  operation: (page: import("playwright").Page) => Promise<T>,
): Promise<T> {
  const config = browserImportConfig();
  await validateStorageStatePath(config.storageStatePath);
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: config.headless });
  const context = await browser.newContext({
    ...(config.storageStatePath ? { storageState: config.storageStatePath } : {}),
  });
  try {
    const page = await context.newPage();
    return await operation(page);
  } finally {
    await context.close();
    await browser.close();
  }
}

export function assertPageAccessible(status: number, bodyText: string): void {
  if (status === 401 || status === 403 || status === 429) {
    throw new Error(`Source access stopped with HTTP ${status}; no bypass was attempted.`);
  }
  if (/captcha|verify you are human|access denied|unusual traffic/i.test(bodyText)) {
    throw new Error("Source access protection was detected; no bypass was attempted.");
  }
}

