const userAgent =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36";

type FetchTextOptions = {
	signal?: AbortSignal;
	timeoutMs?: number;
};

export async function fetchText(
	url: string,
	options: FetchTextOptions = {},
): Promise<string> {
	const timeoutSignal = AbortSignal.timeout(options.timeoutMs ?? 30000);
	const signal = options.signal
		? AbortSignal.any([options.signal, timeoutSignal])
		: timeoutSignal;

	const res = await fetch(url, {
		headers: {
			"user-agent": userAgent,
			accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
			"accept-language": "en-US,en;q=0.9",
		},
		signal,
	});

	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.text();
}
