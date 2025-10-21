import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { runLearningPipeline } from './learning-pipeline.js';
import { loadMemory, clearSession } from '../modules/memory.js';
import { analyzeProgress, getLearningRecommendations } from '../modules/assimilator.js';
import { isConfigured } from '../modules/openai-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Store active sessions in memory (in production, use Redis or database)
const activeSessions = new Map();

/**
 * Web interface for Eumicus
 */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

/**
 * API endpoint to check configuration
 */
app.get('/api/config', (req, res) => {
  res.json({
    configured: isConfigured(),
    model: process.env.OPENAI_MODEL || 'gpt-4o'
  });
});

/**
 * API endpoint to start a learning session
 */
app.post('/api/learn', async (req, res) => {
  try {
    const { goal } = req.body;
    
    if (!goal || goal.trim().length === 0) {
      return res.status(400).json({ error: 'Learning goal is required' });
    }
    
    if (!isConfigured()) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }
    
    // Create session ID
    const sessionId = Date.now().toString();
    
    // Store session data
    const sessionData = {
      id: sessionId,
      goal,
      status: 'starting',
      startTime: new Date().toISOString(),
      steps: [],
      content: [],
      currentStep: 0,
      plan: null,
      userResponses: []
    };
    
    activeSessions.set(sessionId, sessionData);
    
    // Start learning pipeline in background with chat interface
    startChatLearningSession(sessionData);
    
    res.json({ sessionId, status: 'started' });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start a chat-based learning session
 */
async function startChatLearningSession(sessionData) {
  try {
    // Load memory and create profile
    const { loadMemory } = await import('../modules/memory.js');
    const { profileMemory } = await import('../modules/profiler.js');
    const { planCurriculum } = await import('../modules/planner.js');
    
    const memory = await loadMemory();
    const profile = await profileMemory(memory);
    const plan = await planCurriculum(sessionData.goal, profile);
    
    sessionData.plan = plan;
    sessionData.status = 'active';
    sessionData.content.push(`Hello! I'm your AI tutor, and I'm excited to help you learn about "${sessionData.goal}". 

I've analyzed your knowledge profile and created a personalized learning plan just for you. Let's start with the first topic: "${plan.subtopics[0].title}".

${plan.subtopics[0].description}

What would you like to know about this topic? Feel free to ask me any questions!`);
    
  } catch (error) {
    sessionData.status = 'error';
    sessionData.error = error.message;
    sessionData.endTime = new Date().toISOString();
  }
}

/**
 * API endpoint to get session status
 */
app.get('/api/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = activeSessions.get(sessionId);
  
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  
  res.json(session);
});

/**
 * API endpoint to send chat message
 */
app.post('/api/session/:sessionId/chat', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { message } = req.body;
    
    const session = activeSessions.get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    
    if (!message || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Store user message
    session.userResponses.push({
      message: message.trim(),
      timestamp: new Date().toISOString()
    });
    
    // Generate AI response
    const response = await generateChatResponse(session, message.trim());
    session.content.push(response);
    
    res.json({ response });
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Generate AI chat response
 */
async function generateChatResponse(session, userMessage) {
  try {
    const { getCompletion } = await import('../modules/openai-client.js');
    const { loadMemory } = await import('../modules/memory.js');
    
    const memory = await loadMemory();
    const currentTopic = session.plan.subtopics[session.currentStep];
    
    const prompt = `
You are an AI tutor helping a student learn about "${session.goal}". 

CURRENT TOPIC: ${currentTopic.title}
TOPIC DESCRIPTION: ${currentTopic.description}
LEARNING OBJECTIVES: ${currentTopic.learningObjectives.join(', ')}

STUDENT'S MESSAGE: "${userMessage}"

CONVERSATION HISTORY:
${session.userResponses.slice(-3).map((r, i) => `Student: ${r.message}`).join('\n')}

Your role is to:
1. Answer their question or respond to their comment
2. Guide them through the current topic
3. Ask follow-up questions to deepen their understanding
4. Keep responses conversational and engaging
5. If they seem ready, suggest moving to the next topic

Respond in a friendly, encouraging tone. Keep responses concise but informative (2-3 sentences). End with a question to keep the conversation going.
`;

    const response = await getCompletion(prompt, {
      temperature: 0.8,
      maxTokens: 300
    });
    
    return response;
    
  } catch (error) {
    console.error('Error generating chat response:', error);
    return "I'm sorry, I'm having trouble processing that right now. Could you rephrase your question or try asking something else?";
  }
}

/**
 * API endpoint to get learning progress
 */
app.get('/api/progress', async (req, res) => {
  try {
    const memory = await loadMemory();
    const progress = analyzeProgress(memory);
    res.json(progress);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get learning recommendations
 */
app.get('/api/recommendations', async (req, res) => {
  try {
    const memory = await loadMemory();
    const recommendations = getLearningRecommendations(memory);
    res.json({ recommendations });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to get knowledge profile
 */
app.get('/api/profile', async (req, res) => {
  try {
    const memory = await loadMemory();
    res.json({
      concepts: memory.concepts,
      reflections: memory.reflections,
      stats: memory.stats
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * API endpoint to clear session data
 */
app.delete('/api/sessions', async (req, res) => {
  try {
    await clearSession();
    activeSessions.clear();
    res.json({ message: 'Session data cleared' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Error handling middleware
 */
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

/**
 * Start the server
 */
app.listen(PORT, () => {
  console.log(`🌐 Eumicus web interface running at http://localhost:${PORT}`);
  console.log(`📚 Start learning at http://localhost:${PORT}`);
});
