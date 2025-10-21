const OpenAIClient = require('./openai-client');

class ReflectionEngine {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  async initiateReflectionSession() {
    console.log('🤔 Initiating reflection session...');
    
    await this.knowledgeGraph.addActivity({
      type: 'reflection',
      agent: 'Reflection Engine',
      message: 'Starting guided reflection session',
      status: 'in_progress'
    });

    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const userProfile = graph.user_profile;
    const recentContent = graph.content_items.slice(-5);
    const recentConcepts = graph.concepts.filter(c => {
      const createdDate = new Date(c.created_at || c.last_updated);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return createdDate > weekAgo;
    });

    const reflectionSession = {
      id: `reflection_${Date.now()}`,
      start_time: new Date().toISOString(),
      status: 'active',
      insights: [],
      connections_made: [],
      goals_progress: [],
      next_steps: []
    };

    // Generate reflection prompts
    const prompts = await this.generateReflectionPrompts(userProfile, recentContent, recentConcepts);
    
    // Process each prompt
    for (const prompt of prompts) {
      const reflection = await this.processReflectionPrompt(prompt, userProfile, graph);
      if (reflection) {
        reflectionSession.insights.push(reflection);
      }
    }

    // Analyze insights and generate connections
    const analysis = await this.analyzeReflectionInsights(reflectionSession.insights, userProfile);
    reflectionSession.connections_made = analysis.connections;
    reflectionSession.goals_progress = analysis.goals_progress;
    reflectionSession.next_steps = analysis.next_steps;

    // Save reflection session
    await this.saveReflectionSession(reflectionSession);

    await this.knowledgeGraph.addActivity({
      type: 'reflection',
      agent: 'Reflection Engine',
      message: `Completed reflection session with ${reflectionSession.insights.length} insights`,
      status: 'completed',
      details: {
        insights_generated: reflectionSession.insights.length,
        connections_made: reflectionSession.connections_made.length,
        goals_assessed: reflectionSession.goals_progress.length
      }
    });

    return reflectionSession;
  }

