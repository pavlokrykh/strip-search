import * as cheerio from "cheerio";
import { fetchText } from "./http.js";
import { fetchAndStrip, type StripOptions } from "./strip.js";

export type Result = {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  error?: string;
};

type SearchOptions = StripOptions & {
  maxResults?: number;
};

export async function searchAndStrip(query: string, options: SearchOptions = {}): Promise<Result[]> {
  const maxResults = clamp(options.maxResults ?? 3, 1, 5);
  const results = await duckDuckGo(query, maxResults, options.debug);

  for (const result of results) {
    try {
      result.content = await fetchAndStrip(result.url, options);
    } catch (err) {
      result.error = err instanceof Error ? err.message : String(err);
    }
  }

  return results;
}

export function formatResults(results: Result[]): string {
  if (!results.length) return "No results.";

  return results.map((result, i) => {
    const lines = [
      `[${i + 1}] ${result.title}`,
      `URL: ${result.url}`,
    ];

    if (result.snippet) lines.push(`Snippet: ${result.snippet}`);
    if (result.error) lines.push(`Fetch Error: ${result.error}`);
    if (result.content) lines.push(`Content: ${result.content}`);

    return lines.join("\n");
  }).join("\n\n");
}

async function duckDuckGo(query: string, maxResults: number, debug = false): Promise<Result[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  if (debug) console.error(`[search] ${url}`);

  const html = await fetchText(url);
  const $ = cheerio.load(html);
  const results: Result[] = [];
  const seen = new Set<string>();

  $(".result").each((_, el) => {
    if (results.length >= maxResults) return false;

    const link = $(el).find(".result__a").first();
    const resultUrl = cleanDuckUrl(link.attr("href") ?? "");
    if (!resultUrl || seen.has(resultUrl)) return;

    seen.add(resultUrl);
    results.push({
      title: cleanText(link.text()),
      url: resultUrl,
      snippet: cleanText($(el).find(".result__snippet").first().text()),
    });
  });

  return results;
}

function cleanDuckUrl(value: string): string | undefined {
  try {
    const url = new URL(value, "https://duckduckgo.com");
    const redirected = url.searchParams.get("uddg");
    const out = redirected ? decodeURIComponent(redirected) : url.href;
    if (out.includes("duckduckgo.com")) return undefined;
    return out;
  } catch {
    return undefined;
  }
}

function cleanText(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(n)));
}
