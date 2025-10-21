const OpenAIClient = require('./openai-client');

class UserProfiler {
  constructor(openaiClient, knowledgeGraphManager) {
    this.openai = openaiClient;
    this.knowledgeGraph = knowledgeGraphManager;
  }

  async conductDeepDiveConversation() {
    console.log('🧠 Starting deep-dive conversation to understand your learning profile...');
    
    const conversationFlow = [
      {
        phase: 'goals',
        questions: [
          "What are your primary learning goals? What do you want to achieve or understand better?",
          "Are there specific skills or knowledge areas you want to develop?",
          "What would success look like for you in 6 months? A year?"
        ]
      },
      {
        phase: 'interests',
        questions: [
          "What topics or fields are you most passionate about?",
          "What subjects do you find yourself naturally drawn to?",
          "Are there any areas you're curious about but haven't explored yet?"
        ]
      },
      {
        phase: 'current_knowledge',
        questions: [
          "What are your strongest knowledge areas? What do you feel confident about?",
          "What topics have you studied or worked with before?",
          "Are there any areas where you feel your knowledge is incomplete or outdated?"
        ]
      },
      {
        phase: 'learning_style',
        questions: [
          "How do you prefer to learn? (visual, hands-on, reading, discussion, etc.)",
          "What learning methods have worked best for you in the past?",
          "How much time can you realistically commit to learning each day or week?"
        ]
      },
      {
        phase: 'context',
        questions: [
          "What's your professional or academic background?",
          "Are there any specific projects or challenges you're working on?",
          "What kind of content do you typically consume? (articles, videos, podcasts, books, etc.)"
        ]
      }
    ];

    const profile = {
      goals: [],
      interests: [],
      current_knowledge: [],
      learning_style: '',
      time_commitment: '',
      background: '',
      content_preferences: [],
      created_at: new Date().toISOString()
    };

    // Return the conversation flow and initial profile for the web interface to handle
    return {
      conversationFlow,
      profile,
      currentPhase: 0,
      currentQuestion: 0,
      isComplete: false
    };
  }

  async processUserResponse(conversationState, userResponse) {
    const { conversationFlow, profile, currentPhase, currentQuestion } = conversationState;
    
    if (currentPhase >= conversationFlow.length) {
      return { ...conversationState, isComplete: true };
    }

    const phase = conversationFlow[currentPhase];
    const question = phase.questions[currentQuestion];
    
    // Process the user's response for this phase
    await this.processPhaseResponse(phase.phase, userResponse, profile);
    
    // Move to next question or phase
    let nextPhase = currentPhase;
    let nextQuestion = currentQuestion + 1;
    
    if (nextQuestion >= phase.questions.length) {
      nextPhase = currentPhase + 1;
      nextQuestion = 0;
    }
    
    const isComplete = nextPhase >= conversationFlow.length;
    
    return {
      ...conversationState,
      profile,
      currentPhase: nextPhase,
      currentQuestion: nextQuestion,
      isComplete
    };
  }

  getCurrentQuestion(conversationState) {
    const { conversationFlow, currentPhase, currentQuestion } = conversationState;
    
    if (currentPhase >= conversationFlow.length) {
      return null;
    }
    
    const phase = conversationFlow[currentPhase];
    return {
      phase: phase.phase,
      question: phase.questions[currentQuestion],
      phaseTitle: phase.phase.replace('_', ' ').toUpperCase(),
      progress: {
        currentPhase: currentPhase + 1,
        totalPhases: conversationFlow.length,
        currentQuestion: currentQuestion + 1,
        totalQuestions: phase.questions.length
      }
    };
  }

  async completeProfiling(conversationState) {
    const { profile } = conversationState;
    
    // Analyze the complete profile
    const analyzedProfile = await this.analyzeUserProfile(profile);
    
    // Save to knowledge graph
    await this.knowledgeGraph.updateUserProfile(analyzedProfile);
    
    // Log the profiling activity
    await this.knowledgeGraph.addActivity({
      type: 'user_profiling',
      agent: 'User Profiler',
      message: 'Completed deep-dive conversation and user profile analysis',
      status: 'completed',
      details: {
        goals_identified: analyzedProfile.goals.length,
        interests_identified: analyzedProfile.interests.length,
        knowledge_areas: analyzedProfile.current_knowledge.length
      }
    });

    console.log('\n✅ User profile analysis complete!');
    return analyzedProfile;
  }