  async generateReflectionPrompts(userProfile, recentContent, recentConcepts) {
    const messages = [
      {
        role: 'system',
        content: `You are a learning reflection expert. Generate thoughtful reflection prompts that help the user connect new knowledge to their existing understanding and goals.
        
        User Profile: ${JSON.stringify(userProfile)}
        Recent Content: ${JSON.stringify(recentContent.map(c => ({ title: c.title, key_concepts: c.key_concepts })))}
        Recent Concepts: ${JSON.stringify(recentConcepts.map(c => ({ name: c.name, confidence: c.confidence })))}
        
        Create prompts that encourage:
        - Connecting new knowledge to existing knowledge
        - Relating learning to personal goals
        - Identifying patterns and themes
        - Recognizing growth and progress
        - Planning next steps`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              question: { type: 'string' },
              context: { type: 'string' },
              expected_insight_type: { type: 'string' }
            },
            required: ['category', 'question', 'context']
          }
        }
      },
      required: ['prompts']
    };

    try {
      const response = await this.openai.generateStructuredResponse(messages, schema);
      return response.prompts;
    } catch (error) {
      console.error('Error generating reflection prompts:', error);
      return this.getDefaultReflectionPrompts();
    }
  }

  getDefaultReflectionPrompts() {
    return [
      {
        category: 'knowledge_connection',
        question: 'How does what you learned recently connect to what you already knew?',
        context: 'Reflecting on knowledge connections',
        expected_insight_type: 'connection'
      },
      {
        category: 'goal_progress',
        question: 'How does your recent learning advance your goals?',
        context: 'Assessing progress toward goals',
        expected_insight_type: 'progress'
      },
      {
        category: 'pattern_recognition',
        question: 'What patterns or themes do you notice in your learning?',
        context: 'Identifying learning patterns',
        expected_insight_type: 'pattern'
      },
      {
        category: 'application',
        question: 'How might you apply what you learned in practice?',
        context: 'Connecting theory to practice',
        expected_insight_type: 'application'
      }
    ];
  }

  async processReflectionPrompt(prompt, userProfile, graph) {
    // In a real implementation, this would capture user input
    // For now, we'll simulate with AI-generated insights
    const messages = [
      {
        role: 'system',
        content: `You are helping a user reflect on their learning. Based on their profile and recent learning, provide a thoughtful response to this reflection prompt.
        
        User Profile: ${JSON.stringify(userProfile)}
        Recent Learning: ${JSON.stringify(graph.concepts.slice(-10).map(c => ({ name: c.name, confidence: c.confidence })))}
        
        Provide a genuine, insightful response that shows deep thinking about their learning journey.`
      },
      {
        role: 'user',
        content: `Reflection Prompt: ${prompt.question}
        Context: ${prompt.context}`
      }
    ];

    try {
      const response = await this.openai.generateResponse(messages, { max_tokens: 300 });
      
      return {
        prompt: prompt.question,
        category: prompt.category,
        user_response: response,
        timestamp: new Date().toISOString(),
        insight_type: prompt.expected_insight_type
      };
    } catch (error) {
      console.error('Error processing reflection prompt:', error);
      return null;
    }
  }

  async analyzeReflectionInsights(insights, userProfile) {
    const messages = [
      {
        role: 'system',
        content: `You are analyzing reflection insights to identify patterns, connections, and next steps.
        
        User Profile: ${JSON.stringify(userProfile)}
        Reflection Insights: ${JSON.stringify(insights)}
        
        Analyze the insights and provide:
        - Key connections between concepts and goals
        - Progress assessment toward goals
        - Recommended next steps for continued learning`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        connections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              concept1: { type: 'string' },
              concept2: { type: 'string' },
              relationship: { type: 'string' },
              significance: { type: 'string' }
            },
            required: ['concept1', 'concept2', 'relationship']
          }
        },
        goals_progress: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              goal: { type: 'string' },
              progress_level: { type: 'string', enum: ['beginning', 'developing', 'proficient', 'advanced'] },
              evidence: { type: 'string' },
              next_milestone: { type: 'string' }
            },
            required: ['goal', 'progress_level', 'evidence']
          }
        },
        next_steps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              action: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              timeline: { type: 'string' },
              rationale: { type: 'string' }
            },
            required: ['action', 'priority', 'timeline']
          }
        }
      },
      required: ['connections', 'goals_progress', 'next_steps']
    };

    try {
      return await this.openai.generateStructuredResponse(messages, schema);
    } catch (error) {
      console.error('Error analyzing reflection insights:', error);
      return {
        connections: [],
        goals_progress: [],
        next_steps: []
      };
    }
  }

  async saveReflectionSession(session) {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    
    if (!graph.reflection_sessions) {
      graph.reflection_sessions = [];
    }
    
    session.end_time = new Date().toISOString();
    session.status = 'completed';
    graph.reflection_sessions.push(session);
    
    await this.knowledgeGraph.saveKnowledgeGraph(graph);
  }

  async generateWeeklyReflection() {
    console.log('📅 Generating weekly reflection...');
    
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const weeklyData = {
      new_concepts: graph.concepts.filter(c => new Date(c.created_at) > weekAgo),
      new_content: graph.content_items.filter(c => new Date(c.processed_date) > weekAgo),
      reinforcement_sessions: graph.reinforcement_sessions.filter(s => new Date(s.date) > weekAgo),
      exploration_suggestions: graph.exploration_suggestions.filter(s => new Date(s.created_at) > weekAgo)
    };

    const messages = [
      {
        role: 'system',
        content: `You are creating a weekly learning reflection report. Analyze the user's learning activity and provide insights.
        
        Weekly Data: ${JSON.stringify(weeklyData)}
        User Profile: ${JSON.stringify(graph.user_profile)}
        
        Create a comprehensive reflection that highlights:
        - Key learning achievements
        - Knowledge growth patterns
        - Goal progress
        - Areas for improvement
        - Recommendations for next week`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        summary: { type: 'string' },
        key_achievements: { type: 'array', items: { type: 'string' } },
        knowledge_growth: { type: 'string' },
        goal_progress: { type: 'string' },
        areas_for_improvement: { type: 'array', items: { type: 'string' } },
        next_week_recommendations: { type: 'array', items: { type: 'string' } },
        learning_insights: { type: 'array', items: { type: 'string' } }
      },
      required: ['summary', 'key_achievements', 'knowledge_growth', 'goal_progress']
    };

    try {
      const reflection = await this.openai.generateStructuredResponse(messages, schema);
      
      await this.knowledgeGraph.addActivity({
        type: 'reflection',
        agent: 'Reflection Engine',
        message: 'Generated weekly reflection report',
        status: 'completed',
        details: {
          new_concepts: weeklyData.new_concepts.length,
          new_content: weeklyData.new_content.length,
          reinforcement_sessions: weeklyData.reinforcement_sessions.length
        }
      });

      return reflection;
    } catch (error) {
      console.error('Error generating weekly reflection:', error);
      return null;
    }
  }

  async identifyLearningPatterns() {
    console.log('🔍 Identifying learning patterns...');
    
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const concepts = graph.concepts;
    const contentItems = graph.content_items;
    const reinforcementSessions = graph.reinforcement_sessions;

    const messages = [
      {
        role: 'system',
        content: `You are a learning analytics expert. Analyze the user's learning data to identify patterns and insights.
        
        Concepts: ${JSON.stringify(concepts.map(c => ({ name: c.name, confidence: c.confidence, category: c.category })))}
        Content: ${JSON.stringify(contentItems.map(c => ({ type: c.type, key_concepts: c.key_concepts })))}
        Reinforcement: ${JSON.stringify(reinforcementSessions.map(s => ({ concepts_reviewed: s.concepts_reviewed, performance: s.overall_performance })))}
        
        Identify patterns in:
        - Learning preferences and styles
        - Knowledge acquisition patterns
        - Reinforcement effectiveness
        - Content consumption habits
        - Goal alignment patterns`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        learning_preferences: { type: 'array', items: { type: 'string' } },
        knowledge_patterns: { type: 'array', items: { type: 'string' } },
        reinforcement_effectiveness: { type: 'string' },
        content_preferences: { type: 'array', items: { type: 'string' } },
        goal_alignment: { type: 'string' },
        recommendations: { type: 'array', items: { type: 'string' } }
      },
      required: ['learning_preferences', 'knowledge_patterns', 'recommendations']
    };

    try {
      const patterns = await this.openai.generateStructuredResponse(messages, schema);
      
      await this.knowledgeGraph.addActivity({
        type: 'reflection',
        agent: 'Reflection Engine',
        message: 'Identified learning patterns and insights',
        status: 'completed',
        details: {
          patterns_identified: patterns.learning_preferences.length + patterns.knowledge_patterns.length,
          recommendations_generated: patterns.recommendations.length
        }
      });

      return patterns;
    } catch (error) {
      console.error('Error identifying learning patterns:', error);
      return null;
    }
  }

  async getReflectionStats() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const sessions = graph.reflection_sessions || [];
    
    if (sessions.length === 0) {
      return {
        total_sessions: 0,
        average_insights_per_session: 0,
        most_common_insight_types: [],
        last_session: null
      };
    }

    const insightTypes = {};
    sessions.forEach(session => {
      session.insights.forEach(insight => {
        insightTypes[insight.insight_type] = (insightTypes[insight.insight_type] || 0) + 1;
      });
    });

    const mostCommonTypes = Object.entries(insightTypes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([type, count]) => ({ type, count }));

    const totalInsights = sessions.reduce((sum, session) => sum + session.insights.length, 0);

    return {
      total_sessions: sessions.length,
      average_insights_per_session: totalInsights / sessions.length,
      most_common_insight_types: mostCommonTypes,
      last_session: sessions[sessions.length - 1],
      total_insights: totalInsights
    };
  }
}

module.exports = ReflectionEngine;
