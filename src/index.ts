/**
 * FAQ Generation Library
 * 
 * A lower-level library for generating customized dental practice FAQs
 * using OpenAI's API with web search capabilities.
 * 
 * @example
 * ```typescript
 * import { generateFaqs } from './src/index.ts'
 * 
 * const result = await generateFaqs(
 *   Deno.env.get('OPENAI_API_KEY')!,
 *   'ABC Dental Care',
 *   'https://www.abcdentalcare.com',
 *   genericFaqs,
 *   { totalCount: 75, verify: true }
 * )
 * ```
 */

// Export types
export type {
    FaqItem,
    BusinessResearch,
    FaqGenerationOptions,
    FaqGenerationResult,
    OpenAIConfig,
    PageSummary,
    WordingLevel
} from './types.ts'

// Export configuration
export {
    FAQ_DEFAULTS,
    OPENAI_CONFIG,
    CATEGORY_ORDER,
    WORDING_GUIDELINES,
    getOpenAIModel
} from './config.ts'

// Export utilities
export {
    validateFaqRequest,
    parseOpenAIFaqResponse,
    faqsToCSV,
    sortFaqsByCategory,
    isValidUrl,
    deduplicateFaqs
} from './utils.ts'

// Export prompts (for customization if needed)
export {
    RESEARCH_PROMPT,
    BUSINESS_FAQ_SYSTEM_PROMPT,
    BUSINESS_FAQ_USER_PROMPT,
    CUSTOMIZE_FAQ_SYSTEM_PROMPT,
    CUSTOMIZE_FAQ_USER_PROMPT,
    VERIFY_FAQ_SYSTEM_PROMPT,
    VERIFY_FAQ_USER_PROMPT
} from './prompts.ts'

// Export OpenAI functions (for advanced usage)
export {
    callOpenAIResponses,
    callOpenAIChat
} from './openai.ts'

// Export core FAQ generation functions
export {
    generateCategories,
    researchBusiness,
    summarizePage,
    generateBusinessFaqs,
    customizeGenericFaqs,
    verifyFaqs,
    generateFaqs
} from './faq-generator.ts'
