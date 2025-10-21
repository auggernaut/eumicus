import fs from 'fs/promises';
import path from 'path';
import { autoCaptureLearning, updateSessionWithConversation, getConversationSummary } from './conversation-analyzer.js';

const CONVERSATION_SESSION_FILE = 'data/session.json';

/**
 * Load current conversation session
 * @returns {Object} Session data
 */
export async function loadConversationSession() {
  try {
    const data = await fs.readFile(CONVERSATION_SESSION_FILE, 'utf8');
    const session = JSON.parse(data);
    
    // If it's a structured learning session, convert it to conversation format
    if (session.goal && session.steps) {
      return {
        sessionId: `session-${Date.now()}`,
        startTime: session.startTime || new Date().toISOString(),
        conversations: [],
        totalMessages: 0,
        learningsCaptured: 0,
        lastActivity: new Date().toISOString(),
        originalSession: session // Keep original data
      };
    }
    
    // If it's already a conversation session, return as-is
    return session;
  } catch (error) {
    // Create new session if file doesn't exist
    return {
      sessionId: `session-${Date.now()}`,
      startTime: new Date().toISOString(),
      conversations: [],
      totalMessages: 0,
      learningsCaptured: 0,
      lastActivity: new Date().toISOString()
    };
  }
}

/**
 * Save conversation session
 * @param {Object} sessionData - Session data to save
 */
export async function saveConversationSession(sessionData) {
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(CONVERSATION_SESSION_FILE, JSON.stringify(sessionData, null, 2));
}

/**
 * Process a conversation exchange and automatically capture learnings
 * @param {string} userMessage - The user's message
 * @param {string} assistantResponse - The assistant's response
 * @param {string} context - Additional context about the conversation
 * @returns {Object} Processing results
 */
export async function processConversationExchange(userMessage, assistantResponse, context = '') {
  try {
    // Load current session
    const sessionData = await loadConversationSession();
    
    // Update session with conversation data
    const updatedSession = updateSessionWithConversation(userMessage, assistantResponse, sessionData);
    
    // Try to auto-capture learning
    const captureResult = await autoCaptureLearning(userMessage, assistantResponse, context);
    
    if (captureResult.captured) {
      updatedSession.learningsCaptured += 1;
      updatedSession.lastLearning = {
        topic: captureResult.topic,
        confidence: captureResult.confidence,
        timestamp: new Date().toISOString()
      };
    }
    
    // Save updated session
    await saveConversationSession(updatedSession);
    
    return {
      sessionUpdated: true,
      learningCaptured: captureResult.captured,
      learningDetails: captureResult.captured ? {
        topic: captureResult.topic,
        confidence: captureResult.confidence
      } : null,
      sessionSummary: getConversationSummary(updatedSession)
    };
    
  } catch (error) {
    console.error('Error processing conversation exchange:', error);
    return {
      sessionUpdated: false,
      learningCaptured: false,
      error: error.message
    };
  }
}

/**
 * Get current session status
 * @returns {Object} Session status
 */
export async function getSessionStatus() {
  try {
    const sessionData = await loadConversationSession();
    const summary = getConversationSummary(sessionData);
    
    return {
      sessionId: sessionData.sessionId,
      startTime: sessionData.startTime,
      totalMessages: sessionData.totalMessages,
      learningsCaptured: sessionData.learningsCaptured,
      lastActivity: sessionData.lastActivity,
      lastLearning: sessionData.lastLearning,
      summary
    };
  } catch (error) {
    return { error: error.message };
  }
}

/**
 * Clear conversation session
 */
export async function clearConversationSession() {
  try {
    await fs.unlink(CONVERSATION_SESSION_FILE);
    return { cleared: true };
  } catch (error) {
    return { cleared: false, error: error.message };
  }
}

/**
 * Export conversation session data
 * @returns {Object} Exportable session data
 */
export async function exportConversationSession() {
  try {
    const sessionData = await loadConversationSession();
    return {
      ...sessionData,
      exportedAt: new Date().toISOString(),
      version: "1.0"
    };
  } catch (error) {
    return { error: error.message };
  }
}
