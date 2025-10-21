const KnowledgeGraphManager = require('../modules/knowledge-graph');
const UserProfiler = require('../modules/user-profiler');
const ContentProcessor = require('../modules/content-processor');
const KnowledgeReinforcer = require('../modules/knowledge-reinforcer');
const ExplorationSuggester = require('../modules/exploration-suggester');
const ConnectionMapper = require('../modules/connection-mapper');
const ReflectionEngine = require('../modules/reflection-engine');
const OpenAIClient = require('../modules/openai-client');

class LearningPipeline {
  constructor(webServer) {
    this.webServer = webServer;
    this.knowledgeGraph = webServer.knowledgeGraph;
    this.userProfiler = webServer.userProfiler;
    this.contentProcessor = webServer.contentProcessor;
    this.knowledgeReinforcer = webServer.knowledgeReinforcer;
    this.explorationSuggester = webServer.explorationSuggester;
    this.connectionMapper = webServer.connectionMapper;
    this.reflectionEngine = webServer.reflectionEngine;
    
    this.isRunning = false;
    this.intervals = {};
  }

  async start() {
    if (this.isRunning) {
      console.log('Learning pipeline is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Starting learning pipeline...');

    // Start background processes
    this.startPeriodicTasks();
    this.startEventListeners();

    console.log('✅ Learning pipeline started');
  }

  async stop() {
    if (!this.isRunning) {
      return;
    }

    console.log('🛑 Stopping learning pipeline...');

    // Clear all intervals
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};

    this.isRunning = false;
    console.log('✅ Learning pipeline stopped');
  }

