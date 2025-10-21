const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const KnowledgeGraphManager = require('../modules/knowledge-graph');
const UserProfiler = require('../modules/user-profiler');
const ContentProcessor = require('../modules/content-processor');
const KnowledgeReinforcer = require('../modules/knowledge-reinforcer');
const ExplorationSuggester = require('../modules/exploration-suggester');
const ConnectionMapper = require('../modules/connection-mapper');
const ReflectionEngine = require('../modules/reflection-engine');
const OpenAIClient = require('../modules/openai-client');

class WebServer {
  constructor(port = 3000) {
    this.port = port;
    this.app = express();
    this.server = http.createServer(this.app);
    this.io = socketIo(this.server);
    
    // Initialize modules
    this.knowledgeGraph = new KnowledgeGraphManager();
    this.openai = null; // Will be initialized when API key is provided
    this.userProfiler = null;
    this.contentProcessor = null;
    this.knowledgeReinforcer = null;
    this.explorationSuggester = null;
    this.connectionMapper = null;
    this.reflectionEngine = null;
    
    this.setupMiddleware();
    this.setupRoutes();
    this.setupSocketHandlers();
  }

  async initialize(openaiApiKey) {
    try {
      // Initialize knowledge graph
      await this.knowledgeGraph.initialize();
      
      // Initialize OpenAI client
      this.openai = new OpenAIClient(openaiApiKey);
      
      // Initialize other modules
      this.userProfiler = new UserProfiler(this.openai, this.knowledgeGraph);
      this.contentProcessor = new ContentProcessor(this.openai, this.knowledgeGraph);
      this.knowledgeReinforcer = new KnowledgeReinforcer(this.openai, this.knowledgeGraph);
      this.explorationSuggester = new ExplorationSuggester(this.openai, this.knowledgeGraph);
      this.connectionMapper = new ConnectionMapper(this.openai, this.knowledgeGraph);
      this.reflectionEngine = new ReflectionEngine(this.openai, this.knowledgeGraph);
      
      // Initialize content processor browser
      await this.contentProcessor.initialize();
      
      console.log('✅ All modules initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Error initializing modules:', error);
      return false;
    }
  }

  setupMiddleware() {
    this.app.use(express.json());
    this.app.use(express.static(path.join(__dirname, '../public')));
  }

