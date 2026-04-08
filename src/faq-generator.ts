/**
 * Core FAQ generation library
 * Provides high-level functions for generating dental practice FAQs
 */

import type { FaqItem, BusinessResearch, FaqGenerationOptions, FaqGenerationResult } from './types.ts'
import { FAQ_DEFAULTS, OPENAI_CONFIG, WORDING_GUIDELINES } from './config.ts'
import { parseOpenAIFaqResponse, deduplicateFaqs } from './utils.ts'
import { callOpenAIResponses, callOpenAIChat } from './openai.ts'
import {
    CATEGORIES_PROMPT,
    RESEARCH_PROMPT,
    BUSINESS_FAQ_SYSTEM_PROMPT,
    BUSINESS_FAQ_USER_PROMPT,
    CUSTOMIZE_FAQ_SYSTEM_PROMPT,
    CUSTOMIZE_FAQ_USER_PROMPT,
    VERIFY_FAQ_SYSTEM_PROMPT,
    VERIFY_FAQ_USER_PROMPT
} from './prompts.ts'

/**
 * Generates relevant FAQ categories for a business type using AI
 */
export async function generateCategories(
    apiKey: string,
    businessType: string,
    businessInfo?: string
): Promise<string[]> {
    console.log(`Generating categories for ${businessType} business`)

    const prompt = CATEGORIES_PROMPT
        .replace('{{businessType}}', businessType)
        .replace('{{businessContext}}', businessInfo
            ? `\nBusiness Context:\n${businessInfo.substring(0, 500)}`
            : '')

    try {
        const content = await callOpenAIChat(
            apiKey,
            'You are a business FAQ categorization expert.',
            prompt,
            {
                temperature: OPENAI_CONFIG.TEMPERATURE.CATEGORIES,
                maxTokens: OPENAI_CONFIG.MAX_TOKENS.CATEGORIES,
                responseFormat: 'json_object'
            }
        )

        const parsed = JSON.parse(content)
        const categories = parsed.categories || parsed.items || Object.values(parsed)[0]

        if (Array.isArray(categories)) {
            const validCategories = categories.filter(c => typeof c === 'string')
            console.log(`Generated ${validCategories.length} categories: ${validCategories.join(', ')}`)
            return validCategories
        }

        console.warn('No valid categories found in response')
        return []
    } catch (error) {
        console.error('Error generating categories:', error)
        return []
    }
}

/**
 * Researches a business using OpenAI web search
 */
export async function researchBusiness(
    apiKey: string,
    organizationName: string,
    websiteUrl: string,
    businessType: string
): Promise<BusinessResearch> {
    console.log(`Researching business: ${organizationName} (${businessType}) at ${websiteUrl}`)

    const prompt = RESEARCH_PROMPT
        .replace('{{businessType}}', businessType)
        .replace('{{organizationName}}', organizationName)
        .replace('{{websiteUrl}}', websiteUrl)

    const content = await callOpenAIResponses(apiKey, prompt)

    return {
        summary: content,
        rawContent: content
    }
}

/**
 * Generates business-specific FAQs based on research
 */
