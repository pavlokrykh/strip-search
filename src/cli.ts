import { formatResults, searchAndStrip } from "./search.js";

const args = process.argv.slice(2);
const debug = takeFlag(args, "--debug");
const json = takeFlag(args, "--json");
const full = takeFlag(args, "--full");
const max = takeValue(args, "--max");
const query = args.join(" ").trim();

if (!query) {
  console.error('Usage: npm run search -- [--debug] [--json] [--full] [--max 3] "query"');
  process.exit(1);
}

const results = await searchAndStrip(query, {
  maxResults: max ? Number(max) : 3,
  maxChars: full ? null : undefined,
  debug,
});

console.log(json ? JSON.stringify(results, null, 2) : formatResults(results));

function takeFlag(args: string[], flag: string): boolean {
  const i = args.indexOf(flag);
  if (i === -1) return false;
  args.splice(i, 1);
  return true;
}

function takeValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  if (i === -1) return undefined;
  const value = args[i + 1];
  args.splice(i, 2);
  return value;
}
