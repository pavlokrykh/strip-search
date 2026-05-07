import { Type, type Static } from "@mariozechner/pi-ai";
import {
	defineTool,
	type AgentToolResult,
	type AgentToolUpdateCallback,
	type ExtensionAPI,
	type Theme,
	type ToolRenderResultOptions,
} from "@mariozechner/pi-coding-agent";
import { Text } from "@mariozechner/pi-tui";
import { formatResults, searchAndStrip, type Result } from "../src/search.js";
import { fetchAndStrip } from "../src/strip.js";

const DEFAULT_MAX_RESULTS = 3;
const DEFAULT_MAX_CHARS = 3000;

const searchParams = Type.Object({
	query: Type.String({ description: "Search query" }),
	max_results: Type.Optional(
		Type.Number({
			description: "Number of results, default 3",
			default: DEFAULT_MAX_RESULTS,
			minimum: 1,
			maximum: 5,
		}),
	),
});

const fetchParams = Type.Object({
	url: Type.String({ description: "URL to fetch and strip" }),
	max_chars: Type.Optional(
		Type.Number({
			description: "Maximum returned characters, default 3000",
			default: DEFAULT_MAX_CHARS,
		}),
	),
});

type SearchParams = Static<typeof searchParams>;
type FetchParams = Static<typeof fetchParams>;
type SearchToolName = "search_strip" | "search_strip_full";

type SearchDetails = {
	query?: string;
	maxResults?: number;
	results?: Result[];
	error?: string;
};

type FetchDetails = {
	url?: string;
	content?: string;
	error?: string;
};

type SearchToolConfig = {
	name: SearchToolName;
	label: string;
	description: string;
	promptSnippet: string;
	promptGuidelines: string[];
	full: boolean;
};

type RenderContext = {
	isError: boolean;
};

export default function registerSearchTools(pi: ExtensionAPI) {
	registerSearchTool(pi, {
		name: "search_strip",
		label: "Search Strip",
		description:
			"Search DuckDuckGo, fetch result pages, strip HTML, and return compact text.",
		promptSnippet: "Search the web and return compact stripped page text",
		promptGuidelines: [
			"Use search_strip when you need simple web results. It strips result pages and returns compact text for context.",
		],
		full: false,
	});

	registerSearchTool(pi, {
		name: "search_strip_full",
		label: "Search Strip Full",
		description:
			"Search DuckDuckGo, fetch result pages, strip HTML, and return the full stripped text for each page.",
		promptSnippet: "Search the web and return full stripped page text",
		promptGuidelines: [
      "Use search_strip_full when you need more detailed web results. It strips result pages and returns full text for context.",
		],
		full: true,
	});

	pi.registerTool(
		defineTool<typeof fetchParams, FetchDetails>({
			name: "strip_fetch",
			label: "Strip Fetch",
			description: "Fetch a URL, strip HTML, and return compact text.",
			promptSnippet: "Fetch one URL and return compact stripped page text",
			promptGuidelines: [
        "Use strip_fetch when you have a URL and need do get it's content with stripped html tags",
			],
			parameters: fetchParams,
			async execute(_id, params, signal, onUpdate) {
				return runFetch(
					params.url,
					params.max_chars ?? DEFAULT_MAX_CHARS,
					onUpdate,
					signal,
				);
			},
			renderCall(args, theme) {
				return fetchCallText(args, theme);
			},
			renderResult: renderFetchResult,
		}),
	);
}

function registerSearchTool(pi: ExtensionAPI, config: SearchToolConfig) {
	pi.registerTool(
		defineTool<typeof searchParams, SearchDetails>({
			name: config.name,
			label: config.label,
			description: config.description,
			promptSnippet: config.promptSnippet,
			promptGuidelines: config.promptGuidelines,
			parameters: searchParams,
			async execute(_id, params, signal, onUpdate) {
				return runSearch(
					params.query,
					params.max_results ?? DEFAULT_MAX_RESULTS,
					config.full,
					onUpdate,
					signal,
				);
			},
			renderCall(args, theme) {
				return searchCallText(config.name, args, theme);
			},
			renderResult: renderSearchResult,
		}),
	);
}

async function runSearch(
	query: string,
	maxResults: number,
	full: boolean,
	onUpdate: AgentToolUpdateCallback<SearchDetails> | undefined,
	signal: AbortSignal | undefined,
): Promise<AgentToolResult<SearchDetails>> {
	try {
		onUpdate?.({
			content: [{ type: "text", text: `Searching: ${query}` }],
			details: { query, maxResults, results: [] },
		});

		const results = await searchAndStrip(query, {
			maxResults,
			maxChars: full ? null : undefined,
			signal,
		});
		return {
			content: [{ type: "text", text: formatResults(results) }],
			details: { query, maxResults, results },
		};
	} catch (err) {
		const message = errorMessage(err);
		onUpdate?.({
			content: [{ type: "text", text: `Search failed: ${message}` }],
			details: { query, maxResults, results: [], error: message },
		});
		throw new Error(`Search failed: ${message}`);
	}
}