export async function generateBusinessFaqs(
    apiKey: string,
    organizationName: string,
    businessType: string,
    businessInfo: string,
    targetCount: number,
    categories: string[],
    wordingGuideline: string,
    previousQuestions: string[] = []
): Promise<FaqItem[]> {
    console.log(`Generating ${targetCount} business-specific FAQs for ${organizationName} (${businessType})`)

    const previousQuestionsBlock = previousQuestions.length > 0
        ? `IMPORTANT: Do NOT generate any of these already-existing questions or close variations of them:\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
        : ''

    const userPrompt = BUSINESS_FAQ_USER_PROMPT
        .replace(/\{\{organizationName\}\}/g, organizationName)
        .replace('{{businessType}}', businessType)
        .replace(/\{\{targetCount\}\}/g, targetCount.toString())
        .replace('{{businessInfo}}', businessInfo)
        .replace('{{categories}}', categories.join(', '))
        .replace('{{wordingGuideline}}', wordingGuideline)
        .replace('{{previousQuestions}}', previousQuestionsBlock)

    const systemPrompt = BUSINESS_FAQ_SYSTEM_PROMPT
        .replace('{{wordingGuideline}}', wordingGuideline)

    const content = await callOpenAIChat(
        apiKey,
        systemPrompt,
        userPrompt,
        {
            temperature: OPENAI_CONFIG.TEMPERATURE.BUSINESS_FAQ,
            maxTokens: OPENAI_CONFIG.MAX_TOKENS.BUSINESS_FAQ,
            responseFormat: 'json_object'
        }
    )

    const faqs = parseOpenAIFaqResponse(content)
    console.log(`Parsed ${faqs.length} business-specific FAQs`)

    return faqs.map((faq) => ({
        question: faq.question || '',
        answer: faq.answer || '',
        category: faq.category || 'General',
        source: 'business_specific' as const
    })).filter(faq => faq.question && faq.answer)
}

/**
 * Customizes generic dental FAQs with business-specific information
 */
export async function customizeGenericFaqs(
    apiKey: string,
    organizationName: string,
    businessInfo: string,
    genericFaqs: FaqItem[],
    count: number,
    wordingGuideline: string
): Promise<FaqItem[]> {
    console.log(`Customizing ${count} generic FAQs for ${organizationName}`)

    const selectedFaqs = genericFaqs.slice(0, count)

    const systemPrompt = CUSTOMIZE_FAQ_SYSTEM_PROMPT
        .replace('{{wordingGuideline}}', wordingGuideline)

    const userPrompt = CUSTOMIZE_FAQ_USER_PROMPT
        .replace('{{organizationName}}', organizationName)
        .replace('{{businessInfo}}', businessInfo)
        .replace(/\{\{faqCount\}\}/g, selectedFaqs.length.toString())
        .replace('{{selectedFaqs}}', JSON.stringify(selectedFaqs, null, 2))
        .replace('{{wordingGuideline}}', wordingGuideline)

    try {
        const content = await callOpenAIChat(
            apiKey,
            systemPrompt,
            userPrompt,
            {
                temperature: OPENAI_CONFIG.TEMPERATURE.CUSTOMIZE,
                maxTokens: OPENAI_CONFIG.MAX_TOKENS.CUSTOMIZE,
                responseFormat: 'json_object'
            }
        )

        const faqs = parseOpenAIFaqResponse(content)
        console.log(`Parsed ${faqs.length} customized generic FAQs`)

        return faqs.map((faq) => ({
            question: faq.question || '',
            answer: faq.answer || '',
            category: faq.category || 'General',
            source: 'generic' as const
        })).filter(faq => faq.question && faq.answer)
    } catch (error) {
        console.error('Error customizing generic FAQs, returning originals:', error)
        return selectedFaqs
    }
}

/**
 * Verifies FAQs against the original business research
 */
export async function verifyFaqs(
    apiKey: string,
    organizationName: string,
    businessInfo: string,
    faqs: FaqItem[]
): Promise<FaqItem[]> {
    console.log(`Verifying ${faqs.length} FAQs for ${organizationName}`)

    // Only verify business-specific FAQs (generic ones are pre-verified)
    const businessFaqs = faqs.filter(f => f.source === 'business_specific')
    const genericFaqs = faqs.filter(f => f.source === 'generic').map(f => ({ ...f, verified: true }))

    if (businessFaqs.length === 0) {
        return [...genericFaqs]
    }

    try {
        const userPrompt = VERIFY_FAQ_USER_PROMPT
            .replace('{{organizationName}}', organizationName)
            .replace('{{businessInfo}}', businessInfo)
            .replace('{{faqs}}', JSON.stringify(
                businessFaqs.map((f, i) => ({ id: i, question: f.question, answer: f.answer })),
                null,
                2
            ))

        const content = await callOpenAIChat(
            apiKey,
            VERIFY_FAQ_SYSTEM_PROMPT,
            userPrompt,
            {
                temperature: OPENAI_CONFIG.TEMPERATURE.VERIFY,
                maxTokens: OPENAI_CONFIG.MAX_TOKENS.VERIFY,
                responseFormat: 'json_object'
            }
        )

        const parsed = JSON.parse(content)
        const results = parsed.results || []

        const verifiedBusinessFaqs = businessFaqs.map((faq, index) => {
            const verification = results.find((r: { id: number; verified: boolean }) => r.id === index)
            return { ...faq, verified: verification?.verified ?? false }
        })

        const verifiedCount = verifiedBusinessFaqs.filter(f => f.verified).length
        console.log(`Verified ${verifiedCount}/${businessFaqs.length} business-specific FAQs`)

        return [...verifiedBusinessFaqs, ...genericFaqs]
    } catch (error) {
        console.error('Error verifying FAQs, marking all as unverified:', error)
        return [...businessFaqs.map(f => ({ ...f, verified: false })), ...genericFaqs]
    }
}

/**
 * Main function to generate FAQs for a dental practice
 * This is the high-level API that orchestrates the entire FAQ generation pipeline
 */
export async function generateFaqs(
    apiKey: string,
    organizationName: string,
    websiteUrl: string,
    genericFaqs: FaqItem[],
    options: FaqGenerationOptions
): Promise<FaqGenerationResult> {
    const {
        businessType,
        totalCount = FAQ_DEFAULTS.TOTAL_FAQ_COUNT,
        businessSpecificRatio = FAQ_DEFAULTS.BUSINESS_SPECIFIC_RATIO,
        verify = FAQ_DEFAULTS.VERIFY_FAQS,
        wordingLevel = FAQ_DEFAULTS.WORDING_LEVEL,
        deduplicate = FAQ_DEFAULTS.DEDUPLICATE,
        categories: providedCategories
    } = options

    const wordingGuideline = WORDING_GUIDELINES[wordingLevel]

    console.log(`Starting FAQ generation for ${organizationName} (${businessType})`)
    console.log(`Target: ${totalCount} FAQs (${Math.floor(businessSpecificRatio * 100)}% business-specific)`)

    // Calculate FAQ distribution
    const businessSpecificCount = Math.floor(totalCount * businessSpecificRatio)
    const genericCount = totalCount - businessSpecificCount

    // Step 1: Research the business
    console.log('Step 1/5: Researching business...')
    const research = await researchBusiness(apiKey, organizationName, websiteUrl, businessType)

    // Step 2: Generate categories (if not provided)
    let categories = providedCategories
    if (!categories || categories.length === 0) {
        console.log('Step 2/5: Generating categories...')
        categories = await generateCategories(apiKey, businessType, research.summary)

        if (categories.length === 0) {
            throw new Error('Failed to generate categories for business type. Please provide custom categories or try again.')
        }
    } else {
        console.log('Step 2/5: Using provided categories')
    }

    // Step 3: Generate business-specific FAQs
    console.log('Step 3/5: Generating business-specific FAQs...')
    const businessFaqs = await generateBusinessFaqs(
        apiKey,
        organizationName,
        businessType,
        research.summary,
        businessSpecificCount,
        categories,
        wordingGuideline
    )

    // Step 4: Customize generic FAQs
    console.log('Step 4/5: Customizing generic FAQs...')
    const customizedGenericFaqs = await customizeGenericFaqs(
        apiKey,
        organizationName,
        research.summary,
        genericFaqs,
        genericCount,
        wordingGuideline
    )

    // Combine all FAQs
    let allFaqs = [...businessFaqs, ...customizedGenericFaqs]

    // Step 5: Verify FAQs (optional)
    if (verify) {
        console.log('Step 5/5: Verifying FAQs...')
        allFaqs = await verifyFaqs(
            apiKey,
            organizationName,
            research.summary,
            allFaqs
        )
    } else {
        console.log('Step 5/5: Skipping verification (disabled)')
        allFaqs = allFaqs.map(f => ({ ...f, verified: f.source === 'generic' }))
    }

    // Step 6: Deduplicate FAQs (optional)
    let finalFaqs = allFaqs
    if (deduplicate) {
        console.log('Step 6/6: Deduplicating similar FAQs...')
        finalFaqs = deduplicateFaqs(allFaqs)
    } else {
        console.log('Step 6/6: Skipping deduplication (disabled)')
    }

    const verifiedCount = finalFaqs.filter(f => f.verified).length

    console.log(`FAQ generation complete: ${finalFaqs.length} FAQs (${verifiedCount} verified)`)

    return {
        faqs: finalFaqs,
        totalCount: finalFaqs.length,
        verifiedCount,
        businessSummary: research.summary
    }
}
