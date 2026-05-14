const userAgent =
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
			"User-Agent": userAgent,
			"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
			"Accept-Language": "en-US,en;q=0.9",
			"Cache-Control": "max-age=0",
			"Sec-Ch-Ua": '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
			"Sec-Ch-Ua-Mobile": "?0",
			"Sec-Ch-Ua-Platform": '"Windows"',
			"Sec-Fetch-Dest": "document",
			"Sec-Fetch-Mode": "navigate",
			"Sec-Fetch-Site": "cross-site",
			"Sec-Fetch-User": "?1",
			"Upgrade-Insecure-Requests": "1"
		},
		signal,
	});

	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.text();
}
