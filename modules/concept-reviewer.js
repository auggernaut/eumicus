const OpenAIClient = require('./openai-client');

class ConceptReviewer {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  /**
   * Phase 1: Concept Review & Expansion (Learning Mode)
   * Processes new content and presents concept cards for user curation
   */
  async processContentForReview(contentInput) {
    console.log('🧩 Starting Phase 1: Concept Review & Expansion...');
    
    await this.knowledgeGraph.addActivity({
      type: 'concept_review',
      agent: 'Concept Reviewer',
      message: 'Starting concept review session',
      status: 'in_progress',
      details: { content_type: typeof contentInput }
    });

    // Extract concepts from content
    const concepts = await this.extractConceptsFromContent(contentInput);
    
    // Create concept cards for user review
    const conceptCards = await this.createConceptCards(concepts);
    
    await this.knowledgeGraph.addActivity({
      type: 'concept_review',
      agent: 'Concept Reviewer',
      message: `Generated ${conceptCards.length} concept cards for review`,
      status: 'completed',
      details: {
        concepts_extracted: concepts.length,
        cards_created: conceptCards.length
      }
    });

    return {
      sessionId: this.generateSessionId(),
      concepts: conceptCards,
      contentSource: contentInput,
      phase: 'concept_review',
      status: 'ready_for_review'
    };
  }

  async extractConceptsFromContent(contentInput) {
    console.log('🔍 Extracting concepts from content...');
    
    // Get existing concepts for context
    const existingConcepts = await this.getExistingConcepts();
    
    // Use OpenAI to extract key concepts
    const extraction = await this.openai.extractConcepts(contentInput.content, existingConcepts);
    
    return extraction.concepts.map(concept => ({
      ...concept,
      confidence: 0.2, // Start with low confidence for new concepts
      status: 'new',
      created_from: contentInput.type || 'unknown',
      source_url: contentInput.url || null
    }));
  }

  async createConceptCards(concepts) {
    console.log('📋 Creating concept cards...');
    
    const cards = [];
    
    for (const concept of concepts) {
      // Check if concept already exists in knowledge graph
      const existingConcept = await this.findExistingConcept(concept.name);
      
      const card = {
        id: this.generateCardId(),
        concept: concept,
        title: concept.name,
        definition: concept.description,
        connections: concept.connections || [],
        confidence: existingConcept ? existingConcept.confidence : 0.2,
        isNew: !existingConcept,
        isFamiliar: existingConcept ? existingConcept.confidence > 0.6 : false,
        category: concept.category || 'General',
        priority: concept.priority || 'medium',
        userAction: null, // Will be set by user interaction
        userNotes: null, // Will be set if user edits
        createdAt: new Date().toISOString()
      };
      
      cards.push(card);
    }
    
    return cards;
  }

  /**
   * Process user's curation actions on concept cards
   */
  async processUserCuration(sessionId, cardActions) {
    console.log('👤 Processing user curation actions...');
    
    const session = await this.getReviewSession(sessionId);
    if (!session) {
      throw new Error('Review session not found');
    }

    const curatedConcepts = [];
    const archivedConcepts = [];
    const expandedConcepts = [];

    for (const action of cardActions) {
      const card = session.concepts.find(c => c.id === action.cardId);
      if (!card) continue;

      card.userAction = action.action;
      card.userNotes = action.notes || null;

      switch (action.action) {
        case 'important':
          // Add to active knowledge set with low confidence
          curatedConcepts.push({
            ...card.concept,
            confidence: 0.3,
            user_notes: action.notes,
            curation_reason: 'marked_important'
          });
          break;
          
        case 'familiar':
          // Boost confidence slightly, mark as familiar
          curatedConcepts.push({
            ...card.concept,
            confidence: Math.min(card.confidence + 0.2, 0.8),
            user_notes: action.notes,
            curation_reason: 'marked_familiar'
          });
          break;
          
        case 'irrelevant':
          // Archive concept (don't add to graph)
          archivedConcepts.push(card.concept);
          break;
          
        case 'edit':
          // User provided custom definition/notes
          curatedConcepts.push({
            ...card.concept,
            description: action.notes || card.concept.description,
            user_notes: action.notes,
            curation_reason: 'user_edited'
          });
          break;
      }
    }

    // Update session with user actions
    session.userActions = cardActions;
    session.curatedConcepts = curatedConcepts;
    session.archivedConcepts = archivedConcepts;
    session.status = 'curation_complete';

    await this.saveReviewSession(session);

    await this.knowledgeGraph.addActivity({
      type: 'concept_review',
      agent: 'Concept Reviewer',
      message: `User curated ${curatedConcepts.length} concepts, archived ${archivedConcepts.length}`,
      status: 'completed',
      details: {
        session_id: sessionId,
        curated_count: curatedConcepts.length,
        archived_count: archivedConcepts.length
      }
    });

    return {
      sessionId,
      curatedConcepts,
      archivedConcepts,
      nextPhase: 'expansion'
    };
  }

