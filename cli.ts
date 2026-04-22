#!/usr/bin/env -S deno run --allow-net --allow-env --allow-write

/**
 * FAQ Generator CLI
 * 
 * Generates customized FAQs for any business using OpenAI.
 * Large counts are split into batches of 80 to avoid token limits.
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
 *   --verify    Verify FAQs against source (default: true)
 *   --output    Output file path without extension (default: <name>-faqs)
 *   --format    Output format: csv | json | both (default: csv)
 */

import {
  researchBusiness,
  generateCategories,
  generateBusinessFaqs,
  verifyFaqs,
  deduplicateFaqs,
  validateFaqRequest,
  faqsToCSV,
} from './src/index.ts'
import { WORDING_GUIDELINES } from './src/config.ts'
import type { FaqItem, WordingLevel } from './src/types.ts'

const BATCH_SIZE = 80

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
  --count     Number of FAQs to generate (default: 75)
  --wording   Answer length: short | medium | long (default: short)
  --verify    Verify FAQs against source research: true | false (default: true)
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
  const wording = (args.wording || 'short') as WordingLevel
  const verify = args.verify !== 'false'
  const format = (args.format || 'csv') as 'csv' | 'json' | 'both'

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

  const slug = args.output || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-faqs'
  const outputDir = 'output'
  await Deno.mkdir(outputDir, { recursive: true })
  const outputPath = `${outputDir}/${slug}`

  const wordingGuideline = WORDING_GUIDELINES[wording]

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
    // Step 1: Research the business once
    console.log('Step 1/3: Researching business...')
    const research = await researchBusiness(apiKey, name, url, businessType)

    // Step 2: Generate categories once
    console.log('Step 2/3: Generating categories...')
    const categories = await generateCategories(apiKey, businessType, research.summary)

    // Step 3: Generate FAQs in batches until target is reached
    console.log(`Step 3/3: Generating ${count} FAQs in batches of ${BATCH_SIZE}...`)
    const allFaqs: FaqItem[] = []
    let batchNum = 0
    let consecutiveEmptyBatches = 0

    while (allFaqs.length < count) {
      batchNum++
      const needed = count - allFaqs.length
      const batchSize = Math.min(needed + Math.floor(needed * 0.2), BATCH_SIZE) // request 20% extra to account for dedup loss
      const previousQuestions = allFaqs.map(f => f.question)
      console.log(`  Batch ${batchNum}: generating ${batchSize} FAQs (${allFaqs.length}/${count} collected, avoiding ${previousQuestions.length} existing questions)...`)

      const batch = await generateBusinessFaqs(apiKey, name, businessType, research.summary, batchSize, categories, wordingGuideline, previousQuestions)

      // Deduplicate immediately against everything already collected
      const combined = deduplicateFaqs([...allFaqs, ...batch])
      const newUnique = combined.slice(allFaqs.length)
      console.log(`    → ${batch.length} generated, ${newUnique.length} unique after dedup`)

      if (newUnique.length === 0) {
        consecutiveEmptyBatches++
        if (consecutiveEmptyBatches >= 2) {
          console.log(`  ⚠️  No new unique FAQs after ${consecutiveEmptyBatches} batches — topic exhausted at ${allFaqs.length} FAQs`)
          break
        }
      } else {
        consecutiveEmptyBatches = 0
      }

      allFaqs.push(...newUnique)
    }

    let finalFaqs = allFaqs.slice(0, count)

    // Step 4: Optionally verify FAQs against the research
    if (verify) {
      console.log('Step 4/4: Verifying FAQs against research...')
      finalFaqs = await verifyFaqs(apiKey, name, research.summary, finalFaqs)
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const verifiedCount = finalFaqs.filter(f => f.verified).length
    console.log(`\n✅ Generated ${finalFaqs.length} FAQs in ${elapsed}s${verify ? ` (${verifiedCount} verified)` : ''}`)

    // Category summary
    const byCategory: Record<string, number> = {}
    for (const faq of finalFaqs) {
      byCategory[faq.category] = (byCategory[faq.category] || 0) + 1
    }
    console.log('\n📊 By category:')
    for (const [cat, cnt] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
      console.log(`   ${cat}: ${cnt}`)
    }

    // Write output
    if (format === 'csv' || format === 'both') {
      const csv = faqsToCSV(finalFaqs, name)
      const csvPath = `${outputPath}.csv`
      await Deno.writeTextFile(csvPath, csv)
      console.log(`\n📄 CSV saved to: ${csvPath}`)
    }

    if (format === 'json' || format === 'both') {
      const jsonPath = `${outputPath}.json`
      await Deno.writeTextFile(jsonPath, JSON.stringify({ organization_name: name, faqs: finalFaqs, total_count: finalFaqs.length }, null, 2))
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