  async processPhaseResponse(phase, response, profile) {
    const messages = [
      {
        role: 'system',
        content: `You are analyzing a user's response to understand their learning profile. Extract key information and categorize it appropriately.
        
        Phase: ${phase}
        Response: ${response}
        
        Extract and structure the information for the user profile.`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        extracted_goals: { type: 'array', items: { type: 'string' } },
        extracted_interests: { type: 'array', items: { type: 'string' } },
        extracted_knowledge: { type: 'array', items: { type: 'string' } },
        learning_style_indicators: { type: 'array', items: { type: 'string' } },
        time_commitment_indicators: { type: 'array', items: { type: 'string' } },
        background_info: { type: 'array', items: { type: 'string' } },
        content_preferences: { type: 'array', items: { type: 'string' } }
      }
    };

    try {
      const analysis = await this.openai.generateStructuredResponse(messages, schema);
      
      // Merge extracted information into profile
      if (analysis.extracted_goals) profile.goals.push(...analysis.extracted_goals);
      if (analysis.extracted_interests) profile.interests.push(...analysis.extracted_interests);
      if (analysis.extracted_knowledge) profile.current_knowledge.push(...analysis.extracted_knowledge);
      if (analysis.learning_style_indicators) profile.learning_style = analysis.learning_style_indicators.join(', ');
      if (analysis.time_commitment_indicators) profile.time_commitment = analysis.time_commitment_indicators.join(', ');
      if (analysis.background_info) profile.background = analysis.background_info.join(', ');
      if (analysis.content_preferences) profile.content_preferences.push(...analysis.content_preferences);
      
    } catch (error) {
      console.error('Error processing phase response:', error);
    }
  }

  async analyzeUserProfile(profile) {
    const messages = [
      {
        role: 'system',
        content: `You are a learning analytics expert. Analyze this user profile and provide insights and recommendations.
        
        Profile: ${JSON.stringify(profile)}
        
        Provide:
        - Consolidated and deduplicated information
        - Learning style assessment
        - Recommended learning approach
        - Initial concept suggestions based on their goals and interests`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        consolidated_goals: { type: 'array', items: { type: 'string' } },
        consolidated_interests: { type: 'array', items: { type: 'string' } },
        consolidated_knowledge: { type: 'array', items: { type: 'string' } },
        learning_style_assessment: { type: 'string' },
        recommended_approach: { type: 'string' },
        initial_concepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              category: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] }
            },
            required: ['name', 'description', 'confidence', 'category']
          }
        },
        insights: { type: 'array', items: { type: 'string' } }
      },
      required: ['consolidated_goals', 'consolidated_interests', 'consolidated_knowledge', 'learning_style_assessment']
    };

    try {
      const analysis = await this.openai.generateStructuredResponse(messages, schema);
      
      // Create the final analyzed profile
      const analyzedProfile = {
        goals: analysis.consolidated_goals || profile.goals,
        interests: analysis.consolidated_interests || profile.interests,
        current_knowledge: analysis.consolidated_knowledge || profile.current_knowledge,
        learning_style: analysis.learning_style_assessment || profile.learning_style,
        time_commitment: profile.time_commitment,
        background: profile.background,
        content_preferences: profile.content_preferences,
        recommended_approach: analysis.recommended_approach,
        insights: analysis.insights || [],
        created_at: profile.created_at,
        analyzed_at: new Date().toISOString()
      };

      // Add initial concepts to the knowledge graph
      if (analysis.initial_concepts) {
        for (const concept of analysis.initial_concepts) {
          await this.knowledgeGraph.addConcept(concept);
        }
      }

      return analyzedProfile;
      
    } catch (error) {
      console.error('Error analyzing user profile:', error);
      return profile;
    }
  }

  async updateProfileFromInteraction(interaction) {
    // This method would be called after user interactions to update the profile
    // based on new insights about their learning patterns
    const currentProfile = await this.knowledgeGraph.loadKnowledgeGraph();
    const userProfile = currentProfile.user_profile;
    
    // Analyze the interaction for profile updates
    const messages = [
      {
        role: 'system',
        content: `Analyze this user interaction to identify any updates to their learning profile.
        
        Current Profile: ${JSON.stringify(userProfile)}
        Interaction: ${JSON.stringify(interaction)}
        
        Identify any new goals, interests, or learning preferences that emerged.`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        new_goals: { type: 'array', items: { type: 'string' } },
        new_interests: { type: 'array', items: { type: 'string' } },
        learning_style_updates: { type: 'string' },
        profile_insights: { type: 'array', items: { type: 'string' } }
      }
    };

    try {
      const updates = await this.openai.generateStructuredResponse(messages, schema);
      
      // Apply updates to profile
      if (updates.new_goals) userProfile.goals.push(...updates.new_goals);
      if (updates.new_interests) userProfile.interests.push(...updates.new_interests);
      if (updates.learning_style_updates) {
        userProfile.learning_style = updates.learning_style_updates;
      }
      
      await this.knowledgeGraph.updateUserProfile(userProfile);
      
      return userProfile;
      
    } catch (error) {
      console.error('Error updating profile from interaction:', error);
      return userProfile;
    }
  }
}

module.exports = UserProfiler;
