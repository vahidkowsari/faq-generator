# FAQ Generation Library

A lower-level library for generating customized dental practice FAQs using OpenAI's API with web search capabilities.

## Overview

This library provides a modular, reusable system for:
- Researching dental practices via web search
- Generating business-specific FAQs
- Customizing generic FAQs with practice details
- Verifying FAQ accuracy against source material
- Converting FAQs to various formats (JSON, CSV)

## Architecture

```
src/
├── index.ts           # Main exports
├── types.ts           # TypeScript type definitions
├── config.ts          # Configuration constants
├── prompts.ts         # OpenAI prompt templates
├── utils.ts           # Utility functions
├── openai.ts          # OpenAI API integration with retry logic
├── faq-generator.ts   # Core FAQ generation logic
└── README.md          # This file
```

## Installation

Import from the library in your edge function:

```typescript
import { generateFaqs } from './src/index.ts'

```

## Quick Start

### Basic Usage

```typescript
import { generateFaqs } from './src/index.ts'
import type { FaqItem } from './src/types.ts'

// Load your generic FAQs
const genericFaqs: FaqItem[] = [
  {
    question: "How often should I visit?",
    answer: "We recommend visiting every six months.",
    category: "General",
    source: "generic"
  }
]

// Generate FAQs for any business type
const result = await generateFaqs(
  apiKey,
  'ABC Dental Care',
  'https://www.abcdentalcare.com',
  genericFaqs,
  {
    totalCount: 75,
    businessType: 'dental office',  // Categories auto-generated based on this
    businessSpecificRatio: 0.7,
    verify: true
  }
)

console.log(`Generated ${result.totalCount} FAQs`)
console.log(`${result.verifiedCount} verified`)
```

### Different Business Types

```typescript
// Restaurant
await generateFaqs(apiKey, 'Tasty Bites', 'https://tastybites.com', genericFaqs, {
  businessType: 'restaurant'
  // Auto-generates categories: Menu, Reservations, Dietary Options, etc.
})

// Law Firm
await generateFaqs(apiKey, 'Smith & Associates', 'https://smithlaw.com', genericFaqs, {
  businessType: 'law firm'
  // Auto-generates categories: Practice Areas, Fees, Consultations, etc.
})

// Fitness Center
await generateFaqs(apiKey, 'FitLife Gym', 'https://fitlifegym.com', genericFaqs, {
  businessType: 'fitness center'
  // Auto-generates categories: Memberships, Classes, Equipment, etc.
})
```

### Advanced Usage

```typescript
import {
  researchBusiness,
  generateBusinessFaqs,
  customizeGenericFaqs,
  verifyFaqs,
  validateFaqRequest,
  faqsToCSV
} from './src/index.ts'

// Validate input
const validation = validateFaqRequest(
  'ABC Dental Care',
  'https://www.abcdentalcare.com',
  75
)

if (!validation.valid) {
  throw new Error(validation.error)
}

// Step-by-step control
const research = await researchBusiness(apiKey, orgName, websiteUrl)
const businessFaqs = await generateBusinessFaqs(apiKey, orgName, research.summary, 50)
const customFaqs = await customizeGenericFaqs(apiKey, orgName, research.summary, genericFaqs, 25)
const allFaqs = [...businessFaqs, ...customFaqs]
const verifiedFaqs = await verifyFaqs(apiKey, orgName, research.summary, allFaqs)

// Export to CSV
const csv = faqsToCSV(verifiedFaqs, orgName)
```

## API Reference

### Core Functions

#### `generateFaqs()`

Main function that orchestrates the entire FAQ generation pipeline with automatic category generation.

```typescript
function generateFaqs(
  apiKey: string,
  organizationName: string,
  websiteUrl: string,
  genericFaqs: FaqItem[],
  options?: FaqGenerationOptions
): Promise<FaqGenerationResult>
```

**Parameters:**
- `apiKey` - OpenAI API key
- `organizationName` - Name of the business
- `websiteUrl` - Business website URL
- `genericFaqs` - Array of generic FAQ templates
- `options` - Optional configuration

**Options:**
```typescript
{
  totalCount?: number              // Total FAQs to generate (default: 75)
  businessSpecificRatio?: number   // Ratio of business-specific FAQs (default: 0.7)
  verify?: boolean                 // Verify FAQs against source (default: true)
  businessType?: string            // Business type (default: 'dental office')
  categories?: string[]            // Custom categories (auto-generated if not provided)
}
```

**Returns:**
```typescript
{
  faqs: FaqItem[]           // Generated FAQs
  totalCount: number        // Total number of FAQs
  verifiedCount: number     // Number of verified FAQs
  businessSummary: string   // Research summary
}
```

#### `generateCategories()`

Generates relevant FAQ categories for a business type using AI.

```typescript
function generateCategories(
  apiKey: string,
  businessType: string,
  businessInfo?: string
): Promise<string[]>
```

**Parameters:**
- `apiKey` - OpenAI API key
- `businessType` - Type of business (e.g., 'dental office', 'restaurant', 'law firm')
- `businessInfo` - Optional business context to inform category generation

**Returns:** Array of category names (8-12 categories)

**Example:**
```typescript
const categories = await generateCategories(apiKey, 'restaurant')
// Returns: ['Menu & Cuisine', 'Reservations', 'Dietary Options', 'Hours & Location', ...]
```

#### `researchBusiness()`

Researches a business using OpenAI web search.

```typescript
function researchBusiness(
  apiKey: string,
  organizationName: string,
  websiteUrl: string,
  businessType?: string
): Promise<BusinessResearch>
```

#### `generateBusinessFaqs()`

