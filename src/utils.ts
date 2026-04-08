/**
 * Utility functions for FAQ generation
 */

import type { FaqItem } from './types.ts'
import { CATEGORY_ORDER } from './config.ts'

/**
 * Calculates similarity between two strings using a simple word overlap metric
 * Returns a score between 0 (no similarity) and 1 (identical)
 */
function calculateSimilarity(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 2)
    const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 2)

    if (words1.length === 0 || words2.length === 0) return 0

    const set1 = new Set(words1)
    const set2 = new Set(words2)

    const intersection = new Set([...set1].filter(x => set2.has(x)))
    const union = new Set([...set1, ...set2])

    return intersection.size / union.size
}

/**
 * Deduplicates FAQs by detecting similar questions
 * Keeps the FAQ with the longer/better answer when duplicates are found
 */
export function deduplicateFaqs(faqs: FaqItem[], similarityThreshold: number = 0.6): FaqItem[] {
    if (faqs.length === 0) return faqs

    const deduplicated: FaqItem[] = []
    const skipIndices = new Set<number>()

    for (let i = 0; i < faqs.length; i++) {
        if (skipIndices.has(i)) continue

        let bestFaq = faqs[i]

        // Check for similar questions in remaining FAQs
        for (let j = i + 1; j < faqs.length; j++) {
            if (skipIndices.has(j)) continue

            const similarity = calculateSimilarity(faqs[i].question, faqs[j].question)

            if (similarity >= similarityThreshold) {
                // Found duplicate - keep the one with longer answer or verified status
                const currentBetter = faqs[j].answer.length > bestFaq.answer.length ||
                    (faqs[j].verified && !bestFaq.verified)

                if (currentBetter) {
                    bestFaq = faqs[j]
                }

                skipIndices.add(j)
                console.log(`Deduplicated: "${faqs[i].question}" ↔ "${faqs[j].question}" (similarity: ${similarity.toFixed(2)})`)
            }
        }

        deduplicated.push(bestFaq)
    }

    const removedCount = faqs.length - deduplicated.length
    if (removedCount > 0) {
        console.log(`Removed ${removedCount} duplicate FAQ(s)`)
    }

    return deduplicated
}

/**
 * Sleeps for the specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Validates a URL format
 */
export function isValidUrl(url: string): boolean {
    try {
        const parsed = new URL(url)
        return parsed.protocol === 'http:' || parsed.protocol === 'https:'
    } catch {
        return false
    }
}

/**
 * Validates FAQ generation request parameters
 */
export function validateFaqRequest(
    organizationName: string,
    websiteUrl: string,
    faqCount?: number
): { valid: boolean; error?: string } {
    if (!organizationName || typeof organizationName !== 'string' || organizationName.trim().length === 0) {
        return { valid: false, error: 'Organization name is required and must be a non-empty string' }
    }

    if (organizationName.length > 200) {
        return { valid: false, error: 'Organization name must be 200 characters or less' }
    }

    if (!websiteUrl || typeof websiteUrl !== 'string' || websiteUrl.trim().length === 0) {
        return { valid: false, error: 'Website URL is required and must be a non-empty string' }
    }

    if (!isValidUrl(websiteUrl)) {
        return { valid: false, error: 'Website URL must be a valid HTTP or HTTPS URL' }
    }

    if (faqCount !== undefined) {
        if (typeof faqCount !== 'number' || faqCount < 1 || faqCount > 200) {
            return { valid: false, error: 'FAQ count must be a number between 1 and 200' }
        }
    }

    return { valid: true }
}

/**
 * Parses OpenAI JSON response with flexible format handling
 */
export function parseOpenAIFaqResponse(content: string): Array<{ question: string; answer: string; category: string }> {
    try {
        const parsed = JSON.parse(content)
        let faqs: Array<{ question: string; answer: string; category: string }> = []

        // Handle array format
        if (Array.isArray(parsed)) {
            faqs = parsed
        }
        // Handle object with faqs property
        else if (parsed.faqs && Array.isArray(parsed.faqs)) {
            faqs = parsed.faqs
        }
        // Try to find any array property
        else if (typeof parsed === 'object') {
            for (const key of Object.keys(parsed)) {
                if (Array.isArray(parsed[key])) {
                    faqs = parsed[key]
                    break
                }
            }
        }

        return faqs.filter(faq =>
            faq &&
            typeof faq === 'object' &&
            faq.question &&
            faq.answer &&
            typeof faq.question === 'string' &&
            typeof faq.answer === 'string'
        )
    } catch (error) {
        console.error('Error parsing FAQ JSON response:', error)
        console.error('Raw content preview:', content.substring(0, 500))
        return []
    }
}

/**
 * Quotes a string for CSV format
 */
export function quoteCSV(str: string): string {
    // Escape double quotes and wrap in quotes
    const escaped = str.replace(/"/g, '""')
    // Also escape newlines and carriage returns
    const normalized = escaped.replace(/\r?\n/g, ' ')
    return `"${normalized}"`
}

/**
 * Sorts FAQs by category priority
 */
export function sortFaqsByCategory(faqs: FaqItem[]): FaqItem[] {
    return [...faqs].sort((a, b) => {
        const aIndex = CATEGORY_ORDER.findIndex(c =>
            a.category.toLowerCase().includes(c.toLowerCase())
        )
        const bIndex = CATEGORY_ORDER.findIndex(c =>
            b.category.toLowerCase().includes(c.toLowerCase())
        )
        const aPriority = aIndex === -1 ? 999 : aIndex
        const bPriority = bIndex === -1 ? 999 : bIndex
        return aPriority - bPriority
    })
}

/**
 * Converts FAQs to CSV format
 */
export function faqsToCSV(faqs: FaqItem[], organizationName: string): string {
    const sortedFaqs = sortFaqsByCategory(faqs)

    const headers = ['Number', 'Category', 'Source', 'Verified', 'Organization', 'Question', 'Answer']
    const rows = sortedFaqs.map((faq, index) => [
        quoteCSV((index + 1).toString()),
        quoteCSV(faq.category),
        quoteCSV(faq.source),
        quoteCSV(faq.verified ? 'Yes' : 'No'),
        quoteCSV(organizationName),
        quoteCSV(faq.question),
        quoteCSV(faq.answer)
    ].join(','))

    return [headers.map(h => quoteCSV(h)).join(','), ...rows].join('\n')
}
