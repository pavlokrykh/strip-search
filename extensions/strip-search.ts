// pi extension. search DuckDuckGo, fetch each result URL, strip HTML, return compact text.

import { Type } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { formatResults, searchAndStrip } from "../src/search.js";

const params = Type.Object({
  query: Type.String({ description: "Search query" }),
  max_results: Type.Optional(Type.Number({ description: "Number of results, default 3", minimum: 1, maximum: 5 })),
});

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "search_strip",
    label: "Search Strip",
    description: "Search DuckDuckGo, fetch result pages, strip HTML, and return compact text.",
    promptSnippet: "Search the web and return compact stripped page text",
    promptGuidelines: [
      "Use search_strip when you need current web results. It strips result pages and returns compact text for context.",
    ],
    parameters: params,
    async execute(_id, params, _signal, onUpdate) {
      return runSearch(params.query as string, (params.max_results as number | undefined) ?? 3, false, onUpdate);
    },
  });

  pi.registerTool({
    name: "search_strip_full",
    label: "Search Strip Full",
    description: "Search DuckDuckGo, fetch result pages, strip HTML, and return the full stripped text for each page.",
    promptSnippet: "Search the web and return full stripped page text",
    promptGuidelines: [
      "Use search_strip_full only when search_strip is too short or the full fetched pages are needed. It can return a lot of text.",
    ],
    parameters: params,
    async execute(_id, params, _signal, onUpdate) {
      return runSearch(params.query as string, (params.max_results as number | undefined) ?? 3, true, onUpdate);
    },
  });
}

async function runSearch(query: string, maxResults: number, full: boolean, onUpdate?: (result: any) => void): Promise<any> {
  onUpdate?.({ content: [{ type: "text", text: `Searching: ${query}` }], details: {} });

  try {
    const results = await searchAndStrip(query, { maxResults, maxChars: full ? null : undefined });
    return {
      content: [{ type: "text", text: formatResults(results) }],
      details: { query, results },
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
