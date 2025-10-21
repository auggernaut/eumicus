const OpenAIClient = require('./openai-client');

class ExplorationSuggester {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  async generateExplorationSuggestions() {
    console.log('🔍 Generating exploration suggestions...');
    
    await this.knowledgeGraph.addActivity({
      type: 'exploration',
      agent: 'Exploration Suggester',
      message: 'Analyzing knowledge gaps and generating suggestions',
      status: 'in_progress'
    });

    // Get current knowledge state
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const userProfile = graph.user_profile;
    const concepts = graph.concepts;
    const contentItems = graph.content_items;
    const knowledgeGaps = await this.knowledgeGraph.getKnowledgeGaps();

    // Identify gaps and opportunities
    const analysis = await this.openai.identifyKnowledgeGaps(userProfile, concepts, contentItems);
    
    // Generate personalized suggestions
    const suggestions = await this.generatePersonalizedSuggestions(analysis, userProfile, concepts);
    
    // Save suggestions to knowledge graph
    for (const suggestion of suggestions) {
      await this.knowledgeGraph.addExplorationSuggestion(suggestion);
    }

    await this.knowledgeGraph.addActivity({
      type: 'exploration',
      agent: 'Exploration Suggester',
      message: `Generated ${suggestions.length} exploration suggestions`,
      status: 'completed',
      details: {
        suggestions_generated: suggestions.length,
        high_priority: suggestions.filter(s => s.priority === 'high').length,
        knowledge_gaps_identified: analysis.knowledge_gaps.length
      }
    });

    return {
      knowledgeGaps: analysis.knowledge_gaps,
      explorationSuggestions: analysis.exploration_suggestions,
      personalizedSuggestions: suggestions
    };
  }

