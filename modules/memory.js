import fs from 'fs/promises';
import path from 'path';

const MEMORY_FILE = 'data/memory.json';
const SESSION_FILE = 'data/session.json';

/**
 * Load user's learning memory from local JSON file
 * @returns {Object} Memory object with concepts and reflections
 */
export async function loadMemory() {
  try {
    const data = await fs.readFile(MEMORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Create default memory structure if file doesn't exist
    const defaultMemory = {
      concepts: [],
      reflections: [],
      lastUpdated: new Date().toISOString()
    };
    await saveMemory(defaultMemory);
    return defaultMemory;
  }
}

/**
 * Save user's learning memory to local JSON file
 * @param {Object} memory - Memory object to save
 */
export async function saveMemory(memory) {
  // Ensure data directory exists
  await fs.mkdir('data', { recursive: true });
  
  memory.lastUpdated = new Date().toISOString();
  await fs.writeFile(MEMORY_FILE, JSON.stringify(memory, null, 2));
}

/**
 * Load current session data
 * @returns {Object} Session object
 */
export async function loadSession() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return null;
  }
}

/**
 * Save current session data
 * @param {Object} session - Session object to save
 */
export async function saveSession(session) {
  await fs.mkdir('data', { recursive: true });
  await fs.writeFile(SESSION_FILE, JSON.stringify(session, null, 2));
}

/**
 * Clear session data
 */
export async function clearSession() {
  try {
    await fs.unlink(SESSION_FILE);
  } catch (error) {
    // File doesn't exist, that's fine
  }
}

/**
 * Add a new concept to memory
 * @param {Object} memory - Current memory object
 * @param {string} name - Concept name
 * @param {number} confidence - Confidence level (0-1)
 */
export function addConcept(memory, name, confidence = 0.5) {
  // Check if concept already exists
  const existingIndex = memory.concepts.findIndex(c => c.name.toLowerCase() === name.toLowerCase());
  
  if (existingIndex >= 0) {
    // Update existing concept confidence
    memory.concepts[existingIndex].confidence = Math.max(memory.concepts[existingIndex].confidence, confidence);
    memory.concepts[existingIndex].lastUpdated = new Date().toISOString();
  } else {
    // Add new concept
    memory.concepts.push({
      name,
      confidence,
      added: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    });
  }
}

/**
 * Add a reflection to memory
 * @param {Object} memory - Current memory object
 * @param {string} text - Reflection text
 * @param {string} topic - Related topic (optional)
 */
export function addReflection(memory, text, topic = null) {
  memory.reflections.push({
    date: new Date().toISOString(),
    text,
    topic,
    id: Date.now().toString()
  });
}

/**
 * Get concepts sorted by confidence
 * @param {Object} memory - Memory object
 * @returns {Array} Sorted concepts array
 */
export function getConceptsByConfidence(memory) {
  return [...memory.concepts].sort((a, b) => b.confidence - a.confidence);
}

/**
 * Get recent reflections
 * @param {Object} memory - Memory object
 * @param {number} limit - Number of recent reflections to return
 * @returns {Array} Recent reflections
 */
export function getRecentReflections(memory, limit = 5) {
  return memory.reflections
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, limit);
}

/**
 * Add a conversation or learning interaction to memory
 * @param {Object} memory - Current memory object
 * @param {string} topic - Main topic discussed
 * @param {string} content - Key insights or learnings from the conversation
 * @param {string} source - Where the learning came from (e.g., "chat conversation", "website", "book")
 * @param {Array} connections - Related concepts or topics
 */
export function addConversationLearning(memory, topic, content, source = "conversation", connections = []) {
  // Add as a concept if it's substantial learning
  if (content.length > 50) {
    const conceptId = `conversation-${Date.now()}`;
    const newConcept = {
      id: conceptId,
      name: topic,
      description: content.substring(0, 200) + (content.length > 200 ? "..." : ""),
      source: source,
      category: "conversation-learning",
      details: content,
      connections: connections,
      timestamp: new Date().toISOString()
    };
    
    memory.concepts.push(newConcept);
  }
  
  // Also add as a reflection
  addReflection(memory, `Learned about ${topic}: ${content}`, topic);
  
  // Update last updated timestamp
  memory.lastUpdated = new Date().toISOString();
}