  /**
   * Phase 1b: Expansion - Generate richer explanations and connections
   */
  async expandCuratedConcepts(sessionId) {
    console.log('🌱 Starting concept expansion...');
    
    const session = await this.getReviewSession(sessionId);
    if (!session || !session.curatedConcepts) {
      throw new Error('No curated concepts found for expansion');
    }

    await this.knowledgeGraph.addActivity({
      type: 'concept_expansion',
      agent: 'Concept Reviewer',
      message: 'Starting concept expansion phase',
      status: 'in_progress'
    });

    const expandedConcepts = [];
    const microLessons = [];

    for (const concept of session.curatedConcepts) {
      try {
        // Generate expansion content
        const expansion = await this.openai.expandConcept(concept, session.curatedConcepts);
        
        const expandedConcept = {
          ...concept,
          expanded_definition: expansion.enhanced_definition,
          analogies: expansion.analogies,
          examples: expansion.examples,
          connections: expansion.connections,
          learning_chunks: expansion.learning_chunks
        };

        expandedConcepts.push(expandedConcept);

        // Create micro-lessons
        for (const chunk of expansion.learning_chunks) {
          microLessons.push({
            id: this.generateLessonId(),
            concept_id: concept.name,
            title: chunk.title,
            content: chunk.content,
            type: chunk.type,
            duration: chunk.estimated_duration || '2-3 minutes'
          });
        }

      } catch (error) {
        console.error(`Error expanding concept "${concept.name}":`, error);
        // Still add the concept without expansion
        expandedConcepts.push(concept);
      }
    }

    // Update session
    session.expandedConcepts = expandedConcepts;
    session.microLessons = microLessons;
    session.status = 'expansion_complete';

    await this.saveReviewSession(session);

    await this.knowledgeGraph.addActivity({
      type: 'concept_expansion',
      agent: 'Concept Reviewer',
      message: `Expanded ${expandedConcepts.length} concepts with ${microLessons.length} micro-lessons`,
      status: 'completed',
      details: {
        session_id: sessionId,
        concepts_expanded: expandedConcepts.length,
        micro_lessons_created: microLessons.length
      }
    });

    return {
      sessionId,
      expandedConcepts,
      microLessons,
      nextPhase: 'graph_integration'
    };
  }

  /**
   * Phase 1c: Graph Integration - Add concepts to knowledge graph with visual feedback
   */
  async integrateConceptsToGraph(sessionId) {
    console.log('🔗 Integrating concepts to knowledge graph...');
    
    const session = await this.getReviewSession(sessionId);
    if (!session || !session.expandedConcepts) {
      throw new Error('No expanded concepts found for integration');
    }

    await this.knowledgeGraph.addActivity({
      type: 'graph_integration',
      agent: 'Concept Reviewer',
      message: 'Starting graph integration',
      status: 'in_progress'
    });

    const integratedConcepts = [];
    const newConnections = [];

    for (const concept of session.expandedConcepts) {
      try {
        // Add concept to knowledge graph
        const addedConcept = await this.knowledgeGraph.addConcept(concept);
        integratedConcepts.push(addedConcept);

        // Create connections to existing concepts
        if (concept.connections && concept.connections.length > 0) {
          for (const connectionName of concept.connections) {
            const connection = await this.knowledgeGraph.addConnection(
              concept.name, 
              connectionName, 
              'related_to'
            );
            if (connection) {
              newConnections.push(connection);
            }
          }
        }

      } catch (error) {
        console.error(`Error integrating concept "${concept.name}":`, error);
      }
    }

    // Update session
    session.integratedConcepts = integratedConcepts;
    session.newConnections = newConnections;
    session.status = 'integration_complete';
    session.completedAt = new Date().toISOString();

    await this.saveReviewSession(session);

    await this.knowledgeGraph.addActivity({
      type: 'graph_integration',
      agent: 'Concept Reviewer',
      message: `Integrated ${integratedConcepts.length} concepts with ${newConnections.length} new connections`,
      status: 'completed',
      details: {
        session_id: sessionId,
        concepts_integrated: integratedConcepts.length,
        connections_created: newConnections.length
      }
    });

    return {
      sessionId,
      integratedConcepts,
      newConnections,
      phase: 'complete',
      nextPhase: 'reinforcement_scheduling'
    };
  }

