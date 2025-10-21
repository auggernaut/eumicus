const OpenAIClient = require('./openai-client');

class KnowledgeReinforcer {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  async generateReinforcementSession() {
    console.log('🔄 Generating reinforcement session...');
    
    await this.knowledgeGraph.addActivity({
      type: 'reinforcement',
      agent: 'Knowledge Reinforcer',
      message: 'Starting reinforcement session generation',
      status: 'in_progress'
    });

    // Get concepts that need reinforcement
    const conceptsToReview = await this.knowledgeGraph.getConceptsForReinforcement();
    
    if (conceptsToReview.length === 0) {
      console.log('✅ No concepts need reinforcement at this time');
      return null;
    }

    // Get user profile for personalized questions
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const userProfile = graph.user_profile;

    // Select concepts for this session (limit to 3-5 concepts)
    const selectedConcepts = this.selectConceptsForSession(conceptsToReview);
    
    console.log(`📚 Selected ${selectedConcepts.length} concepts for reinforcement`);

    const session = {
      concepts: [],
      questions: [],
      start_time: new Date().toISOString(),
      status: 'active'
    };

    // Generate questions for each concept
    for (const concept of selectedConcepts) {
      try {
        const questions = await this.generateQuestionsForConcept(concept, userProfile);
        session.concepts.push(concept);
        session.questions.push(...questions);
        
        await this.knowledgeGraph.addActivity({
          type: 'reinforcement',
          agent: 'Knowledge Reinforcer',
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

    console.log(`✅ Generated ${session.questions.length} reinforcement questions`);
    return session;
  }

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

  async generateQuestionsForConcept(concept, userProfile) {
    const questions = await this.openai.generateReinforcementQuestions(concept, userProfile);
    
    return questions.questions.map(question => ({
      ...question,
      concept_name: concept.name,
      concept_id: concept.name, // Using name as ID for simplicity
      created_at: new Date().toISOString()
    }));
  }

  async processUserAnswer(question, userAnswer) {
    console.log(`📝 Processing answer for: ${question.question}`);
    
    // Get the concept details
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const concept = graph.concepts.find(c => c.name === question.concept_name);
    
    if (!concept) {
      throw new Error(`Concept not found: ${question.concept_name}`);
    }

    // Analyze the user's answer
    const analysis = await this.openai.analyzeUserResponse(question.question, userAnswer, concept);
    
    // Update concept confidence based on performance
    const newConfidence = this.calculateNewConfidence(concept.confidence, analysis);
    
    // Update the concept in the knowledge graph
    await this.knowledgeGraph.addConcept({
      ...concept,
      confidence: newConfidence,
      last_reinforced: new Date().toISOString(),
      reinforcement_schedule: this.calculateNextReinforcement(newConfidence)
    });

    // Log the reinforcement activity
    await this.knowledgeGraph.addActivity({
      type: 'reinforcement',
      agent: 'Knowledge Reinforcer',
      message: `Processed answer for "${concept.name}"`,
      status: 'completed',
      details: {
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
      }
    };
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

  async completeReinforcementSession(session, userAnswers) {
    console.log('✅ Completing reinforcement session...');
    
    const sessionResults = {
      concepts_reviewed: session.concepts.map(c => c.name),
      total_questions: session.questions.length,
      answers_provided: userAnswers.length,
      performance_scores: [],
      insights: [],
      end_time: new Date().toISOString()
    };

    // Process all answers and collect results
    for (const answer of userAnswers) {
      try {
        const question = session.questions.find(q => q.concept_name === answer.concept_name);
        if (question) {
          const result = await this.processUserAnswer(question, answer.answer);
          sessionResults.performance_scores.push({
            concept: answer.concept_name,
            accuracy: result.analysis.accuracy_score,
            completeness: result.analysis.completeness_score,
            new_confidence: result.newConfidence
          });
          sessionResults.insights.push(result.analysis.feedback);
        }
      } catch (error) {
        console.error(`Error processing answer for ${answer.concept_name}:`, error);
      }
    }

    // Calculate overall session performance
    const avgAccuracy = sessionResults.performance_scores.reduce((sum, score) => sum + score.accuracy, 0) / sessionResults.performance_scores.length;
    const avgCompleteness = sessionResults.performance_scores.reduce((sum, score) => sum + score.completeness, 0) / sessionResults.performance_scores.length;
    
    sessionResults.overall_performance = (avgAccuracy + avgCompleteness) / 2;
    sessionResults.performance_insights = this.generatePerformanceInsights(sessionResults);

    // Save the reinforcement session
    await this.knowledgeGraph.addReinforcementSession(sessionResults);

    // Log completion activity
    await this.knowledgeGraph.addActivity({
      type: 'reinforcement',
      agent: 'Knowledge Reinforcer',
      message: `Completed reinforcement session with ${sessionResults.overall_performance.toFixed(2)} performance`,
      status: 'completed',
      details: {
        concepts_reviewed: sessionResults.concepts_reviewed.length,
        total_questions: sessionResults.total_questions,
        overall_performance: sessionResults.overall_performance
      }
    });

    return sessionResults;
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

module.exports = KnowledgeReinforcer;
