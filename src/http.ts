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

	const res = await fetch(url, { signal });

	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return await res.text();
}
