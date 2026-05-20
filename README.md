# xretry

Retry any function with exponential backoff. Zero dependencies, fully typed.

## Install

```sh
npm install xretry
```

## Quick start

```ts
import { withRetry } from "xretry";

const data = await withRetry(() =>
  fetch("https://api.example.com/users").then((r) => r.json())
);
```

Retries up to **3 times** with a **500 ms → 1 s → 2 s** backoff by default.

## API

```ts
withRetry(fn, options?)
```

| Parameter | Type | Default | Description |
|---|---|---|---|
| `fn` | `() => T \| Promise<T>` | — | Function to call. Sync or async. |
| `options.retries` | `number` | `3` | Max retry attempts after the first failure. |
| `options.delay` | `number` | `500` | Initial delay in ms. Doubles with each attempt. |

Returns `Promise<T>`. Resolves with the first successful result, or rejects after all retries are exhausted.

## Examples

### Increase retries for a slow upstream

```ts
const result = await withRetry(fetchReport, { retries: 5, delay: 1000 });
// Waits: 1 s → 2 s → 4 s → 8 s → 16 s
```

### Cancel mid-flight with AbortSignal

Aborting the signal stops retries immediately — the error propagates to the caller.

```ts
const controller = new AbortController();

const data = await withRetry(() =>
  fetch("/api/report", { signal: controller.signal }).then((r) => r.json())
);

controller.abort(); // no retries; error propagates to the caller
```

### Handle total failure

If every attempt throws, `withRetry` rejects with the error from the last attempt.

```ts
try {
  await withRetry(unstableOperation, { retries: 2 });
} catch (err) {
  console.error("All retries exhausted:", err);
}
```

## License

MIT
