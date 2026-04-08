/**
 * OpenAI API integration with retry logic for FAQ generation
 */

import type { OpenAIConfig } from './types.ts'
import { OPENAI_CONFIG, getOpenAIModel } from './config.ts'
import { sleep } from './utils.ts'

/**
 * Retries a fetch operation with exponential backoff
 */
async function fetchWithRetry(
    url: string,
    options: RequestInit,
    maxRetries: number = OPENAI_CONFIG.MAX_RETRIES
): Promise<Response> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options)

            // Retry on rate limit (429) or server errors (5xx)
            if (response.status === 429 || response.status >= 500) {
                if (attempt < maxRetries) {
                    const delay = OPENAI_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
                    console.warn(`OpenAI request failed with status ${response.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
                    await sleep(delay)
                    continue
                }
            }

            return response
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error))
            
            if (attempt < maxRetries) {
                const delay = OPENAI_CONFIG.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
                console.warn(`OpenAI request failed: ${lastError.message}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`)
                await sleep(delay)
            }
        }
    }

    throw lastError || new Error('OpenAI request failed after retries')
}

/**
 * Calls OpenAI Responses API with web search
 */
export async function callOpenAIResponses(
    apiKey: string,
    prompt: string,
    model?: string
): Promise<string> {
    const selectedModel = model || getOpenAIModel()
    
    console.log(`Calling OpenAI Responses API with model: ${selectedModel}`)

    const response = await fetchWithRetry('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: selectedModel,
            tools: [{ type: 'web_search_preview' }],
            input: prompt
        })
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('OpenAI Responses API error:', error)
        throw new Error(`OpenAI Responses API error: ${response.status}`)
    }

    const result = await response.json()

    // Extract text content from response
    let textContent = ''
    if (result.output) {
        for (const item of result.output) {
            if (item.type === 'message' && item.content) {
                for (const content of item.content) {
                    if (content.type === 'output_text') {
                        textContent += content.text + '\n'
                    }
                }
            }
        }
    }

    console.log(`OpenAI Responses API completed. Content length: ${textContent.length} chars`)
    return textContent
}

/**
 * Calls OpenAI Chat Completions API
 */
export async function callOpenAIChat(
    apiKey: string,
    systemPrompt: string,
    userPrompt: string,
    options: {
        model?: string
        temperature?: number
        maxTokens?: number
        responseFormat?: 'text' | 'json_object'
    } = {}
): Promise<string> {
    const {
        model = getOpenAIModel(),
        temperature = 0.7,
        maxTokens = 8000,
        responseFormat = 'json_object'
    } = options

    console.log(`Calling OpenAI Chat API with model: ${model}, temp: ${temperature}`)

    const requestBody: Record<string, unknown> = {
        model,
        messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ],
        temperature,
        max_tokens: maxTokens
    }

    if (responseFormat === 'json_object') {
        requestBody.response_format = { type: 'json_object' }
    }

    const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
    })

    if (!response.ok) {
        const error = await response.json()
        console.error('OpenAI Chat API error:', error)
        throw new Error(`OpenAI Chat API error: ${response.status}`)
    }

    const result = await response.json()
    const content = result.choices?.[0]?.message?.content || ''

    console.log(`OpenAI Chat API completed. Response length: ${content.length} chars`)
    return content
}
