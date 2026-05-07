# strip-search

`strip_search` is a simple token-efficient pi extension that adds 3 tools:

- `search_strip` - compact DuckDuckGo results with stripped page text (up to 3000 chars per page)
- `search_strip_full` - same thing, but returns the full stripped page text
- `strip_fetch` - fetch one URL directly and return stripped page text

The tools fetch pages, strip HTML/scripts/styles/navigation, and clean up whitespace while keeping normal newlines.

## Install

```bash
pi install npm:@pavlokrykh/strip-search
```

or from git:

```bash
pi install git:github.com/pavlokrykh/strip-search
```

## Debug from terminal

```bash
npm install
npm run search -- "latest model benchmarks"
npm run search -- --full "latest model benchmarks"
npm run search -- --url "https://example.com"
npm run search -- --full --url "https://example.com"
npm run search -- --debug --max 3 "latest model benchmarks"
npm run search -- --json "latest model benchmarks"
```

The normal CLI output matches `search_strip`. Add `--full` to see what `search_strip_full` returns. Use `--url` to test `strip_fetch` behavior.
