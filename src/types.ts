/**
 * Type definitions for FAQ generation library
 */

/**
 * Interface for a single FAQ item
 */
export interface FaqItem {
    question: string
    answer: string
    category: string
    source: 'business_specific' | 'generic'
    verified?: boolean
}

/**
 * Business research result
 */
export interface BusinessResearch {
    summary: string
    rawContent: string
}

/**
 * Response wording level for FAQ answers
 */
export type WordingLevel = 'short' | 'medium' | 'long'

/**
 * FAQ generation options
 */
export interface FaqGenerationOptions {
    /** Business type (e.g., 'dental office', 'restaurant', 'law firm') - REQUIRED */
    businessType: string
    /** Total number of FAQs to generate */
    totalCount?: number
    /** Percentage of business-specific FAQs (0-1) */
    businessSpecificRatio?: number
    /** Whether to verify FAQs against source */
    verify?: boolean
    /** Custom categories to focus on (if not provided, will be auto-generated) */
    categories?: string[]
    /** Response wording level: 'short' (1-2 sentences), 'medium' (2-3 sentences), 'long' (3-4 sentences) */
    wordingLevel?: WordingLevel
    /** Whether to deduplicate similar questions (default: true) */
    deduplicate?: boolean
}

/**
 * FAQ generation result
 */
export interface FaqGenerationResult {
    faqs: FaqItem[]
    totalCount: number
    verifiedCount: number
    businessSummary: string
}

/**
 * OpenAI API configuration
 */
export interface OpenAIConfig {
    apiKey: string
    model?: string
    maxRetries?: number
    timeout?: number
}
