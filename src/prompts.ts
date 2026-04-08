/**
 * Prompt templates for FAQ generation
 */

/**
 * Prompt for generating FAQ categories based on business type
 */
export const CATEGORIES_PROMPT = `You are an expert at organizing FAQ content for businesses.

Business Type: {{businessType}}
{{businessContext}}

Generate 8-12 relevant FAQ categories for this type of business. Categories should:
- Cover common customer questions
- Be specific to the business type
- Be concise (2-4 words each)
- Be practical and actionable

Return ONLY a JSON object with a "categories" array:
{"categories": ["Category 1", "Category 2", ...]}`

/**
 * Prompt for researching a business using web search
 */
export const RESEARCH_PROMPT = `Research the {{businessType}} "{{organizationName}}" with website {{websiteUrl}}. 

IMPORTANT: Thoroughly navigate and crawl ALL pages on this website including:
- Homepage
- About/About Us pages
- Services/Treatments pages (visit each service detail page)
- Team/Staff/Doctors pages
- Locations pages
- Contact pages
- FAQ pages if they exist
- Patient resources/forms pages
- Any blog or news sections

For each page you visit, extract detailed information. Please gather comprehensive information about this business including:

1. **Business Overview**: Name, location(s), years in business, mission/values
2. **Services Offered**: List ALL services and specialties with details from each service page
3. **Staff & Team**: Names, titles, specialties, and credentials of ALL team members
4. **Operating Hours**: Hours and days of operation for each location
5. **Pricing & Payment**: Payment options, pricing structure, insurance accepted, payment plans
6. **Customer Experience**: What makes this business unique, customer reviews highlights, testimonials
7. **Technology & Features**: Any special technology, equipment, or features mentioned
8. **Emergency/Urgent Services**: Availability of emergency or urgent services
9. **New Customer Information**: Onboarding process, first visit expectations, new patient forms
10. **Contact Information**: SPECIFIC phone numbers for EACH location (include area code and full number), email addresses, physical addresses, online booking availability

CRITICAL: When you find contact information, extract the EXACT phone numbers for each location. Include these phone numbers in your summary so they can be referenced in FAQ answers.

Be thorough and visit as many pages as possible to gather complete information. Summarize your findings in a detailed, structured format with specific details from each page visited.`

/**
 * System prompt for generating business-specific FAQs
 */
export const BUSINESS_FAQ_SYSTEM_PROMPT = `You are an expert at creating FAQ content for businesses. Your task is to generate FAQs that:

1. Are specifically tailored to this business based on the provided information
2. Are written in a conversational, customer-friendly tone
3. Have answers suitable for voice AI to speak aloud
4. Cover practical information customers would actually ask about
5. Include specific details from the business (names, services, hours, phone numbers, etc.)
6. Use the provided categories to organize the FAQs
7. Follow the specified answer length guideline: {{wordingGuideline}}

IMPORTANT: 
- Answers must be natural-sounding when spoken. Avoid long lists or complex explanations.
- When providing contact information, ALWAYS include the specific phone number(s) from the business research.
- For location-specific questions, include the phone number for that specific location.`

/**
 * User prompt for generating business-specific FAQs
 */
export const BUSINESS_FAQ_USER_PROMPT = `Based on this information about "{{organizationName}}" (a {{businessType}}), generate exactly {{targetCount}} FAQs:

{{businessInfo}}

Focus on these categories:
{{categories}}

Answer length guideline: {{wordingGuideline}}

Return a JSON object with a "faqs" array containing exactly {{targetCount}} FAQ objects:
{
  "faqs": [
    {
      "question": "The question a customer might ask",
      "answer": "A conversational answer following the length guideline",
      "category": "One of the categories listed above"
    }
  ]
}

You MUST return exactly {{targetCount}} FAQs in the faqs array.`

/**
 * System prompt for customizing generic FAQs
 */
export const CUSTOMIZE_FAQ_SYSTEM_PROMPT = `You are customizing generic FAQs for a specific business. 
Personalize each FAQ by:
1. Adding the business name where appropriate
2. Incorporating any specific details from the business info
3. Following the specified answer length guideline: {{wordingGuideline}}
4. Maintaining a friendly, conversational tone suitable for voice AI

If the business info doesn't have relevant details for a question, keep the generic answer but make it sound natural.`

/**
 * User prompt for customizing generic FAQs
 */
export const CUSTOMIZE_FAQ_USER_PROMPT = `Business: "{{organizationName}}"

Business Information:
{{businessInfo}}

Answer length guideline: {{wordingGuideline}}

Customize these {{faqCount}} generic FAQs for this business:
{{selectedFaqs}}

Return a JSON object with a "faqs" array containing exactly {{faqCount}} customized FAQ objects:
{
  "faqs": [
    {
      "question": "Customized question",
      "answer": "Customized answer following the length guideline",
      "category": "Category"
    }
  ]
}

You MUST return exactly {{faqCount}} FAQs in the faqs array.`

/**
 * System prompt for verifying FAQs
 */
export const VERIFY_FAQ_SYSTEM_PROMPT = `You are a fact-checker verifying FAQ answers against source information.

For each FAQ, determine if the answer is:
1. VERIFIED - The answer is accurate based on the provided business information
2. UNVERIFIED - The answer contains information not found in or contradicting the source

Be strict: Only mark as VERIFIED if the specific facts in the answer can be confirmed from the source.`

/**
 * User prompt for verifying FAQs
 */
export const VERIFY_FAQ_USER_PROMPT = `Business: "{{organizationName}}"

Source Information:
{{businessInfo}}

Verify these FAQs:
{{faqs}}

Return a JSON object with a "results" array:
{
  "results": [
    { "id": 0, "verified": true },
    { "id": 1, "verified": false }
  ]
}`