  setupRoutes() {
    // API routes
    this.app.get('/api/status', (req, res) => {
      res.json({ 
        status: 'running',
        modules: {
          knowledgeGraph: !!this.knowledgeGraph,
          openai: !!this.openai,
          userProfiler: !!this.userProfiler,
          contentProcessor: !!this.contentProcessor,
          knowledgeReinforcer: !!this.knowledgeReinforcer,
          explorationSuggester: !!this.explorationSuggester,
          connectionMapper: !!this.connectionMapper,
          reflectionEngine: !!this.reflectionEngine
        }
      });
    });

    this.app.get('/api/knowledge-graph', async (req, res) => {
      try {
        const graph = await this.knowledgeGraph.loadKnowledgeGraph();
        res.json(graph);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/activity-log', async (req, res) => {
      try {
        const log = await this.knowledgeGraph.loadActivityLog();
        res.json(log);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/process-content', async (req, res) => {
      try {
        const { content } = req.body;
        if (!content) {
          return res.status(400).json({ error: 'Content is required' });
        }

        const result = await this.contentProcessor.processContent(content);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/generate-reinforcement', async (req, res) => {
      try {
        const session = await this.knowledgeReinforcer.generateReinforcementSession();
        res.json(session);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/exploration-suggestions', async (req, res) => {
      try {
        const suggestions = await this.explorationSuggester.generateExplorationSuggestions();
        res.json(suggestions);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.post('/api/reflection-session', async (req, res) => {
      try {
        const session = await this.reflectionEngine.initiateReflectionSession();
        res.json(session);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Serve the main page
    this.app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log('👤 User connected:', socket.id);
      
      // Store conversation state for each socket
      socket.conversationState = null;

      socket.on('start-profiling', async () => {
        try {
          this.emitActivity('Starting user profiling session', 'User Profiler', 'in_progress');
          
          // Initialize the conversation state
          socket.conversationState = await this.userProfiler.conductDeepDiveConversation();
          
          // Get the first question
          const currentQuestion = this.userProfiler.getCurrentQuestion(socket.conversationState);
          
          if (currentQuestion) {
            socket.emit('profiling-question', {
              phase: currentQuestion.phase,
              question: currentQuestion.question,
              phaseTitle: currentQuestion.phaseTitle,
              progress: currentQuestion.progress
            });
          }
          
        } catch (error) {
          this.emitActivity('Error starting profiling', 'User Profiler', 'error', { error: error.message });
        }
      });

      socket.on('load-profile', async () => {
        try {
          const graph = await this.knowledgeGraph.loadKnowledgeGraph();
          if (graph.user_profile.goals.length > 0) {
            socket.emit('profile-loaded', graph.user_profile);
            this.emitActivity('Existing profile loaded', 'System', 'completed');
          } else {
            socket.emit('no-profile', { message: 'No existing profile found' });
          }
        } catch (error) {
          this.emitActivity('Error loading profile', 'System', 'error', { error: error.message });
        }
      });

      socket.on('message', async (data) => {
        try {
          const { content, type } = data;
          
          if (type === 'user') {
            // Check if we're in a profiling conversation
            if (socket.conversationState && !socket.conversationState.isComplete) {
              await this.processProfilingResponse(socket, content);
            } else {
              // Process regular user message
              await this.processUserMessage(socket, content);
            }
          }
        } catch (error) {
          console.error('Error processing message:', error);
          socket.emit('error', { message: 'Error processing message' });
        }
      });

      socket.on('disconnect', () => {
        console.log('👤 User disconnected:', socket.id);
      });
    });
  }

  async processProfilingResponse(socket, content) {
    try {
      // Process the user's response in the conversation state
      socket.conversationState = await this.userProfiler.processUserResponse(socket.conversationState, content);
      
      if (socket.conversationState.isComplete) {
        // Profiling is complete, analyze and save the profile
        const profile = await this.userProfiler.completeProfiling(socket.conversationState);
        
        this.emitActivity('User profiling completed', 'User Profiler', 'completed', {
          goals_identified: profile.goals.length,
          interests_identified: profile.interests.length
        });
        
        socket.emit('profiling-complete', profile);
        socket.conversationState = null; // Clear the conversation state
      } else {
        // Get the next question
        const currentQuestion = this.userProfiler.getCurrentQuestion(socket.conversationState);
        
        if (currentQuestion) {
          socket.emit('profiling-question', {
            phase: currentQuestion.phase,
            question: currentQuestion.question,
            phaseTitle: currentQuestion.phaseTitle,
            progress: currentQuestion.progress
          });
        }
      }
    } catch (error) {
      console.error('Error processing profiling response:', error);
      socket.emit('error', { message: 'Error processing your response. Please try again.' });
    }
  }

  async processUserMessage(socket, content) {
    try {
      // Check if it's a URL
      if (this.isUrl(content)) {
        this.emitActivity(`Processing URL: ${content}`, 'Content Processor', 'in_progress');
        
        const result = await this.contentProcessor.processContent(content);
        
        this.emitActivity(`Processed content: "${result.contentItem.title}"`, 'Content Processor', 'completed', {
          concepts_extracted: result.concepts.length,
          insights_generated: result.insights.length
        });

        // Map connections
        if (result.concepts.length > 0) {
          this.emitActivity('Mapping concept connections', 'Connection Mapper', 'in_progress');
          const connectionResult = await this.connectionMapper.mapNewConnections(result.concepts);
          
          this.emitActivity(`Mapped ${connectionResult.connections.length} connections`, 'Connection Mapper', 'completed');
        }

        // Update graph visualization
        const graph = await this.knowledgeGraph.loadKnowledgeGraph();
        this.io.emit('graph-update', graph);

        socket.emit('message', {
          content: `I've processed the content and extracted ${result.concepts.length} key concepts. The knowledge graph has been updated with new connections.`,
          type: 'ai'
        });

      } else {
        // Regular text message - could be part of profiling or general conversation
        const response = await this.generateConversationalResponse(content);
        socket.emit('message', {
          content: response,
          type: 'ai'
        });
      }
    } catch (error) {
      console.error('Error processing user message:', error);
      socket.emit('message', {
        content: 'I encountered an error processing your message. Please try again.',
        type: 'ai'
      });
    }
  }

  async generateConversationalResponse(message) {
    if (!this.openai) {
      return "I'm not fully initialized yet. Please make sure the OpenAI API key is configured.";
    }

    try {
      const graph = await this.knowledgeGraph.loadKnowledgeGraph();
      const userProfile = graph.user_profile;
      
      const messages = [
        {
          role: 'system',
          content: `You are Eumicus, an AI learning companion. You help users build and reinforce their knowledge through conversations and content processing.
          
          User Profile: ${JSON.stringify(userProfile)}
          Recent Learning: ${JSON.stringify(graph.concepts.slice(-5).map(c => ({ name: c.name, confidence: c.confidence })))}
          
          Respond in a helpful, encouraging way that supports their learning journey.`
        },
        {
          role: 'user',
          content: message
        }
      ];

      const response = await this.openai.generateResponse(messages, { max_tokens: 300 });
      return response;
    } catch (error) {
      console.error('Error generating conversational response:', error);
      return "I'm having trouble processing your message right now. Please try again.";
    }
  }

  isUrl(string) {
    try {
      new URL(string);
      return true;
    } catch {
      return false;
    }
  }

  emitActivity(message, agent, status, details = null) {
    this.io.emit('activity', {
      message,
      agent,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }

  async start() {
    return new Promise((resolve, reject) => {
      this.server.listen(this.port, (error) => {
        if (error) {
          reject(error);
        } else {
          console.log(`🌐 Web server running on http://localhost:${this.port}`);
          resolve();
        }
      });
    });
  }

  async stop() {
    return new Promise((resolve) => {
      this.server.close(() => {
        console.log('🛑 Web server stopped');
        resolve();
      });
    });
  }

  async cleanup() {
    if (this.contentProcessor) {
      await this.contentProcessor.cleanup();
    }
  }
}

module.exports = WebServer;