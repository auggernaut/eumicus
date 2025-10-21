const OpenAI = require('openai');

class OpenAIClient {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }
    
    this.client = new OpenAI({
      apiKey: apiKey
    });
  }

  async generateResponse(messages, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4o',
        messages: messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 2000,
        ...options
      });

      return response.choices[0].message.content;
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  async generateStructuredResponse(messages, schema, options = {}) {
    try {
      const response = await this.client.chat.completions.create({
        model: options.model || 'gpt-4o',
        messages: [
          ...messages,
          {
            role: 'system',
            content: `Respond with valid JSON that matches this schema: ${JSON.stringify(schema)}`
          }
        ],
        temperature: options.temperature || 0.3,
        max_tokens: options.max_tokens || 2000,
        response_format: { type: "json_object" },
        ...options
      });

      const content = response.choices[0].message.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('OpenAI structured response error:', error);
      throw error;
    }
  }

  async extractConcepts(text, existingConcepts = []) {
    const messages = [
      {
        role: 'system',
        content: `You are a knowledge extraction expert. Analyze the given text and extract key concepts, ideas, and insights. 
        Focus on:
        - Technical concepts and terminology
        - Important ideas and principles
        - Skills and knowledge areas
        - Relationships between concepts
        
        Consider existing concepts: ${existingConcepts.map(c => c.name).join(', ')}
        Build upon and connect to existing knowledge when possible.`
      },
      {
        role: 'user',
        content: text
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        concepts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              confidence: { type: 'number', minimum: 0, maximum: 1 },
              category: { type: 'string' },
              connections: { type: 'array', items: { type: 'string' } }
            },
            required: ['name', 'description', 'confidence']
          }
        },
        insights: {
          type: 'array',
          items: { type: 'string' }
        },
        key_takeaways: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['concepts', 'insights', 'key_takeaways']
    };

    return await this.generateStructuredResponse(messages, schema);
  }

  async generateReinforcementQuestions(concept, userProfile) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert tutor creating reinforcement questions. Generate questions that help the user deepen their understanding of the concept.
        
        User profile: ${JSON.stringify(userProfile)}
        Concept: ${JSON.stringify(concept)}
        
        Create questions that:
        - Test understanding at different levels (recall, application, analysis)
        - Connect to the user's interests and goals
        - Build on their existing knowledge
        - Are appropriate for their learning style`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              question: { type: 'string' },
              type: { type: 'string', enum: ['recall', 'application', 'analysis', 'synthesis'] },
              difficulty: { type: 'string', enum: ['beginner', 'intermediate', 'advanced'] },
              expected_answer: { type: 'string' }
            },
            required: ['question', 'type', 'difficulty']
          }
        }
      },
      required: ['questions']
    };

    return await this.generateStructuredResponse(messages, schema);
  }

  async analyzeUserResponse(question, userAnswer, concept) {
    const messages = [
      {
        role: 'system',
        content: `You are an expert tutor analyzing a user's response to a reinforcement question. 
        Evaluate the response for:
        - Accuracy and completeness
        - Depth of understanding
        - Connection to related concepts
        - Areas for improvement
        
        Provide constructive feedback and suggest next steps.`
      },
      {
        role: 'user',
        content: `Question: ${question}
        User's Answer: ${userAnswer}
        Concept: ${JSON.stringify(concept)}`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        accuracy_score: { type: 'number', minimum: 0, maximum: 1 },
        completeness_score: { type: 'number', minimum: 0, maximum: 1 },
        feedback: { type: 'string' },
        strengths: { type: 'array', items: { type: 'string' } },
        areas_for_improvement: { type: 'array', items: { type: 'string' } },
        suggested_resources: { type: 'array', items: { type: 'string' } },
        next_steps: { type: 'array', items: { type: 'string' } }
      },
      required: ['accuracy_score', 'completeness_score', 'feedback']
    };

    return await this.generateStructuredResponse(messages, schema);
  }

  async identifyKnowledgeGaps(userProfile, concepts, contentItems) {
    const messages = [
      {
        role: 'system',
        content: `You are a learning analytics expert. Analyze the user's knowledge profile and identify gaps and opportunities for growth.
        
        Focus on:
        - Missing foundational concepts
        - Areas where knowledge is shallow
        - Connections that could be strengthened
        - New areas that align with their goals and interests`
      },
      {
        role: 'user',
        content: `User Profile: ${JSON.stringify(userProfile)}
        Current Concepts: ${JSON.stringify(concepts)}
        Recent Content: ${JSON.stringify(contentItems.slice(-5))}`
      }
    ];

    const schema = {
      type: 'object',
      properties: {
        knowledge_gaps: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              area: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
              reason: { type: 'string' },
              suggested_resources: { type: 'array', items: { type: 'string' } }
            },
            required: ['area', 'priority', 'reason']
          }
        },
        exploration_suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              topic: { type: 'string' },
              connection_to_goals: { type: 'string' },
              difficulty_level: { type: 'string' },
              estimated_time: { type: 'string' }
            },
            required: ['topic', 'connection_to_goals']
          }
        }
      },
      required: ['knowledge_gaps', 'exploration_suggestions']
    };

    return await this.generateStructuredResponse(messages, schema);
  }

  async findConceptConnections(newConcepts, existingConcepts) {
    const messages = [
      {
        role: 'system',
        content: `You are a knowledge mapping expert. Find meaningful connections between new concepts and existing knowledge.
        
        Look for:
        - Direct relationships (prerequisites, applications, examples)
        - Indirect connections (shared principles, similar patterns)
        - Learning pathways (how concepts build on each other)
        - Cross-domain connections (unexpected but valuable links)`
      },
      {
        role: 'user',
        content: `New Concepts: ${JSON.stringify(newConcepts)}
        Existing Concepts: ${JSON.stringify(existingConcepts.map(c => ({ name: c.name, connections: c.connections })))}`
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
              from_concept: { type: 'string' },
              to_concept: { type: 'string' },
              relationship_type: { type: 'string' },
              strength: { type: 'number', minimum: 0, maximum: 1 },
              description: { type: 'string' }
            },
            required: ['from_concept', 'to_concept', 'relationship_type', 'strength']
          }
        }
      },
      required: ['connections']
    };

    return await this.generateStructuredResponse(messages, schema);
  }
}

module.exports = OpenAIClient;
