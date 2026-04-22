#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Converts a FAQ CSV file to a formatted PDF.
 *
 * Usage:
 *   deno task pdf                                        # converts most recent CSV in output/
 *   deno task pdf --input output/my-faqs.csv            # specific file
 *   deno task pdf --input output/my-faqs.csv --output ~/Downloads/my-faqs.pdf
 */

// @deno-types="npm:@types/pdfkit"
import PDFDocument from 'npm:pdfkit'

// ─── Types ─────────────────────────────────────────────────────────────────────

interface FaqRow {
  number: number
  category: string
  source: string
  verified: boolean
  organization: string
  question: string
  answer: string
}

// ─── CSV Parser ────────────────────────────────────────────────────────────────

function parseCSV(text: string): FaqRow[] {
  const lines = text.trim().split('\n')
  const rows: FaqRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i])
    if (cols.length < 7) continue
    rows.push({
      number:       parseInt(cols[0], 10),
      category:     cols[1],
      source:       cols[2],
      verified:     cols[3].toLowerCase() === 'yes',
      organization: cols[4],
      question:     cols[5],
      answer:       cols[6],
    })
  }

  return rows
}

function splitCSVLine(line: string): string[] {
  const cols: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cols.push(current)
  return cols
}

// ─── PDF Generation ────────────────────────────────────────────────────────────

async function generatePDF(rows: FaqRow[], outputPath: string, url?: string): Promise<void> {
  const doc = new PDFDocument({ margin: 55, size: 'LETTER' })
  const chunks: Buffer[] = []

  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  const org = rows[0]?.organization ?? 'FAQ Document'
  const M = 55
  const W = doc.page.width - M * 2

  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const sourceLine = url ? `Source: ${url}  ·  Generated: ${date}` : `Generated: ${date}`

  // Title
  doc.font('Helvetica-Bold').fontSize(16).fillColor('#000000').text(org, M, M)
  doc.font('Helvetica').fontSize(11).fillColor('#555555').text('Frequently Asked Questions')
  doc.font('Helvetica').fontSize(9).fillColor('#888888').text(sourceLine)
  doc.moveDown(1)

  for (const faq of rows) {
    const spaceLeft = doc.page.height - doc.page.margins.bottom - doc.y
    if (spaceLeft < 50) doc.addPage()

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000000')
      .text(`${faq.number}. ${faq.question}`, M, doc.y, { width: W })

    doc.font('Helvetica').fontSize(10).fillColor('#333333')
      .text(faq.answer, M, doc.y + 2, { width: W })

    doc.moveDown(0.8)
  }

  doc.end()
  await new Promise<void>((resolve) => doc.on('end', resolve))

  const totalLength = chunks.reduce((n, c) => n + c.length, 0)
  const pdf = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) { pdf.set(chunk, offset); offset += chunk.length }

  await Deno.writeFile(outputPath, pdf)
  console.log(`\n📄 PDF saved to: ${outputPath} (${rows.length} FAQs)\n`)
}

// ─── CLI ───────────────────────────────────────────────────────────────────────

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

async function findLatestCSV(): Promise<string | null> {
  try {
    const entries: { name: string; mtime: Date | null }[] = []
    for await (const entry of Deno.readDir('output')) {
      if (entry.isFile && entry.name.endsWith('.csv')) {
        const stat = await Deno.stat(`output/${entry.name}`)
        entries.push({ name: entry.name, mtime: stat.mtime })
      }
    }
    if (entries.length === 0) return null
    entries.sort((a, b) => (b.mtime?.getTime() ?? 0) - (a.mtime?.getTime() ?? 0))
    return `output/${entries[0].name}`
  } catch {
    return null
  }
}

async function main() {
  const args = parseArgs(Deno.args)

  const inputPath = args.input ?? await findLatestCSV()
  if (!inputPath) {
    console.error('Error: no CSV file found. Use --input <path>')
    Deno.exit(1)
  }

  const outputPath = args.output ?? inputPath.replace(/\.csv$/, '.pdf')

  console.log(`Converting: ${inputPath} → ${outputPath}`)

  const text = await Deno.readTextFile(inputPath)
  const rows = parseCSV(text)

  if (rows.length === 0) {
    console.error('Error: no rows parsed from CSV')
    Deno.exit(1)
  }

  await generatePDF(rows, outputPath, args.url)
}

main()