  /**
   * Schedule concepts for Phase 2 reinforcement
   */
  async scheduleForReinforcement(sessionId) {
    console.log('📅 Scheduling concepts for reinforcement...');
    
    const session = await this.getReviewSession(sessionId);
    if (!session || !session.integratedConcepts) {
      throw new Error('No integrated concepts found for scheduling');
    }

    const scheduledConcepts = [];

    for (const concept of session.integratedConcepts) {
      const scheduleDate = this.calculateReinforcementSchedule(concept.confidence);
      
      const scheduledConcept = {
        ...concept,
        next_reinforcement_at: scheduleDate,
        reinforcement_interval: this.getReinforcementInterval(concept.confidence),
        scheduled_at: new Date().toISOString()
      };

      // Update concept in knowledge graph
      await this.knowledgeGraph.addConcept(scheduledConcept);
      scheduledConcepts.push(scheduledConcept);
    }

    await this.knowledgeGraph.addActivity({
      type: 'reinforcement_scheduling',
      agent: 'Concept Reviewer',
      message: `Scheduled ${scheduledConcepts.length} concepts for reinforcement`,
      status: 'completed',
      details: {
        session_id: sessionId,
        concepts_scheduled: scheduledConcepts.length,
        next_review_date: Math.min(...scheduledConcepts.map(c => new Date(c.next_reinforcement_at).getTime()))
      }
    });

    return {
      sessionId,
      scheduledConcepts,
      nextReviewDate: Math.min(...scheduledConcepts.map(c => new Date(c.next_reinforcement_at).getTime())),
      phase: 'complete'
    };
  }

  // Helper methods
  async getExistingConcepts() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    return graph.concepts || [];
  }

  async findExistingConcept(conceptName) {
    const concepts = await this.getExistingConcepts();
    return concepts.find(c => c.name.toLowerCase() === conceptName.toLowerCase());
  }

  calculateReinforcementSchedule(confidence) {
    const now = new Date();
    let daysToAdd;
    
    if (confidence >= 0.8) {
      daysToAdd = 14; // High confidence - review in 2 weeks
    } else if (confidence >= 0.6) {
      daysToAdd = 7;  // Medium confidence - review in 1 week
    } else if (confidence >= 0.4) {
      daysToAdd = 3;  // Low confidence - review in 3 days
    } else {
      daysToAdd = 1;  // Very low confidence - review tomorrow
    }
    
    const scheduleDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return scheduleDate.toISOString();
  }

  getReinforcementInterval(confidence) {
    if (confidence >= 0.8) return 'biweekly';
    if (confidence >= 0.6) return 'weekly';
    if (confidence >= 0.4) return 'every_3_days';
    return 'daily';
  }

  generateSessionId() {
    return `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateCardId() {
    return `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateLessonId() {
    return `lesson_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getReviewSession(sessionId) {
    // In a real implementation, this would load from persistent storage
    // For now, we'll use a simple in-memory store
    return this.reviewSessions?.[sessionId] || null;
  }

  async saveReviewSession(session) {
    // In a real implementation, this would save to persistent storage
    if (!this.reviewSessions) {
      this.reviewSessions = {};
    }
    this.reviewSessions[session.sessionId] = session;
  }

  /**
   * Get concepts ready for Phase 2 reinforcement
   */
  async getConceptsForReinforcement() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const now = new Date();
    
    return graph.concepts.filter(concept => {
      if (!concept.next_reinforcement_at) return false;
      return new Date(concept.next_reinforcement_at) <= now;
    });
  }

  /**
   * Get review session statistics
   */
  async getReviewStats() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    
    return {
      total_concepts: graph.concepts.length,
      concepts_ready_for_reinforcement: (await this.getConceptsForReinforcement()).length,
      average_confidence: graph.concepts.reduce((sum, c) => sum + (c.confidence || 0), 0) / graph.concepts.length,
      last_review_session: graph.concepts.length > 0 ? 
        Math.max(...graph.concepts.map(c => new Date(c.created_at || 0).getTime())) : null
    };
  }
}

module.exports = ConceptReviewer;

