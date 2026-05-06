#!/usr/bin/env -S deno run --allow-net --allow-env --allow-write

/**
 * Page Summarizer CLI
 *
 * Summarizes a webpage into structured sections:
 *   - about
 *   - organization (name, locations, team, links)
 *   - scheduling (hours, booking, policies, emergency)
 *
 * Usage:
 *   deno task summarize --url "https://example.com" [--name "Org Name"] [--output path]
 */

import { summarizePage } from './src/index.ts'

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

async function main() {
  const args = parseArgs(Deno.args)

  if (args.help || args.h || !args.url) {
    console.log(`
Page Summarizer — Summarize a webpage into about / organization / scheduling

Usage:
  deno task summarize --url "https://example.com" [options]

Options:
  --url       Page URL to summarize (required)
  --name      Organization name for context (optional)
  --output    Output file path without extension (default: <slug>-summary)
`)
    Deno.exit(args.url ? 0 : 1)
  }

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  if (!apiKey) {
    console.error('Error: OPENAI_API_KEY environment variable is not set')
    Deno.exit(1)
  }

  const url = args.url
  const name = args.name

  const slug = args.output ||
    (name || new URL(url).hostname).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-summary'
  const outputDir = 'output'
  await Deno.mkdir(outputDir, { recursive: true })
  const outputPath = `${outputDir}/${slug}.json`

  console.log(`\nSummarizing ${url}${name ? ` (${name})` : ''}...\n`)

  const startTime = Date.now()
  try {
    const summary = await summarizePage(apiKey, url, name)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)

    await Deno.writeTextFile(outputPath, JSON.stringify(summary, null, 2))

    console.log(`\n✅ Done in ${elapsed}s`)
    console.log(`📄 Summary saved to: ${outputPath}\n`)
    console.log('─── Preview ───')
    console.log(`Org: ${summary.organization.name}`)
    console.log(`Locations: ${summary.organization.locations.length}`)
    console.log(`Team: ${summary.organization.team.length}`)
    console.log(`Hours: ${summary.scheduling.hours.slice(0, 80)}${summary.scheduling.hours.length > 80 ? '…' : ''}`)
    console.log(`About: ${summary.about.slice(0, 200)}${summary.about.length > 200 ? '…' : ''}\n`)
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    console.error(`\n❌ Failed after ${elapsed}s: ${(error as Error).message}`)
    Deno.exit(1)
  }
}

main()
