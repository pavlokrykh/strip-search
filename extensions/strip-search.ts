// pi extension. search DuckDuckGo, fetch pages, strip HTML, return compact text.

import { Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { formatResults, searchAndStrip, type Result } from "../src/search.js";
import { fetchAndStrip } from "../src/strip.js";

const searchParams = Type.Object({
  query: Type.String({ description: "Search query" }),
  max_results: Type.Optional(Type.Number({ description: "Number of results, default 3", minimum: 1, maximum: 5 })),
});

const fetchParams = Type.Object({
  url: Type.String({ description: "URL to fetch and strip" }),
  max_chars: Type.Optional(Type.Number({ description: "Maximum returned characters, default 3000" })),
});

type SearchDetails = {
  query: string;
  maxResults: number;
  results: Result[];
};

type FetchDetails = {
  url: string;
  content?: string;
  error?: string;
};

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "search_strip",
    label: "Search Strip",
    description: "Search DuckDuckGo, fetch result pages, strip HTML, and return compact text.",
    promptSnippet: "Search the web and return compact stripped page text",
    promptGuidelines: [
      "Use search_strip when you need current web results. It strips result pages and returns compact text for context.",
    ],
    parameters: searchParams,
    async execute(_id, params, _signal, onUpdate) {
      return runSearch(params.query as string, (params.max_results as number | undefined) ?? 3, false, onUpdate);
    },
    renderCall(args, theme) {
      return searchCallText("search_strip", args.query, args.max_results, theme);
    },
    renderResult: renderSearchResult,
  });

  pi.registerTool({
    name: "search_strip_full",
    label: "Search Strip Full",
    description: "Search DuckDuckGo, fetch result pages, strip HTML, and return the full stripped text for each page.",
    promptSnippet: "Search the web and return full stripped page text",
    promptGuidelines: [
      "Use search_strip_full only when search_strip is too short or the full fetched pages are needed. It can return a lot of text.",
    ],
    parameters: searchParams,
    async execute(_id, params, _signal, onUpdate) {
      return runSearch(params.query as string, (params.max_results as number | undefined) ?? 3, true, onUpdate);
    },
    renderCall(args, theme) {
      return searchCallText("search_strip_full", args.query, args.max_results, theme);
    },
    renderResult: renderSearchResult,
  });

  pi.registerTool({
    name: "strip_fetch",
    label: "Strip Fetch",
    description: "Fetch a URL, strip HTML, and return compact text.",
    promptSnippet: "Fetch one URL and return compact stripped page text",
    promptGuidelines: [
      "Use strip_fetch when you already have a URL and only need its stripped page text without running search.",
    ],
    parameters: fetchParams,
    async execute(_id, params, _signal, onUpdate) {
      const url = params.url as string;
      const maxChars = (params.max_chars as number | undefined) ?? 3000;

      onUpdate?.({ content: [{ type: "text", text: `Fetching: ${url}` }], details: {} });

      try {
        const content = await fetchAndStrip(url, { maxChars });
        return {
          content: [{ type: "text", text: `URL: ${url}\nContent: ${content}` }],
          details: { url, content } satisfies FetchDetails,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
          content: [{ type: "text", text: `Fetch failed: ${message}` }],
          details: { url, error: message } satisfies FetchDetails,
          isError: true,
        };
      }
    },
    renderCall(args, theme) {
      let text = theme.fg("toolTitle", theme.bold("strip_fetch "));
      text += theme.fg("accent", args.url);
      text += theme.fg("dim", ` max_chars=${args.max_chars ?? 3000}`);
      return new Text(text, 0, 0);
    },
    renderResult: renderFetchResult,
  });
}

async function runSearch(query: string, maxResults: number, full: boolean, onUpdate?: (result: any) => void): Promise<any> {
  onUpdate?.({ content: [{ type: "text", text: `Searching: ${query}` }], details: {} });

  try {
    const results = await searchAndStrip(query, { maxResults, maxChars: full ? null : undefined });
    return {
      content: [{ type: "text", text: formatResults(results) }],
      details: { query, maxResults, results } satisfies SearchDetails,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      content: [{ type: "text", text: `Search failed: ${message}` }],
      details: { error: message },
      isError: true,
    };
  }
}

function searchCallText(name: string, query: string, maxResults: number | undefined, theme: any) {
  let text = theme.fg("toolTitle", theme.bold(`${name} `));
  text += theme.fg("accent", `"${query}"`);
  text += theme.fg("dim", ` max_results=${maxResults ?? 3}`);
  return new Text(text, 0, 0);
}

function renderSearchResult(result: any, { expanded, isPartial }: any, theme: any) {
  if (isPartial) return new Text(theme.fg("warning", "Searching..."), 0, 0);

  const details = result.details as SearchDetails | undefined;
  const content = result.content?.[0]?.type === "text" ? result.content[0].text : "";

  if (!details?.results) return new Text(theme.fg("dim", compact(content)), 0, 0);

  let text = theme.fg("success", `${details.results.length} results`);
  text += theme.fg("dim", ` max_results=${details.maxResults ?? 3}`);

  const chars = details.results.reduce((sum, item) => sum + (item.content?.length ?? 0), 0);
  if (chars) text += theme.fg("dim", ` ${chars} chars`);

  for (const item of details.results.slice(0, 3)) {
    text += `\n${theme.fg("accent", item.title)}`;
    text += `\n${theme.fg("dim", item.url)}`;
  }

  if (expanded && content) {
    text += `\n\n${content}`;
  } else if (content) {
    text += theme.fg("muted", "\n\nPress ctrl+o to view full output");
  }

  return new Text(text, 0, 0);
}

function renderFetchResult(result: any, { expanded, isPartial }: any, theme: any) {
  if (isPartial) return new Text(theme.fg("warning", "Fetching..."), 0, 0);

  const details = result.details as FetchDetails | undefined;
  const content = result.content?.[0]?.type === "text" ? result.content[0].text : "";

  if (details?.error) return new Text(theme.fg("error", details.error), 0, 0);

  let text = theme.fg("success", "fetched");
  if (details?.content) text += theme.fg("dim", ` ${details.content.length} chars`);
  if (details?.url) text += `\n${theme.fg("dim", details.url)}`;

  if (expanded && content) {
    text += `\n\n${content}`;
  } else if (content) {
    text += theme.fg("muted", "\n\nPress ctrl+o to view full output");
  }

  return new Text(text, 0, 0);
}

function compact(text: string) {
  return text.split("\n").slice(0, 4).join("\n");
}