Generates business-specific FAQs from research.

```typescript
function generateBusinessFaqs(
  apiKey: string,
  organizationName: string,
  businessInfo: string,
  targetCount: number
): Promise<FaqItem[]>
```

#### `customizeGenericFaqs()`

Customizes generic FAQs with practice-specific details.

```typescript
function customizeGenericFaqs(
  apiKey: string,
  organizationName: string,
  businessInfo: string,
  genericFaqs: FaqItem[],
  count: number
): Promise<FaqItem[]>
```

#### `verifyFaqs()`

Verifies FAQ accuracy against source information.

```typescript
function verifyFaqs(
  apiKey: string,
  organizationName: string,
  businessInfo: string,
  faqs: FaqItem[]
): Promise<FaqItem[]>
```

### Utility Functions

#### `validateFaqRequest()`

Validates FAQ generation request parameters.

```typescript
function validateFaqRequest(
  organizationName: string,
  websiteUrl: string,
  faqCount?: number
): { valid: boolean; error?: string }
```

#### `faqsToCSV()`

Converts FAQs to CSV format.

```typescript
function faqsToCSV(
  faqs: FaqItem[],
  organizationName: string
): string
```

#### `sortFaqsByCategory()`

Sorts FAQs by category priority.

```typescript
function sortFaqsByCategory(faqs: FaqItem[]): FaqItem[]
```

### OpenAI Functions

#### `callOpenAIResponses()`

Calls OpenAI Responses API with web search.

```typescript
function callOpenAIResponses(
  apiKey: string,
  prompt: string,
  model?: string
): Promise<string>
```

#### `callOpenAIChat()`

Calls OpenAI Chat Completions API.

```typescript
function callOpenAIChat(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  options?: {
    model?: string
    temperature?: number
    maxTokens?: number
    responseFormat?: 'text' | 'json_object'
  }
): Promise<string>
```

## Configuration

### Environment Variables

- `OPENAI_MODEL` - OpenAI model to use (default: `gpt-4o`)

### Constants

```typescript
// FAQ defaults
FAQ_DEFAULTS.TOTAL_FAQ_COUNT = 75
FAQ_DEFAULTS.BUSINESS_SPECIFIC_RATIO = 0.7
FAQ_DEFAULTS.VERIFY_FAQS = true

// OpenAI configuration
OPENAI_CONFIG.MAX_RETRIES = 3
OPENAI_CONFIG.INITIAL_RETRY_DELAY_MS = 1000
OPENAI_CONFIG.TIMEOUT_MS = 120000
```

## Features

### ✅ Retry Logic with Exponential Backoff

All OpenAI API calls automatically retry on:
- Rate limits (429)
- Server errors (5xx)
- Network failures

Retry delays: 1s → 2s → 4s

### ✅ Input Validation

Validates:
- Organization name (required, max 200 chars)
- Website URL (valid HTTP/HTTPS)
- FAQ count (1-200)

### ✅ Flexible JSON Parsing

Handles multiple response formats:
- Array of FAQs
- Object with `faqs` property
- Any object with an array property

### ✅ Voice AI Optimization

All FAQs are optimized for voice output:
- Short answers (2-3 sentences)
- Conversational tone
- No complex lists or formatting

### ✅ CSV Export

Includes:
- Category sorting by priority
- Proper CSV escaping
- Verification status
- Source tracking

## Error Handling

The library includes comprehensive error handling:

```typescript
try {
  const result = await generateFaqs(...)
} catch (error) {
  if (error.message.includes('OpenAI API error')) {
    // Handle API errors
  } else if (error.message.includes('validation')) {
    // Handle validation errors
  } else {
    // Handle other errors
  }
}
```

## Performance

- **Execution time**: 30-60+ seconds for full pipeline
- **API calls**: 4 sequential OpenAI calls
- **Token usage**: ~10k+ tokens per request
- **Cost**: ~$0.40-0.80 per request (with default settings)

## Best Practices

1. **Use validation** - Always validate inputs before calling the library
2. **Handle errors** - Implement proper error handling for API failures
3. **Monitor costs** - Track OpenAI API usage and costs
4. **Cache results** - Consider caching research results by website URL
5. **Rate limiting** - Implement rate limiting in your edge function
6. **Logging** - Use the built-in logger for debugging

## Example Edge Function

```typescript

import { generateFaqs, validateFaqRequest, faqsToCSV } from './src/index.ts'


Deno.serve(async (req: Request) => {
  const { organization_name, website_url, faq_count } = await req.json()
  
  // Validate
  const validation = validateFaqRequest(organization_name, website_url, faq_count)
  if (!validation.valid) {
    return new Response(validation.error, { status: 400 })
  }
  
  // Generate
  const result = await generateFaqs(
    Deno.env.get('OPENAI_API_KEY')!,
    organization_name,
    website_url,
    [],
    { businessType: 'business', totalCount: faq_count }
  )
  
  return Response.json(result)
})
```

## Types

See `types.ts` for complete type definitions:

- `FaqItem` - Single FAQ item
- `BusinessResearch` - Research result
- `FaqGenerationOptions` - Generation options
- `FaqGenerationResult` - Generation result
- `OpenAIConfig` - OpenAI configuration

## Prompts

All prompts are customizable via `prompts.ts`:

- `RESEARCH_PROMPT` - Web search research
- `BUSINESS_FAQ_SYSTEM_PROMPT` - Business FAQ generation
- `CUSTOMIZE_FAQ_SYSTEM_PROMPT` - Generic FAQ customization
- `VERIFY_FAQ_SYSTEM_PROMPT` - FAQ verification

## License

MIT
