const OpenAIClient = require('./openai-client');

class ReinforcementEngine {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  /**
   * Phase 2: Review & Reinforcement Mode
   * Generates adaptive question sessions for spaced repetition
   */
  async generateReinforcementSession() {
    console.log('🔄 Starting Phase 2: Review & Reinforcement Mode...');
    
    await this.knowledgeGraph.addActivity({
      type: 'reinforcement_session',
      agent: 'Reinforcement Engine',
      message: 'Starting reinforcement session generation',
      status: 'in_progress'
    });

    // Get concepts that are due for reinforcement
    const conceptsToReview = await this.getConceptsForReinforcement();
    
    if (conceptsToReview.length === 0) {
      console.log('✅ No concepts need reinforcement at this time');
      await this.knowledgeGraph.addActivity({
        type: 'reinforcement_session',
        agent: 'Reinforcement Engine',
        message: 'No concepts ready for reinforcement',
        status: 'completed'
      });
      return null;
    }

    // Get user profile for personalized questions
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const userProfile = graph.user_profile;

    // Select concepts for this session (limit to 5 concepts)
    const selectedConcepts = this.selectConceptsForSession(conceptsToReview);
    
    console.log(`📚 Selected ${selectedConcepts.length} concepts for reinforcement`);

    const session = {
      id: this.generateSessionId(),
      concepts: selectedConcepts,
      questions: [],
      start_time: new Date().toISOString(),
      status: 'active',
      phase: 'reinforcement',
      user_profile: userProfile
    };

    // Generate adaptive questions for each concept
    for (const concept of selectedConcepts) {
      try {
        const questions = await this.generateAdaptiveQuestions(concept, userProfile, selectedConcepts);
        session.questions.push(...questions);
        
        await this.knowledgeGraph.addActivity({
          type: 'reinforcement_session',
          agent: 'Reinforcement Engine',
          message: `Generated ${questions.length} questions for "${concept.name}"`,
          status: 'completed',
          details: {
            concept: concept.name,
            questions_generated: questions.length,
            difficulty_levels: questions.map(q => q.difficulty)
          }
        });
        
      } catch (error) {
        console.error(`Error generating questions for concept "${concept.name}":`, error);
      }
    }

    // Shuffle questions for better learning experience
    session.questions = this.shuffleArray(session.questions);

    // Save session
    await this.saveReinforcementSession(session);

    console.log(`✅ Generated ${session.questions.length} reinforcement questions`);
    return session;
  }

  async generateAdaptiveQuestions(concept, userProfile, allConcepts) {
    const questions = await this.openai.generateReinforcementQuestions(concept, userProfile);
    
    return questions.questions.map(question => ({
      ...question,
      id: this.generateQuestionId(),
      concept_name: concept.name,
      concept_id: concept.name,
      session_id: null, // Will be set when session is created
      created_at: new Date().toISOString(),
      user_answer: null,
      is_answered: false,
      confidence_impact: this.calculateConfidenceImpact(question.difficulty, question.type)
    }));
  }

  /**
   * Process user's answer to a reinforcement question
   */
  async processUserAnswer(sessionId, questionId, userAnswer) {
    console.log(`📝 Processing answer for question: ${questionId}`);
    
    const session = await this.getReinforcementSession(sessionId);
    if (!session) {
      throw new Error('Reinforcement session not found');
    }

    const question = session.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error('Question not found in session');
    }

    // Get the concept details
    const concept = session.concepts.find(c => c.name === question.concept_name);
    if (!concept) {
      throw new Error(`Concept not found: ${question.concept_name}`);
    }

    // Analyze the user's answer
    const analysis = await this.openai.analyzeUserResponse(question.question, userAnswer, concept);
    
    // Update question with user's answer
    question.user_answer = userAnswer;
    question.is_answered = true;
    question.answered_at = new Date().toISOString();
    question.analysis = analysis;

    // Calculate new confidence based on performance
    const newConfidence = this.calculateNewConfidence(concept.confidence, analysis);
    
    // Update the concept
    concept.confidence = newConfidence;
    concept.last_reinforced = new Date().toISOString();
    concept.reinforcement_schedule = this.calculateNextReinforcement(newConfidence);

    // Update session
    session.questions_answered = (session.questions_answered || 0) + 1;
    session.last_activity = new Date().toISOString();

    await this.saveReinforcementSession(session);