  startPeriodicTasks() {
    // Daily knowledge gap analysis (every 24 hours)
    this.intervals.dailyAnalysis = setInterval(async () => {
      try {
        await this.runDailyAnalysis();
      } catch (error) {
        console.error('Error in daily analysis:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours

    // Weekly reflection (every 7 days)
    this.intervals.weeklyReflection = setInterval(async () => {
      try {
        await this.runWeeklyReflection();
      } catch (error) {
        console.error('Error in weekly reflection:', error);
      }
    }, 7 * 24 * 60 * 60 * 1000); // 7 days

    // Hidden connection discovery (every 6 hours)
    this.intervals.connectionDiscovery = setInterval(async () => {
      try {
        await this.discoverHiddenConnections();
      } catch (error) {
        console.error('Error in connection discovery:', error);
      }
    }, 6 * 60 * 60 * 1000); // 6 hours

    // Knowledge graph health check (every hour)
    this.intervals.healthCheck = setInterval(async () => {
      try {
        await this.runHealthCheck();
      } catch (error) {
        console.error('Error in health check:', error);
      }
    }, 60 * 60 * 1000); // 1 hour
  }

  startEventListeners() {
    // Listen for content processing events
    this.webServer.io.on('connection', (socket) => {
      socket.on('content-processed', async (data) => {
        try {
          await this.handleContentProcessed(data);
        } catch (error) {
          console.error('Error handling content processed event:', error);
        }
      });

      socket.on('reinforcement-completed', async (data) => {
        try {
          await this.handleReinforcementCompleted(data);
        } catch (error) {
          console.error('Error handling reinforcement completed event:', error);
        }
      });
    });
  }

  async runDailyAnalysis() {
    console.log('📊 Running daily knowledge analysis...');
    
    try {
      // Check for concepts that need reinforcement
      const conceptsToReview = await this.knowledgeGraph.getConceptsForReinforcement();
      
      if (conceptsToReview.length > 0) {
        this.webServer.emitActivity(
          `Found ${conceptsToReview.length} concepts ready for reinforcement`,
          'Learning Pipeline',
          'completed',
          { concepts_count: conceptsToReview.length }
        );
      }

      // Generate exploration suggestions
      const suggestions = await this.explorationSuggester.generateExplorationSuggestions();
      
      if (suggestions.personalizedSuggestions.length > 0) {
        this.webServer.emitActivity(
          `Generated ${suggestions.personalizedSuggestions.length} exploration suggestions`,
          'Learning Pipeline',
          'completed',
          { suggestions_count: suggestions.personalizedSuggestions.length }
        );
      }

      // Analyze knowledge structure
      const structure = await this.connectionMapper.analyzeKnowledgeStructure();
      
      this.webServer.emitActivity(
        `Knowledge structure analysis: ${structure.total_concepts} concepts, ${structure.knowledge_clusters.length} clusters`,
        'Learning Pipeline',
        'completed',
        { 
          total_concepts: structure.total_concepts,
          clusters: structure.knowledge_clusters.length,
          connection_density: structure.connection_density.toFixed(3)
        }
      );

    } catch (error) {
      console.error('Error in daily analysis:', error);
      this.webServer.emitActivity(
        'Daily analysis failed',
        'Learning Pipeline',
        'error',
        { error: error.message }
      );
    }
  }

  async runWeeklyReflection() {
    console.log('🤔 Running weekly reflection...');
    
    try {
      const reflection = await this.reflectionEngine.generateWeeklyReflection();
      
      if (reflection) {
        this.webServer.emitActivity(
          'Weekly reflection completed',
          'Learning Pipeline',
          'completed',
          {
            key_achievements: reflection.key_achievements.length,
            insights: reflection.learning_insights.length
          }
        );

        // Emit reflection to all connected clients
        this.webServer.io.emit('weekly-reflection', reflection);
      }

    } catch (error) {
      console.error('Error in weekly reflection:', error);
      this.webServer.emitActivity(
        'Weekly reflection failed',
        'Learning Pipeline',
        'error',
        { error: error.message }
      );
    }
  }

  async discoverHiddenConnections() {
    console.log('🔍 Discovering hidden connections...');
    
    try {
      const connections = await this.connectionMapper.discoverHiddenConnections();
      
      if (connections.length > 0) {
        this.webServer.emitActivity(
          `Discovered ${connections.length} hidden connections`,
          'Learning Pipeline',
          'completed',
          { connections_found: connections.length }
        );

        // Update graph visualization
        const graph = await this.knowledgeGraph.loadKnowledgeGraph();
        this.webServer.io.emit('graph-update', graph);
      }

    } catch (error) {
      console.error('Error in connection discovery:', error);
      this.webServer.emitActivity(
        'Connection discovery failed',
        'Learning Pipeline',
        'error',
        { error: error.message }
      );
    }
  }

  async runHealthCheck() {
    try {
      // Check knowledge graph integrity
      const graph = await this.knowledgeGraph.loadKnowledgeGraph();
      
      // Check for orphaned concepts (concepts with no connections)
      const orphanedConcepts = graph.concepts.filter(c => 
        !c.connections || c.connections.length === 0
      );

      if (orphanedConcepts.length > graph.concepts.length * 0.3) {
        this.webServer.emitActivity(
          `Warning: ${orphanedConcepts.length} concepts have no connections`,
          'Learning Pipeline',
          'completed',
          { 
            orphaned_count: orphanedConcepts.length,
            total_concepts: graph.concepts.length,
            percentage: ((orphanedConcepts.length / graph.concepts.length) * 100).toFixed(1)
          }
        );
      }

      // Check for low confidence concepts
      const lowConfidenceConcepts = graph.concepts.filter(c => 
        c.confidence < 0.3
      );

      if (lowConfidenceConcepts.length > 0) {
        this.webServer.emitActivity(
          `${lowConfidenceConcepts.length} concepts have low confidence and may need reinforcement`,
          'Learning Pipeline',
          'completed',
          { low_confidence_count: lowConfidenceConcepts.length }
        );
      }

    } catch (error) {
      console.error('Error in health check:', error);
      this.webServer.emitActivity(
        'Health check failed',
        'Learning Pipeline',
        'error',
        { error: error.message }
      );
    }
  }

  async handleContentProcessed(data) {
    try {
      const { concepts, contentItem } = data;
      
      if (concepts && concepts.length > 0) {
        // Map connections for new concepts
        const connectionResult = await this.connectionMapper.mapNewConnections(concepts);
        
        this.webServer.emitActivity(
          `Mapped ${connectionResult.connections.length} connections for new concepts`,
          'Learning Pipeline',
          'completed',
          {
            new_concepts: concepts.length,
            connections_mapped: connectionResult.connections.length
          }
        );

        // Update graph visualization
        const graph = await this.knowledgeGraph.loadKnowledgeGraph();
        this.webServer.io.emit('graph-update', graph);
      }

      // Check if this content suggests new exploration areas
      const suggestions = await this.explorationSuggester.generateExplorationSuggestions();
      
      if (suggestions.personalizedSuggestions.length > 0) {
        this.webServer.emitActivity(
          `Generated ${suggestions.personalizedSuggestions.length} new exploration suggestions`,
          'Learning Pipeline',
          'completed',
          { suggestions_count: suggestions.personalizedSuggestions.length }
        );
      }

    } catch (error) {
      console.error('Error handling content processed:', error);
    }
  }

  async handleReinforcementCompleted(data) {
    try {
      const { sessionResults } = data;
      
      // Update user profile based on reinforcement performance
      if (sessionResults.overall_performance < 0.6) {
        // Low performance - suggest review
        this.webServer.emitActivity(
          'Reinforcement session completed with low performance - consider reviewing concepts',
          'Learning Pipeline',
          'completed',
          { performance: sessionResults.overall_performance }
        );
      }

      // Generate new exploration suggestions based on performance
      const suggestions = await this.explorationSuggester.generateExplorationSuggestions();
      
      if (suggestions.knowledgeGaps.length > 0) {
        this.webServer.emitActivity(
          `Identified ${suggestions.knowledgeGaps.length} knowledge gaps for further exploration`,
          'Learning Pipeline',
          'completed',
          { gaps_identified: suggestions.knowledgeGaps.length }
        );
      }

    } catch (error) {
      console.error('Error handling reinforcement completed:', error);
    }
  }

  async runInitialSetup() {
    console.log('🔧 Running initial setup...');
    
    try {
      const graph = await this.knowledgeGraph.loadKnowledgeGraph();
      
      // Check if user profile exists
      if (!graph.user_profile.goals || graph.user_profile.goals.length === 0) {
        this.webServer.emitActivity(
          'No user profile found - ready for initial profiling',
          'Learning Pipeline',
          'completed'
        );
        return;
      }

      // Check if knowledge graph has concepts
      if (graph.concepts.length === 0) {
        this.webServer.emitActivity(
          'Knowledge graph is empty - ready for content processing',
          'Learning Pipeline',
          'completed'
        );
        return;
      }

      // Run initial analysis
      await this.runDailyAnalysis();
      
      this.webServer.emitActivity(
        'Initial setup completed successfully',
        'Learning Pipeline',
        'completed',
        {
          concepts: graph.concepts.length,
          goals: graph.user_profile.goals.length
        }
      );

    } catch (error) {
      console.error('Error in initial setup:', error);
      this.webServer.emitActivity(
        'Initial setup failed',
        'Learning Pipeline',
        'error',
        { error: error.message }
      );
    }
  }

  async getPipelineStats() {
    return {
      is_running: this.isRunning,
      active_intervals: Object.keys(this.intervals).length,
      last_daily_analysis: new Date().toISOString(), // In real implementation, track actual times
      last_weekly_reflection: new Date().toISOString(),
      last_connection_discovery: new Date().toISOString(),
      last_health_check: new Date().toISOString()
    };
  }
}

module.exports = LearningPipeline;
