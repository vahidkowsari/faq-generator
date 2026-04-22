# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run the generator
deno task generate --name "Business Name" --url "https://website.com"

# With all options
deno task generate --name "Smile Dental" --url "https://smiledental.com" \
  --type "Dental Office" --count 100 --wording short --verify true --format both

# Override OpenAI model
OPENAI_MODEL=gpt-4o-mini deno task generate --name "..." --url "..."
```

No build step — Deno runs TypeScript directly. No test suite exists.

## Architecture

The CLI (`cli.ts`) orchestrates a 4-step pipeline:

1. **Research** — `researchBusiness()` calls the OpenAI Responses API (`/v1/responses`) with `web_search_preview` to crawl the target website and produce a business summary.
2. **Categories** — `generateCategories()` calls Chat Completions to produce business-type-appropriate FAQ categories.
3. **Generate (batched)** — `generateBusinessFaqs()` generates FAQs in batches of 80. Each batch receives the list of already-generated questions to avoid duplication. Requests 20% extra per batch to absorb dedup loss. Stops early if 2 consecutive batches yield no new unique questions.
4. **Verify (optional)** — `verifyFaqs()` cross-checks answers against the research summary in batches of 40. Only `business_specific` FAQs are verified; `generic` FAQs are pre-marked verified.

### Two OpenAI endpoints

- `callOpenAIResponses` (`/v1/responses`) — used only for research; requires `web_search_preview` tool support.
- `callOpenAIChat` (`/v1/chat/completions`) — used for categories, FAQ generation, customization, and verification; always requests `json_object` response format.

Both use exponential-backoff retry logic in `fetchWithRetry` (retries on 429 and 5xx).

### Key files

| File | Role |
|---|---|
| `cli.ts` | Entry point; arg parsing, batching loop, file output |
| `src/faq-generator.ts` | Core pipeline functions (research, categories, generate, verify) |
| `src/openai.ts` | OpenAI API calls + retry logic |
| `src/prompts.ts` | All prompt templates (mustache-style `{{variable}}` substitution) |
| `src/config.ts` | Constants: model, temperatures, token limits, wording guidelines |
| `src/utils.ts` | CSV export, deduplication, `parseOpenAIFaqResponse`, validation |
| `src/types.ts` | TypeScript interfaces (`FaqItem`, `WordingLevel`, etc.) |

### `FaqItem` shape

```ts
{ question, answer, category, source: 'business_specific' | 'generic', verified?: boolean }
```

CSV output columns: `Number`, `Category`, `Source`, `Verified`, `Organization`, `Question`, `Answer`.

### Environment variables

- `OPENAI_API_KEY` — required
- `OPENAI_MODEL` — optional, defaults to `gpt-4o`

Output files are written to `output/` (auto-created).
