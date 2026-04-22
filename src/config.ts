/**
 * Configuration constants for FAQ generation
 */

/**
 * Default FAQ generation settings
 */
export const FAQ_DEFAULTS = {
    TOTAL_FAQ_COUNT: 75,
    BUSINESS_SPECIFIC_RATIO: 0.7, // 70% business-specific, 30% generic
    VERIFY_FAQS: true,
    WORDING_LEVEL: 'medium' as const,
    DEDUPLICATE: true
} as const

/**
 * Wording level guidelines for FAQ answers
 */
export const WORDING_GUIDELINES = {
    short: '1-2 sentences maximum, extremely concise',
    medium: '2-3 sentences, conversational and clear',
    long: '3-4 sentences, detailed and comprehensive'
} as const

/**
 * OpenAI API settings
 */
export const OPENAI_CONFIG = {
    DEFAULT_MODEL: 'gpt-4o',
    MAX_RETRIES: 3,
    INITIAL_RETRY_DELAY_MS: 1000,
    TIMEOUT_MS: 120000, // 2 minutes
    TEMPERATURE: {
        RESEARCH: 0.7,
        BUSINESS_FAQ: 0.7,
        CUSTOMIZE: 0.5,
        VERIFY: 0.1,
        CATEGORIES: 0.3
    },
    MAX_TOKENS: {
        RESEARCH: 4000,
        BUSINESS_FAQ: 8000,
        CUSTOMIZE: 8000,
        VERIFY: 4000,
        CATEGORIES: 500
    }
} as const

/**
 * Category priority order for sorting FAQs
 */
export const CATEGORY_ORDER = [
    'Practice Information',
    'Staff',
    'Staff & Dentists',
    'Services',
    'Services & Procedures',
    'New Patients',
    'Appointments',
    'Appointments & Scheduling',
    'Emergency Care',
    'Insurance & Payment',
    'Preventive Care',
    'Restorative',
    'Cosmetic',
    'Orthodontics',
    'Comfort',
    'General'
] as const

/**
 * Gets the OpenAI model from environment or uses default
 */
export function getOpenAIModel(): string {
    return Deno.env.get('OPENAI_MODEL') || OPENAI_CONFIG.DEFAULT_MODEL
}
