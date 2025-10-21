import OpenAI from 'openai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const DEFAULT_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7;

/**
 * Make a completion request to OpenAI
 * @param {string} prompt - The prompt to send
 * @param {Object} options - Additional options
 * @returns {string} The completion response
 */
export async function getCompletion(prompt, options = {}) {
  try {
    const response = await openai.chat.completions.create({
      model: options.model || DEFAULT_MODEL,
      messages: [
        {
          role: 'system',
          content: options.systemPrompt || 'You are a helpful AI tutor that adapts to the learner\'s existing knowledge.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: options.temperature || DEFAULT_TEMPERATURE,
      max_tokens: options.maxTokens || 2000,
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI API Error:', error.message);
    throw new Error(`Failed to get completion: ${error.message}`);
  }
}

/**
 * Get a structured JSON response from OpenAI
 * @param {string} prompt - The prompt to send
 * @param {Object} schema - Expected JSON schema
 * @param {Object} options - Additional options
 * @returns {Object} Parsed JSON response
 */
export async function getJSONCompletion(prompt, schema, options = {}) {
  const systemPrompt = `You are a helpful AI tutor. Respond with valid JSON that matches this schema: ${JSON.stringify(schema)}. Do not include any text outside the JSON.`;
  
  const response = await getCompletion(prompt, {
    ...options,
    systemPrompt,
    temperature: 0.3 // Lower temperature for more consistent JSON
  });

  try {
    // Clean the response by removing markdown code blocks if present
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    return JSON.parse(cleanResponse);
  } catch (error) {
    console.error('Failed to parse JSON response:', response);
    throw new Error('Invalid JSON response from AI');
  }
}

/**
 * Check if OpenAI API key is configured
 * @returns {boolean} True if API key is available
 */
export function isConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Get the configured model name
 * @returns {string} Model name
 */
export function getModel() {
  return DEFAULT_MODEL;
}
