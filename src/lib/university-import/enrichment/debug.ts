import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { load } from "cheerio";
import type { OfficialPageSnapshot } from "./types";

export function sanitizeDebugHtml(html: string): string {
  const $ = load(html);
  $("script, noscript").remove();
  $("input[type='hidden'], meta[name*='csrf' i], meta[name*='token' i]").remove();
  $("[value]").removeAttr("value");
  $("[data-token], [data-auth], [data-session]")
    .removeAttr("data-token")
    .removeAttr("data-auth")
    .removeAttr("data-session");
  return $.html().replace(/<!--[\s\S]*?-->/g, "");
}

export async function writeDebugSnapshots(
  pages: readonly OfficialPageSnapshot[],
  universitySlug: string,
): Promise<string> {
  const directory = resolve("work", "debug", "university-enrichment", universitySlug);
  await mkdir(directory, { recursive: true });
  for (const [index, page] of pages.entries()) {
    if (!page.html) continue;
    const fileName = `${String(index + 1).padStart(2, "0")}-${page.kind}.html`;
    await writeFile(resolve(directory, fileName), sanitizeDebugHtml(page.html), {
      encoding: "utf8",
      mode: 0o600,
    });
  }
  return directory;
}
