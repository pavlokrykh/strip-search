# strip-search

A pi extension that adds two search tools:

- `search_strip` - compact DuckDuckGo results with stripped page text
- `search_strip_full` - same thing, but returns the full stripped page text

Both tools search DuckDuckGo, fetch the result pages, strip HTML/scripts/styles/navigation, and clean up whitespace while keeping normal newlines.

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
npm run search -- --debug --max 3 "latest model benchmarks"
npm run search -- --json "latest model benchmarks"
```

The normal CLI output matches `search_strip`. Add `--full` to see what `search_strip_full` returns.
