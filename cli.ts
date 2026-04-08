#!/usr/bin/env -S deno run --allow-net --allow-env --allow-write

/**
 * FAQ Generator CLI
 * 
 * Generates customized FAQs for any business using OpenAI.
 * 
 * Usage:
 *   deno task generate --name "Business Name" --url "https://website.com"
 * 
 * Options:
 *   --name      Business name (required)
 *   --url       Business website URL (required)
 *   --type      Business type (default: "business")
 *   --count     Number of FAQs to generate (default: 75)
 *   --wording   Answer length: short | medium | long (default: short)
 *   --verify    Verify FAQs against source (default: false)
 *   --output    Output file path (default: <name>-faqs.csv)
 *   --format    Output format: csv | json | both (default: csv)
 */

import { generateFaqs, validateFaqRequest, faqsToCSV } from './src/index.ts'

// ─── Parse CLI args ────────────────────────────────────────────────────────────

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const value = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
      result[key] = value
    }
  }
  return result
}

function printUsage() {
  console.log(`
FAQ Generator — Generate customized FAQs for any business using OpenAI

Usage:
  deno task generate --name "Business Name" --url "https://website.com" [options]

Options:
  --name      Business name (required)
  --url       Business website URL (required)
  --type      Business type, e.g. "Dental Office", "Law Firm" (default: "business")
  --count     Number of FAQs to generate, 1-200 (default: 75)
  --wording   Answer length: short | medium | long (default: short)
  --verify    Verify FAQs against source research: true | false (default: false)
  --output    Output file path without extension (default: <slugified-name>-faqs)
  --format    Output format: csv | json | both (default: csv)

Examples:
  deno task generate --name "Smile Dental" --url "https://smiledental.com" --type "Dental Office" --count 100
  deno task generate --name "Smith Law" --url "https://smithlaw.com" --type "Law Firm" --count 50 --format both
  deno task generate --name "Tasty Bites" --url "https://tastybites.com" --type "Restaurant" --wording medium --output my-faqs
`)
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(Deno.args)

  if (args.help || args.h) {
    printUsage()
    Deno.exit(0)
  }

  const name = args.name
  const url = args.url
  const businessType = args.type || 'business'
  const count = parseInt(args.count || '75', 10)
  const wording = (args.wording || 'short') as 'short' | 'medium' | 'long'
  const verify = args.verify === 'true'
  const format = (args.format || 'csv') as 'csv' | 'json' | 'both'

  // Validate required args
  if (!name || !url) {
    console.error('Error: --name and --url are required\n')
    printUsage()
    Deno.exit(1)
  }

  const validation = validateFaqRequest(name, url, count)
  if (!validation.valid) {
    console.error(`Error: ${validation.error}`)
    Deno.exit(1)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set')
    Deno.exit(1)
  }

  // Build output filename
  const slug = args.output || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-faqs'
  const outputDir = 'output'
  await Deno.mkdir(outputDir, { recursive: true })
  const outputPath = `${outputDir}/${slug}`

  // ─── Run ──────────────────────────────────────────────────────────────────────

  console.log('\n═'.repeat(60))
  console.log('  FAQ Generator')
  console.log('═'.repeat(60))
  console.log(`  Business : ${name}`)
  console.log(`  Website  : ${url}`)
  console.log(`  Type     : ${businessType}`)
  console.log(`  Count    : ${count}`)
  console.log(`  Wording  : ${wording}`)
  console.log(`  Verify   : ${verify}`)
  console.log(`  Format   : ${format}`)
  console.log(`  Output   : ${slug}.${format === 'both' ? '{csv,json}' : format}`)
  console.log('═'.repeat(60) + '\n')

  const startTime = Date.now()

  try {
    const result = await generateFaqs(apiKey, name, url, [], {
      businessType,
      totalCount: count,
      businessSpecificRatio: 1.0,   // 100% business-specific (no generic templates needed)
      verify,
      wordingLevel: wording,
      deduplicate: true
    })

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    console.log(`\n✅ Generated ${result.totalCount} FAQs in ${elapsed}s`)
    if (verify) {
      console.log(`   Verified: ${result.verifiedCount}/${result.totalCount}`)
    }

    // ─── Category summary ───────────────────────────────────────────────────────
    const byCategory: Record<string, number> = {}
    for (const faq of result.faqs) {
      byCategory[faq.category] = (byCategory[faq.category] || 0) + 1
    }

    console.log('\n📊 By category:')
    for (const [cat, cnt] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${cnt}`)
    }

    // ─── Write output ───────────────────────────────────────────────────────────
    if (format === 'csv' || format === 'both') {
      const csv = faqsToCSV(result.faqs, name)
      const csvPath = `${outputPath}.csv`
      await Deno.writeTextFile(csvPath, csv)
      console.log(`\n📄 CSV saved to: ${csvPath}`)
    }

    if (format === 'json' || format === 'both') {
      const jsonPath = `${outputPath}.json`
      await Deno.writeTextFile(jsonPath, JSON.stringify(result, null, 2))
      console.log(`📄 JSON saved to: ${jsonPath}`)
    }

    console.log('\n✨ Done!\n')

  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`\n❌ Failed after ${elapsed}s: ${(error as Error).message}`)
    Deno.exit(1)
  }
}

main()