    // Log the reinforcement activity
    await this.knowledgeGraph.addActivity({
      type: 'reinforcement_answer',
      agent: 'Reinforcement Engine',
      message: `Processed answer for "${concept.name}"`,
      status: 'completed',
      details: {
        session_id: sessionId,
        concept: concept.name,
        accuracy_score: analysis.accuracy_score,
        completeness_score: analysis.completeness_score,
        new_confidence: newConfidence,
        feedback: analysis.feedback
      }
    });

    return {
      analysis,
      newConfidence,
      concept: {
        ...concept,
        confidence: newConfidence,
        last_reinforced: new Date().toISOString()
      },
      nextQuestion: this.getNextQuestion(session)
    };
  }

  /**
   * Complete a reinforcement session
   */
  async completeReinforcementSession(sessionId) {
    console.log('✅ Completing reinforcement session...');
    
    const session = await this.getReinforcementSession(sessionId);
    if (!session) {
      throw new Error('Reinforcement session not found');
    }

    const answeredQuestions = session.questions.filter(q => q.is_answered);
    const sessionResults = {
      session_id: sessionId,
      concepts_reviewed: session.concepts.map(c => c.name),
      total_questions: session.questions.length,
      questions_answered: answeredQuestions.length,
      performance_scores: [],
      insights: [],
      end_time: new Date().toISOString(),
      phase: 'complete'
    };

    // Process all answered questions and collect results
    for (const question of answeredQuestions) {
      if (question.analysis) {
        sessionResults.performance_scores.push({
          concept: question.concept_name,
          accuracy: question.analysis.accuracy_score,
          completeness: question.analysis.completeness_score,
          new_confidence: session.concepts.find(c => c.name === question.concept_name)?.confidence
        });
        sessionResults.insights.push(question.analysis.feedback);
      }
    }

    // Calculate overall session performance
    if (sessionResults.performance_scores.length > 0) {
      const avgAccuracy = sessionResults.performance_scores.reduce((sum, score) => sum + score.accuracy, 0) / sessionResults.performance_scores.length;
      const avgCompleteness = sessionResults.performance_scores.reduce((sum, score) => sum + score.completeness, 0) / sessionResults.performance_scores.length;
      
      sessionResults.overall_performance = (avgAccuracy + avgCompleteness) / 2;
      sessionResults.performance_insights = this.generatePerformanceInsights(sessionResults);
    }

    // Update concepts in knowledge graph
    for (const concept of session.concepts) {
      await this.knowledgeGraph.addConcept(concept);
    }

    // Save the reinforcement session results
    await this.knowledgeGraph.addReinforcementSession(sessionResults);

    // Update session status
    session.status = 'completed';
    session.end_time = new Date().toISOString();
    session.results = sessionResults;
    await this.saveReinforcementSession(session);

    // Log completion activity
    await this.knowledgeGraph.addActivity({
      type: 'reinforcement_session',
      agent: 'Reinforcement Engine',
      message: `Completed reinforcement session with ${(sessionResults.overall_performance * 100).toFixed(1)}% performance`,
      status: 'completed',
      details: {
        session_id: sessionId,
        concepts_reviewed: sessionResults.concepts_reviewed.length,
        total_questions: sessionResults.total_questions,
        overall_performance: sessionResults.overall_performance
      }
    });

    return sessionResults;
  }

  /**
   * Get concepts that are due for reinforcement
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
   * Select concepts for this reinforcement session
   */
  selectConceptsForSession(concepts) {
    // Prioritize concepts based on:
    // 1. Low confidence scores
    // 2. Long time since last reinforcement
    // 3. Recent content sources
    
    const now = new Date();
    
    const scoredConcepts = concepts.map(concept => {
      let score = 0;
      
      // Lower confidence = higher priority
      score += (1 - (concept.confidence || 0.5)) * 3;
      
      // Longer time since last reinforcement = higher priority
      if (concept.last_reinforced) {
        const daysSinceReinforcement = (now - new Date(concept.last_reinforced)) / (1000 * 60 * 60 * 24);
        score += Math.min(daysSinceReinforcement / 7, 2); // Cap at 2 points
      } else {
        score += 2; // Never reinforced = high priority
      }
      
      // Recent sources = higher priority
      if (concept.sources && concept.sources.length > 0) {
        score += 0.5;
      }
      
      return { concept, score };
    });

    // Sort by score (highest first) and take top 5
    scoredConcepts.sort((a, b) => b.score - a.score);
    return scoredConcepts.slice(0, 5).map(item => item.concept);
  }

  calculateNewConfidence(currentConfidence, analysis) {
    const accuracyWeight = 0.6;
    const completenessWeight = 0.4;
    
    const performanceScore = (analysis.accuracy_score * accuracyWeight) + 
                           (analysis.completeness_score * completenessWeight);
    
    // Update confidence using weighted average
    const learningRate = 0.3; // How much the new performance affects confidence
    const newConfidence = (currentConfidence * (1 - learningRate)) + (performanceScore * learningRate);
    
    // Ensure confidence stays within bounds
    return Math.max(0, Math.min(1, newConfidence));
  }

  calculateNextReinforcement(confidence) {
    const now = new Date();
    let daysToAdd;
    
    if (confidence >= 0.9) {
      daysToAdd = 30; // High confidence - review in 1 month
    } else if (confidence >= 0.8) {
      daysToAdd = 14; // Good confidence - review in 2 weeks
    } else if (confidence >= 0.6) {
      daysToAdd = 7;  // Medium confidence - review in 1 week
    } else if (confidence >= 0.4) {
      daysToAdd = 3;  // Low confidence - review in 3 days
    } else {
      daysToAdd = 1;  // Very low confidence - review tomorrow
    }
    
    const nextDate = new Date(now.getTime() + (daysToAdd * 24 * 60 * 60 * 1000));
    return nextDate.toISOString();
  }

  calculateConfidenceImpact(difficulty, type) {
    // Higher difficulty and more complex question types have greater impact
    const difficultyMultiplier = {
      'beginner': 0.1,
      'intermediate': 0.2,
      'advanced': 0.3
    };
    
    const typeMultiplier = {
      'recall': 0.1,
      'application': 0.2,
      'analysis': 0.3,
      'synthesis': 0.4
    };
    
    return (difficultyMultiplier[difficulty] || 0.2) + (typeMultiplier[type] || 0.2);
  }

  getNextQuestion(session) {
    const unansweredQuestions = session.questions.filter(q => !q.is_answered);
    return unansweredQuestions.length > 0 ? unansweredQuestions[0] : null;
  }

  generatePerformanceInsights(sessionResults) {
    const insights = [];
    
    if (sessionResults.overall_performance >= 0.8) {
      insights.push("Excellent performance! Your understanding of these concepts is strong.");
    } else if (sessionResults.overall_performance >= 0.6) {
      insights.push("Good performance with room for improvement in some areas.");
    } else {
      insights.push("Consider reviewing these concepts more thoroughly before moving on.");
    }

    // Find concepts that performed poorly
    const lowPerformingConcepts = sessionResults.performance_scores.filter(score => 
      (score.accuracy + score.completeness) / 2 < 0.6
    );

    if (lowPerformingConcepts.length > 0) {
      insights.push(`Focus on reviewing: ${lowPerformingConcepts.map(c => c.concept).join(', ')}`);
    }

    return insights;
  }

  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  generateSessionId() {
    return `reinforcement_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateQuestionId() {
    return `question_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async getReinforcementSession(sessionId) {
    // In a real implementation, this would load from persistent storage
    return this.reinforcementSessions?.[sessionId] || null;
  }

  async saveReinforcementSession(session) {
    // In a real implementation, this would save to persistent storage
    if (!this.reinforcementSessions) {
      this.reinforcementSessions = {};
    }
    this.reinforcementSessions[session.id] = session;
  }

  async getReinforcementStats() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const sessions = graph.reinforcement_sessions;
    
    if (sessions.length === 0) {
      return {
        total_sessions: 0,
        average_performance: 0,
        concepts_reinforced: 0,
        last_session: null
      };
    }

    const totalSessions = sessions.length;
    const averagePerformance = sessions.reduce((sum, session) => sum + (session.overall_performance || 0), 0) / totalSessions;
    const allConcepts = new Set();
    sessions.forEach(session => {
      session.concepts_reviewed.forEach(concept => allConcepts.add(concept));
    });

    return {
      total_sessions: totalSessions,
      average_performance: averagePerformance,
      concepts_reinforced: allConcepts.size,
      last_session: sessions[sessions.length - 1],
      performance_trend: sessions.slice(-5).map(s => s.overall_performance)
    };
  }
}

module.exports = ReinforcementEngine;

