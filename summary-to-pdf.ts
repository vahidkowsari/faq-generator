#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Converts a page-summary JSON file (from `deno task summarize`) into a formatted PDF.
 *
 * Usage:
 *   deno task summary-pdf --input output/parkside-dental-summary.json
 *   deno task summary-pdf --input output/parkside-dental-summary.json --output ~/Downloads/parkside-summary.pdf
 */

// @deno-types="npm:@types/pdfkit"
import PDFDocument from 'npm:pdfkit'
import type { PageSummary } from './src/types.ts'

const M = 55

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

function ensureSpace(doc: PDFKit.PDFDocument, needed: number) {
  const spaceLeft = doc.page.height - doc.page.margins.bottom - doc.y
  if (spaceLeft < needed) doc.addPage()
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 60)
  doc.moveDown(0.6)
  doc.font('Helvetica-Bold').fontSize(13).fillColor('#000000').text(title, M, doc.y)
  const y = doc.y + 2
  doc.moveTo(M, y).lineTo(doc.page.width - M, y).strokeColor('#cccccc').lineWidth(0.5).stroke()
  doc.moveDown(0.4)
}

function label(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 24)
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#222222').text(text, M, doc.y, { width: doc.page.width - M * 2 })
}

function body(doc: PDFKit.PDFDocument, text: string) {
  if (!text) text = '—'
  doc.font('Helvetica').fontSize(10).fillColor('#333333').text(text, M, doc.y + 1, { width: doc.page.width - M * 2 })
  doc.moveDown(0.3)
}

async function generatePDF(summary: PageSummary, outputPath: string) {
  const doc = new PDFDocument({ margin: M, size: 'LETTER' })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  const org = summary.organization.name || 'Page Summary'
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const url = summary.organization.links.website || ''

  doc.font('Helvetica-Bold').fontSize(18).fillColor('#000000').text(org, M, M)
  doc.font('Helvetica').fontSize(11).fillColor('#555555').text('Page Summary')
  doc.font('Helvetica').fontSize(9).fillColor('#888888')
    .text(`${url ? `Source: ${url}  ·  ` : ''}Generated: ${date}`)
  doc.moveDown(0.8)

  // About
  sectionHeader(doc, 'About')
  body(doc, summary.about)

  // Organization
  sectionHeader(doc, 'Organization')
  label(doc, 'Name')
  body(doc, summary.organization.name)

  if (summary.organization.locations.length > 0) {
    label(doc, `Locations (${summary.organization.locations.length})`)
    for (const loc of summary.organization.locations) {
      const parts = [loc.address, loc.phone, loc.email].filter(Boolean)
      body(doc, '• ' + parts.join('  ·  '))
    }
  }

  if (summary.organization.team.length > 0) {
    label(doc, `Team (${summary.organization.team.length})`)
    for (const m of summary.organization.team) {
      const head = [m.name, m.title].filter(Boolean).join(' — ')
      body(doc, `• ${head}${m.credentials ? `\n  ${m.credentials}` : ''}`)
    }
  }

  const links = summary.organization.links
  if (links.website || links.booking || (links.social && links.social.length)) {
    label(doc, 'Links')
    if (links.website) body(doc, `Website: ${links.website}`)
    if (links.booking) body(doc, `Booking: ${links.booking}`)
    if (links.social.length) body(doc, `Social: ${links.social.join(', ')}`)
  }

  // Scheduling
  sectionHeader(doc, 'Scheduling')
  const s = summary.scheduling
  if (s.hours)              { label(doc, 'Hours');               body(doc, s.hours) }
  if (s.booking_process)    { label(doc, 'Booking Process');     body(doc, s.booking_process) }
  if (s.online_booking_url) { label(doc, 'Online Booking URL');  body(doc, s.online_booking_url) }
  if (s.new_customer_steps) { label(doc, 'New Customer Steps');  body(doc, s.new_customer_steps) }
  if (s.policies)           { label(doc, 'Policies');            body(doc, s.policies) }
  if (s.emergency)          { label(doc, 'Emergency / After Hours'); body(doc, s.emergency) }

  doc.end()
  await new Promise<void>((resolve) => doc.on('end', resolve))

  const total = chunks.reduce((n, c) => n + c.length, 0)
  const pdf = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) { pdf.set(c, offset); offset += c.length }

  await Deno.writeFile(outputPath, pdf)
  console.log(`\n📄 PDF saved to: ${outputPath}\n`)
}

async function main() {
  const args = parseArgs(Deno.args)

  const inputPath = args.input
  if (!inputPath) {
    console.error('Error: --input <path-to-summary.json> is required')
    Deno.exit(1)
  }

  const outputPath = args.output ?? inputPath.replace(/\.json$/, '.pdf')

  console.log(`Converting: ${inputPath} → ${outputPath}`)
  const text = await Deno.readTextFile(inputPath)
  const summary = JSON.parse(text) as PageSummary
  await generatePDF(summary, outputPath)
}

main()
