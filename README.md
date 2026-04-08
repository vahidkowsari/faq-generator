# FAQ Generator

A standalone command-line tool that generates customized FAQs for any business using OpenAI. Point it at a business name and website URL — it crawls the site, researches the business, and outputs a ready-to-use FAQ list in CSV and/or JSON.

Designed to produce voice-AI-optimized Q&A content but works great for web FAQ pages, chatbots, and knowledge bases too.

---

## Features

- 🔍 **Web research** — Crawls the business website using OpenAI's web search to gather real details
- 🏢 **Any business type** — Dental offices, law firms, restaurants, gyms, and more
- 🎯 **Business-specific** — Every FAQ is tailored to the actual business, not generic filler
- 🗣️ **Voice-AI ready** — Short, conversational answers optimized for spoken delivery
- 📂 **CSV + JSON output** — Ready to import into any knowledge base or CMS
- 🔁 **Deduplication** — Automatically removes similar/redundant questions
- ✅ **Optional verification** — Cross-checks answers against source research

---

## Prerequisites

- [Deno](https://deno.land/) v1.40+
- OpenAI API key (with access to `gpt-4o` and the Responses API)

---

## Setup

```bash
git clone https://github.com/your-username/faq-generator.git
cd faq-generator
export OPENAI_API_KEY=your-openai-api-key
```

Or add it to a `.env` file (not committed):
```bash
echo "OPENAI_API_KEY=your-key" > .env
```

---

## Usage

```bash
deno task generate --name "Business Name" --url "https://website.com" [options]
```

### Options

| Flag | Description | Default |
|---|---|---|
| `--name` | Business name **(required)** | — |
| `--url` | Business website URL **(required)** | — |
| `--type` | Business type (e.g. `"Dental Office"`, `"Law Firm"`) | `"business"` |
| `--count` | Number of FAQs to generate (1–200) | `75` |
| `--wording` | Answer length: `short` \| `medium` \| `long` | `short` |
| `--verify` | Verify answers against source research | `false` |
| `--output` | Output filename (no extension) | `<name>-faqs` |
| `--format` | Output format: `csv` \| `json` \| `both` | `csv` |

### Examples

```bash
# Dental practice
deno task generate \
  --name "Smile Dental Group" \
  --url "https://www.smiledentalgroup.com" \
  --type "Dental Office" \
  --count 100

# Law firm, both formats
deno task generate \
  --name "Smith & Associates" \
  --url "https://www.smithlaw.com" \
  --type "Law Firm" \
  --count 50 \
  --wording medium \
  --format both

# Restaurant, custom output name
deno task generate \
  --name "Tasty Bites" \
  --url "https://www.tastybites.com" \
  --type "Restaurant" \
  --count 80 \
  --output tasty-bites-knowledge-base
```

### Output

All files are saved to the `output/` folder:

```
output/
├── smile-dental-group-faqs.csv
└── smile-dental-group-faqs.json
```

**CSV columns:** `Number`, `Category`, `Source`, `Verified`, `Organization`, `Question`, `Answer`

---

## How It Works

```
1. Research    → Crawls the website using OpenAI web search
2. Categories  → Generates relevant FAQ categories for the business type
3. Generate    → Creates business-specific FAQs from the research
4. Deduplicate → Removes similar/redundant questions
5. Export      → Saves to CSV and/or JSON in output/
```

---

## Wording Levels

| Level | Answer Length | Best For |
|---|---|---|
| `short` | 1–2 sentences | Voice AI, quick-reference chatbots |
| `medium` | 2–3 sentences | Web FAQ pages, chat widgets |
| `long` | 3–4 sentences | Detailed knowledge bases |

---

## Project Structure

```
faq-generator/
├── cli.ts                    # CLI entry point
├── deno.json                 # Deno task config
├── .gitignore
├── output/                   # Generated files (gitignored)
└── src/                      # Core library (OpenAI only, no dependencies)
    ├── faq-generator.ts      # Main generation pipeline
    ├── openai.ts             # OpenAI API calls + retry logic
    ├── prompts.ts            # Prompt templates
    ├── config.ts             # Constants & defaults
    ├── types.ts              # TypeScript types
    ├── utils.ts              # CSV export, deduplication, validation
    └── index.ts              # Public exports
```

---

## Performance & Cost

| Metric | Estimate |
|---|---|
| Time for 75 FAQs | ~40–60 seconds |
| Time for 150 FAQs | ~90–120 seconds |
| OpenAI model | `gpt-4o` (configurable) |
| Estimated cost per run | ~$0.10–$0.50 depending on count |

Override the model:
```bash
export OPENAI_MODEL=gpt-4o-mini   # faster and cheaper
```

---

## License

MIT
