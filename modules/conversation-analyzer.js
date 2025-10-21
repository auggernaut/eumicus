import { getJSONCompletion } from './openai-client.js';
import { loadMemory, saveMemory, addConversationLearning } from './memory.js';

/**
 * Analyze a conversation to extract learning insights
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - The assistant's response
 * @param {string} conversationContext - Additional context about the conversation
 * @returns {Object} Analysis results with learning insights
 */
export async function analyzeConversation(userMessage, assistantResponse, conversationContext = '') {
  try {
    const memory = await loadMemory();
    const existingConcepts = memory.concepts.map(c => c.name.toLowerCase());
    
    const prompt = `
Analyze this conversation to identify any learning insights that should be captured in memory.

USER MESSAGE: ${userMessage}

ASSISTANT RESPONSE: ${assistantResponse}

CONVERSATION CONTEXT: ${conversationContext}

EXISTING CONCEPTS (don't repeat these): ${existingConcepts.join(', ')}

Identify if this conversation contains:
1. New concepts or ideas worth remembering
2. Specific insights or learnings
3. Practical knowledge or techniques
4. Connections between different topics
5. Personal experiences or discoveries

If there are learnings to capture, provide:
- Main topic/concept name
- Detailed description of what was learned
- Source (e.g., "chat conversation", "discussion", "exploration")
- Related concepts or connections

If no significant learning occurred, respond with null.

Respond with JSON object or null.
`;

    const schema = {
      hasLearning: "boolean",
      topic: "string (if hasLearning is true)",
      description: "string (if hasLearning is true)", 
      source: "string (if hasLearning is true)",
      connections: "array of strings (if hasLearning is true)",
      confidence: "number between 0 and 1 (if hasLearning is true)"
    };

    const analysis = await getJSONCompletion(prompt, schema);
    
    // Handle case where analysis is null or invalid
    if (!analysis || typeof analysis !== 'object') {
      return { hasLearning: false };
    }
    
    return analysis;
    
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    return { hasLearning: false };
  }
}

/**
 * Automatically capture learning from conversation
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - The assistant's response
 * @param {string} conversationContext - Additional context
 * @returns {Object} Capture results
 */
export async function autoCaptureLearning(userMessage, assistantResponse, conversationContext = '') {
  try {
    // Analyze the conversation
    const analysis = await analyzeConversation(userMessage, assistantResponse, conversationContext);
    
    if (!analysis.hasLearning) {
      return { captured: false, reason: 'No significant learning detected' };
    }
    
    // Load memory and add the learning
    const memory = await loadMemory();
    
    addConversationLearning(
      memory,
      analysis.topic,
      analysis.description,
      analysis.source || 'chat conversation',
      analysis.connections || []
    );
    
    // Save updated memory
    await saveMemory(memory);
    
    return {
      captured: true,
      topic: analysis.topic,
      confidence: analysis.confidence,
      memoryUpdated: true
    };
    
  } catch (error) {
    console.error('Error auto-capturing learning:', error);
    return { captured: false, error: error.message };
  }
}

/**
 * Update session with conversation data
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - The assistant's response
 * @param {Object} sessionData - Current session data
 * @returns {Object} Updated session data
 */
export function updateSessionWithConversation(userMessage, assistantResponse, sessionData = {}) {
  if (!sessionData.conversations) {
    sessionData.conversations = [];
  }
  
  const conversationEntry = {
    timestamp: new Date().toISOString(),
    userMessage,
    assistantResponse,
    messageLength: userMessage.length + assistantResponse.length
  };
  
  sessionData.conversations.push(conversationEntry);
  sessionData.lastActivity = new Date().toISOString();
  sessionData.totalMessages = (sessionData.totalMessages || 0) + 1;
  
  return sessionData;
}

/**
 * Get conversation summary for session
 * @param {Object} sessionData - Session data with conversations
 * @returns {Object} Conversation summary
 */
export function getConversationSummary(sessionData) {
  if (!sessionData.conversations || sessionData.conversations.length === 0) {
    return { message: 'No conversations recorded' };
  }
  
  const conversations = sessionData.conversations;
  const totalMessages = conversations.length;
  const totalLength = conversations.reduce((sum, conv) => sum + conv.messageLength, 0);
  const avgMessageLength = Math.round(totalLength / totalMessages);
  
  const startTime = new Date(conversations[0].timestamp);
  const endTime = new Date(conversations[conversations.length - 1].timestamp);
  const duration = Math.round((endTime - startTime) / 60000); // minutes
  
  return {
    totalMessages,
    totalLength,
    avgMessageLength,
    duration,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString()
  };
}