  async generatePersonalizedSuggestions(analysis, userProfile, concepts) {
    const suggestions = [];

    // Process knowledge gaps
    for (const gap of analysis.knowledge_gaps) {
      if (gap.priority === 'high' || gap.priority === 'medium') {
        const suggestion = await this.createSuggestionFromGap(gap, userProfile, concepts);
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    // Process exploration suggestions
    for (const exploration of analysis.exploration_suggestions) {
      const suggestion = await this.createSuggestionFromExploration(exploration, userProfile, concepts);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    // Add cross-domain connections
    const crossDomainSuggestions = await this.generateCrossDomainSuggestions(concepts, userProfile);
    suggestions.push(...crossDomainSuggestions);

    // Sort by priority and relevance
    return this.rankSuggestions(suggestions, userProfile);
  }

  async createSuggestionFromGap(gap, userProfile, concepts) {
    const relatedConcepts = this.findRelatedConcepts(gap.area, concepts);
    
    return {
      area: gap.area,
      type: 'knowledge_gap',
      priority: gap.priority,
      reason: gap.reason,
      connection_to_goals: this.assessGoalConnection(gap.area, userProfile.goals),
      difficulty_level: this.assessDifficulty(gap.area, concepts),
      estimated_time: this.estimateLearningTime(gap.area, gap.priority),
      suggested_resources: gap.suggested_resources || [],
      related_concepts: relatedConcepts,
      learning_path: await this.generateLearningPath(gap.area, concepts),
      created_at: new Date().toISOString()
    };
  }

  async createSuggestionFromExploration(exploration, userProfile, concepts) {
    return {
      area: exploration.topic,
      type: 'exploration',
      priority: this.assessPriority(exploration.topic, userProfile),
      reason: exploration.connection_to_goals,
      connection_to_goals: exploration.connection_to_goals,
      difficulty_level: exploration.difficulty_level || 'intermediate',
      estimated_time: exploration.estimated_time || '2-4 weeks',
      suggested_resources: [],
      related_concepts: this.findRelatedConcepts(exploration.topic, concepts),
      learning_path: await this.generateLearningPath(exploration.topic, concepts),
      created_at: new Date().toISOString()
    };
  }

  async generateCrossDomainSuggestions(concepts, userProfile) {
    const suggestions = [];
    
    // Find concepts from different domains that could be connected
    const domains = this.groupConceptsByDomain(concepts);
    const domainNames = Object.keys(domains);
    
    for (let i = 0; i < domainNames.length; i++) {
      for (let j = i + 1; j < domainNames.length; j++) {
        const domain1 = domainNames[i];
        const domain2 = domainNames[j];
        
        // Look for potential cross-domain connections
        const crossDomainArea = await this.findCrossDomainOpportunity(domain1, domain2, userProfile);
        if (crossDomainArea) {
          suggestions.push({
            area: crossDomainArea,
            type: 'cross_domain',
            priority: 'medium',
            reason: `Bridges ${domain1} and ${domain2} knowledge`,
            connection_to_goals: 'Enhances interdisciplinary understanding',
            difficulty_level: 'intermediate',
            estimated_time: '1-2 weeks',
            suggested_resources: [],
            related_concepts: [...domains[domain1], ...domains[domain2]],
            learning_path: await this.generateLearningPath(crossDomainArea, concepts),
            created_at: new Date().toISOString()
          });
        }
      }
    }
    
    return suggestions;
  }

  async findCrossDomainOpportunity(domain1, domain2, userProfile) {
    // Use AI to find interesting cross-domain opportunities
    const messages = [
      {
        role: 'system',
        content: `You are an expert in interdisciplinary learning. Find interesting areas where ${domain1} and ${domain2} intersect.
        
        User goals: ${JSON.stringify(userProfile.goals)}
        User interests: ${JSON.stringify(userProfile.interests)}
        
        Suggest a specific area that bridges these domains and would be valuable to explore.`
      }
    ];

    try {
      const response = await this.openai.generateResponse(messages, { max_tokens: 100 });
      return response.trim();
    } catch (error) {
      console.error('Error finding cross-domain opportunity:', error);
      return null;
    }
  }

  findRelatedConcepts(area, concepts) {
    const areaLower = area.toLowerCase();
    return concepts.filter(concept => 
      concept.name.toLowerCase().includes(areaLower) ||
      concept.category?.toLowerCase().includes(areaLower) ||
      concept.connections?.some(conn => conn.toLowerCase().includes(areaLower))
    ).slice(0, 5);
  }

  assessGoalConnection(area, goals) {
    const areaLower = area.toLowerCase();
    const goalMatches = goals.filter(goal => 
      goal.toLowerCase().includes(areaLower) ||
      areaLower.includes(goal.toLowerCase())
    );
    
    if (goalMatches.length > 0) {
      return `Directly supports: ${goalMatches.join(', ')}`;
    } else {
      return 'Builds foundational knowledge';
    }
  }

  assessDifficulty(area, concepts) {
    const relatedConcepts = this.findRelatedConcepts(area, concepts);
    if (relatedConcepts.length === 0) {
      return 'beginner';
    }
    
    const avgConfidence = relatedConcepts.reduce((sum, c) => sum + (c.confidence || 0.5), 0) / relatedConcepts.length;
    
    if (avgConfidence >= 0.7) {
      return 'intermediate';
    } else if (avgConfidence >= 0.4) {
      return 'beginner';
    } else {
      return 'advanced';
    }
  }

  assessPriority(topic, userProfile) {
    const topicLower = topic.toLowerCase();
    
    // Check direct goal alignment
    const goalAlignment = userProfile.goals.some(goal => 
      goal.toLowerCase().includes(topicLower) || topicLower.includes(goal.toLowerCase())
    );
    
    if (goalAlignment) return 'high';
    
    // Check interest alignment
    const interestAlignment = userProfile.interests.some(interest => 
      interest.toLowerCase().includes(topicLower) || topicLower.includes(interest.toLowerCase())
    );
    
    if (interestAlignment) return 'medium';
    
    return 'low';
  }

  estimateLearningTime(area, priority) {
    const baseTime = {
      'high': '2-3 weeks',
      'medium': '1-2 weeks',
      'low': '3-5 days'
    };
    
    return baseTime[priority] || '1-2 weeks';
  }

  async generateLearningPath(area, concepts) {
    const messages = [
      {
        role: 'system',
        content: `Create a learning path for exploring "${area}". Consider the user's existing knowledge and suggest a logical progression.
        
        Existing concepts: ${concepts.map(c => c.name).join(', ')}
        
        Provide a structured learning path with clear steps.`
      }
    ];

    try {
      const response = await this.openai.generateResponse(messages, { max_tokens: 300 });
      return response;
    } catch (error) {
      console.error('Error generating learning path:', error);
      return 'Learning path will be generated based on your progress.';
    }
  }

  groupConceptsByDomain(concepts) {
    const domains = {};
    
    concepts.forEach(concept => {
      const domain = concept.category || 'general';
      if (!domains[domain]) {
        domains[domain] = [];
      }
      domains[domain].push(concept);
    });
    
    return domains;
  }

  rankSuggestions(suggestions, userProfile) {
    return suggestions.sort((a, b) => {
      // Priority scoring
      const priorityScore = { 'high': 3, 'medium': 2, 'low': 1 };
      const aPriority = priorityScore[a.priority] || 1;
      const bPriority = priorityScore[b.priority] || 1;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Goal alignment scoring
      const aGoalAlignment = this.calculateGoalAlignment(a, userProfile);
      const bGoalAlignment = this.calculateGoalAlignment(b, userProfile);
      
      return bGoalAlignment - aGoalAlignment;
    });
  }

  calculateGoalAlignment(suggestion, userProfile) {
    const areaLower = suggestion.area.toLowerCase();
    let alignment = 0;
    
    userProfile.goals.forEach(goal => {
      if (goal.toLowerCase().includes(areaLower) || areaLower.includes(goal.toLowerCase())) {
        alignment += 2;
      }
    });
    
    userProfile.interests.forEach(interest => {
      if (interest.toLowerCase().includes(areaLower) || areaLower.includes(interest.toLowerCase())) {
        alignment += 1;
      }
    });
    
    return alignment;
  }

  async getExplorationStats() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const suggestions = graph.exploration_suggestions;
    
    if (suggestions.length === 0) {
      return {
        total_suggestions: 0,
        high_priority: 0,
        by_type: {},
        recent_suggestions: []
      };
    }

    const byType = suggestions.reduce((acc, suggestion) => {
      acc[suggestion.type] = (acc[suggestion.type] || 0) + 1;
      return acc;
    }, {});

    return {
      total_suggestions: suggestions.length,
      high_priority: suggestions.filter(s => s.priority === 'high').length,
      by_type: byType,
      recent_suggestions: suggestions.slice(-5)
    };
  }
}

module.exports = ExplorationSuggester;
