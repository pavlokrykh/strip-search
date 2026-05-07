import * as cheerio from "cheerio";
import { htmlToText } from "html-to-text";
import { fetchText } from "./http.js";

export type StripOptions = {
  maxChars?: number | null;
  debug?: boolean;
};

export async function fetchAndStrip(url: string, options: StripOptions = {}): Promise<string> {
  const maxChars = options.maxChars === undefined ? 3000 : options.maxChars;
  if (options.debug) console.error(`[fetch] ${url}`);

  const html = await fetchText(url);
  const content = stripHtml(html);
  return maxChars === null ? content : content.slice(0, maxChars);
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

function cleanText(value: string): string {
  return value
    .replace(/\r/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
