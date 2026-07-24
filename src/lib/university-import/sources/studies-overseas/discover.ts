import { load } from "cheerio";
import { assertPageAccessible, conservativeDelay } from "../../browser";

const listingUrl = "https://www.studies-overseas.com/universities/usa";

export function discoverStudiesOverseasUrlsFromHtml(html: string, limit = 5): string[] {
  const $ = load(html);
  const urls = $("a[href]").toArray().flatMap((element) => {
    const href = $(element).attr("href");
    if (!href) return [];
    try {
      const url = new URL(href, listingUrl).toString();
      return /studies-overseas\.com\/universities\/(?!usa\/?$)[^?#]+/i.test(url) ? [url] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(urls)].slice(0, Math.min(limit, 5));
}

export async function discoverStudiesOverseasUrls(options: { limit?: number } = {}): Promise<string[]> {
  const response = await fetch(listingUrl, {
    headers: { "user-agent": "SAC University Data Pilot/1.0 (authorized, low-volume)" },
    redirect: "follow",
  });
  const html = await response.text();
  assertPageAccessible(response.status, html);
  if (!response.ok) throw new Error(`Source returned HTTP ${response.status}.`);
  await conservativeDelay();
  return discoverStudiesOverseasUrlsFromHtml(html, options.limit ?? 5);
}