async function runFetch(
	url: string,
	maxChars: number,
	onUpdate: AgentToolUpdateCallback<FetchDetails> | undefined,
	signal: AbortSignal | undefined,
): Promise<AgentToolResult<FetchDetails>> {
	try {
		onUpdate?.({
			content: [{ type: "text", text: `Fetching: ${url}` }],
			details: { url },
		});

		const content = await fetchAndStrip(url, { maxChars, signal });
		return {
			content: [{ type: "text", text: `URL: ${url}\nContent: ${content}` }],
			details: { url, content },
		};
	} catch (err) {
		const message = errorMessage(err);
		onUpdate?.({
			content: [{ type: "text", text: `Fetch failed: ${message}` }],
			details: { url, error: message },
		});
		throw new Error(`Fetch failed: ${message}`);
	}
}

function searchCallText(
	name: SearchToolName,
	args: SearchParams,
	theme: Theme,
): Text {
	let text = theme.fg("toolTitle", theme.bold(`${name} `));
	text += theme.fg("accent", `"${args.query}"`);
	text += theme.fg(
		"dim",
		` max_results=${args.max_results ?? DEFAULT_MAX_RESULTS}`,
	);
	return new Text(text, 0, 0);
}

function fetchCallText(args: FetchParams, theme: Theme): Text {
	let text = theme.fg("toolTitle", theme.bold("strip_fetch "));
	text += theme.fg("accent", args.url);
	text += theme.fg("dim", ` max_chars=${args.max_chars ?? DEFAULT_MAX_CHARS}`);
	return new Text(text, 0, 0);
}

function renderSearchResult(
	result: AgentToolResult<SearchDetails>,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
): Text {
	const partial = renderPartial(options, "Searching...", theme);
	if (partial) return partial;

	const content = textContent(result);
	if (context.isError) return renderError(content, theme);

	const details = result.details;
	if (details.error) return new Text(theme.fg("error", details.error), 0, 0);
	if (!details.results)
		return new Text(theme.fg("dim", compact(content)), 0, 0);

	let text = theme.fg("success", `${details.results.length} results`);
	text += theme.fg(
		"dim",
		` max_results=${details.maxResults ?? DEFAULT_MAX_RESULTS}`,
	);

	const chars = details.results.reduce(
		(sum, item) => sum + (item.content?.length ?? 0),
		0,
	);
	if (chars) text += theme.fg("dim", ` ${chars} chars`);

	for (const item of details.results.slice(0, 3)) {
		text += `\n${theme.fg("accent", item.title)}`;
		text += `\n${theme.fg("dim", item.url)}`;
	}

	return new Text(expandableText(text, content, options.expanded, theme), 0, 0);
}

function renderFetchResult(
	result: AgentToolResult<FetchDetails>,
	options: ToolRenderResultOptions,
	theme: Theme,
	context: RenderContext,
): Text {
	const partial = renderPartial(options, "Fetching...", theme);
	if (partial) return partial;

	const content = textContent(result);
	if (context.isError) return renderError(content, theme);

	const details = result.details;
	if (details.error) return new Text(theme.fg("error", details.error), 0, 0);

	let text = theme.fg("success", "fetched");
	if (details.content)
		text += theme.fg("dim", ` ${details.content.length} chars`);
	if (details.url) text += `\n${theme.fg("dim", details.url)}`;

	return new Text(expandableText(text, content, options.expanded, theme), 0, 0);
}

function renderPartial(
	options: ToolRenderResultOptions,
	text: string,
	theme: Theme,
): Text | undefined {
	return options.isPartial
		? new Text(theme.fg("warning", text), 0, 0)
		: undefined;
}

function expandableText(
	text: string,
	content: string,
	expanded: boolean,
	theme: Theme,
): string {
	if (!content) return text;
	if (expanded) return `${text}\n\n${content}`;
	return text + theme.fg("muted", "\n\nPress ctrl+o to view full output");
}

function textContent(result: AgentToolResult<unknown>): string {
	const first = result.content[0];
	return first?.type === "text" ? first.text : "";
}

function renderError(content: string, theme: Theme): Text {
	return new Text(theme.fg("error", content || "Error"), 0, 0);
}

function errorMessage(err: unknown): string {
	return err instanceof Error ? err.message : String(err);
}

function compact(text: string): string {
	return text.split("\n").slice(0, 4).join("\n");
}
