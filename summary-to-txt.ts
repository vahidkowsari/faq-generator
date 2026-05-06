#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Converts a page-summary JSON file into a plain text file.
 *
 * Usage:
 *   deno task summary-txt --input output/parkside-dental-summary.json
 *   deno task summary-txt --input output/parkside-dental-summary.json --output ~/Downloads/parkside-summary.txt
 */

import type { PageSummary } from './src/types.ts'

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      result[key] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : 'true'
    }
  }
  return result
}

function rule(char = '─', n = 70) { return char.repeat(n) }

function render(summary: PageSummary): string {
  const lines: string[] = []
  const org = summary.organization.name || 'Page Summary'
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const url = summary.organization.links.website || ''

  lines.push(rule('═'))
  lines.push(`  ${org}`)
  lines.push('  Page Summary')
  if (url) lines.push(`  Source: ${url}`)
  lines.push(`  Generated: ${date}`)
  lines.push(rule('═'))
  lines.push('')

  lines.push('ABOUT')
  lines.push(rule())
  lines.push(summary.about || '—')
  lines.push('')

  lines.push('ORGANIZATION')
  lines.push(rule())
  lines.push(`Name: ${summary.organization.name || '—'}`)

  if (summary.organization.locations.length > 0) {
    lines.push('')
    lines.push(`Locations (${summary.organization.locations.length}):`)
    for (const loc of summary.organization.locations) {
      const parts = [loc.address, loc.phone, loc.email].filter(Boolean)
      lines.push(`  • ${parts.join('  ·  ')}`)
    }
  }

  if (summary.organization.team.length > 0) {
    lines.push('')
    lines.push(`Team (${summary.organization.team.length}):`)
    for (const m of summary.organization.team) {
      const head = [m.name, m.title].filter(Boolean).join(' — ')
      lines.push(`  • ${head}`)
      if (m.credentials) lines.push(`    ${m.credentials}`)
    }
  }

  const links = summary.organization.links
  if (links.website || links.booking || (links.social && links.social.length)) {
    lines.push('')
    lines.push('Links:')
    if (links.website) lines.push(`  Website: ${links.website}`)
    if (links.booking) lines.push(`  Booking: ${links.booking}`)
    if (links.social.length) lines.push(`  Social:  ${links.social.join(', ')}`)
  }

  lines.push('')
  lines.push('SCHEDULING')
  lines.push(rule())
  const s = summary.scheduling
  const field = (label: string, value: string) => {
    if (!value) return
    lines.push(`${label}:`)
    for (const ln of value.split('\n')) lines.push(`  ${ln}`)
    lines.push('')
  }
  field('Hours', s.hours)
  field('Booking Process', s.booking_process)
  field('Online Booking URL', s.online_booking_url)
  field('New Customer Steps', s.new_customer_steps)
  field('Policies', s.policies)
  field('Emergency / After Hours', s.emergency)

  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

async function main() {
  const args = parseArgs(Deno.args)

  const inputPath = args.input
  if (!inputPath) {
    console.error('Error: --input <path-to-summary.json> is required')
    Deno.exit(1)
  }

  const outputPath = args.output ?? inputPath.replace(/\.json$/, '.txt')

  console.log(`Converting: ${inputPath} → ${outputPath}`)
  const summary = JSON.parse(await Deno.readTextFile(inputPath)) as PageSummary
  await Deno.writeTextFile(outputPath, render(summary) + '\n')
  console.log(`\n📄 Text saved to: ${outputPath}\n`)
}

main()
