import * as cheerio from "cheerio";
import { htmlToText } from "html-to-text";

export type Result = {
  title: string;
  url: string;
  snippet: string;
  content?: string;
  error?: string;
};

type Options = {
  maxResults?: number;
  maxChars?: number | null;
  debug?: boolean;
};

const userAgent = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

export async function searchAndStrip(query: string, options: Options = {}): Promise<Result[]> {
  const maxResults = clamp(options.maxResults ?? 3, 1, 5);
  const maxChars = options.maxChars === undefined ? 3000 : options.maxChars;
  const results = await duckDuckGo(query, maxResults, options.debug);

  for (const result of results) {
    try {
      if (options.debug) console.error(`[fetch] ${result.url}`);
      const html = await fetchText(result.url);
      const content = stripHtml(html);
      result.content = maxChars === null ? content : content.slice(0, maxChars);
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

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "user-agent": userAgent,
      "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "accept-language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

export function stripHtml(html: string): string {
  const $ = cheerio.load(html);

  $("script, style, noscript, nav, footer, header, svg, canvas, iframe, form").remove();
  $("[aria-hidden='true'], [hidden]").remove();

  const body = $("body").length ? $("body").html() ?? "" : $.root().html() ?? "";

  return cleanText(htmlToText(body, {
    wordwrap: false,
    preserveNewlines: true,
    selectors: [
      { selector: "a", options: { ignoreHref: true } },
      { selector: "img", format: "skip" },
      { selector: "table", options: { maxColumnWidth: 60 } },
    ],
  }));
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
