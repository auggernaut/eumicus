import { getCompletion, getJSONCompletion } from './openai-client.js';

/**
 * Generate reflection prompts based on lesson and quiz performance
 * @param {Object} lesson - Completed lesson
 * @param {Object} quizResults - Quiz results
 * @param {Object} memory - Learner's memory
 * @param {Object} profile - Learner's profile
 * @returns {Object} Reflection prompts and guidance
 */
export async function promptReflection(lesson, quizResults, memory, profile) {
  const recentConcepts = memory.concepts.slice(-5).map(c => c.name).join(', ');
  const recentReflections = memory.reflections.slice(-2).map(r => r.text).join('; ');
  
  const prompt = `
Generate personalized reflection prompts for this learning session:

LESSON COMPLETED: ${lesson.title}
QUIZ PERFORMANCE: ${quizResults.percentage}% (${quizResults.correctAnswers}/${quizResults.totalQuestions} correct)
LEARNER PROFILE: ${profile.learningStyle} style, ${profile.complexityLevel} level

RECENT LEARNING CONTEXT:
- Recent concepts learned: ${recentConcepts || 'None yet'}
- Recent reflections: ${recentReflections || 'None yet'}

Create 3-4 reflection prompts that help the learner:
1. Connect new knowledge to existing understanding
2. Identify patterns and relationships
3. Consider practical applications
4. Recognize their learning progress
5. Plan next steps

Make the prompts:
- Personal and engaging
- Appropriate for their learning style
- Connected to their recent learning journey
- Encouraging and growth-oriented

Respond with JSON containing an array of prompt objects, each with:
- question: The reflection question
- purpose: Why this question helps learning
- expectedInsight: What kind of insight this might generate
`;

  const schema = {
    prompts: [
      {
        question: "string",
        purpose: "string",
        expectedInsight: "string"
      }
    ]
  };

  try {
    const reflectionPrompts = await getJSONCompletion(prompt, schema);
    
    return {
      lessonTitle: lesson.title,
      prompts: reflectionPrompts.prompts,
      quizPerformance: quizResults.percentage,
      createdAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error generating reflection prompts:', error);
    
    // Return default reflection prompts
    return {
      lessonTitle: lesson.title,
      prompts: [
        {
          question: "What was the most interesting thing you learned about " + lesson.title + "?",
          purpose: "Help identify key takeaways and personal connections",
          expectedInsight: "Understanding of what resonates most with the learner"
        },
        {
          question: "How does this new knowledge connect to what you already knew?",
          purpose: "Build connections between new and existing knowledge",
          expectedInsight: "Recognition of knowledge relationships and patterns"
        },
        {
          question: "Where might you apply this knowledge in real life?",
          purpose: "Encourage practical application thinking",
          expectedInsight: "Understanding of practical relevance and use cases"
        },
        {
          question: "What would you like to learn more about related to this topic?",
          purpose: "Identify natural next steps and curiosity",
          expectedInsight: "Direction for future learning and interests"
        }
      ],
      quizPerformance: quizResults.percentage,
      createdAt: new Date().toISOString()
    };
  }
}

/**
 * Process learner's reflection responses
 * @param {Array} responses - Learner's responses to reflection prompts
 * @param {Object} reflectionSession - Original reflection prompts
 * @param {Object} profile - Learner's profile
 * @returns {Object} Processed reflection insights
 */
export async function processReflection(responses, reflectionSession, profile) {
  const prompt = `
Analyze these reflection responses and extract key learning insights:

REFLECTION SESSION: ${reflectionSession.lessonTitle}
QUIZ PERFORMANCE: ${reflectionSession.quizPerformance}%

RESPONSES:
${responses.map((response, index) => 
  `Q${index + 1}: ${reflectionSession.prompts[index].question}\nA${index + 1}: ${response}`
).join('\n\n')}

LEARNER PROFILE: ${profile.learningStyle} style, ${profile.complexityLevel} level

Extract and synthesize:
1. Key insights the learner gained
2. Connections they made to existing knowledge
3. Areas of curiosity or interest for future learning
4. Confidence level in the material
5. Learning patterns or preferences revealed

Respond with JSON containing:
- keyInsights: Array of main insights discovered
- connections: Array of knowledge connections made
- futureInterests: Array of topics they want to explore
- confidenceLevel: Number (0-1) based on their responses
- learningPatterns: Array of learning preferences observed
- summary: Brief synthesis of their reflection
`;

  const schema = {
    keyInsights: ["string"],
    connections: ["string"],
    futureInterests: ["string"],
    confidenceLevel: "number",
    learningPatterns: ["string"],
    summary: "string"
  };

  try {
    const insights = await getJSONCompletion(prompt, schema);
    
    return {
      sessionId: reflectionSession.lessonTitle,
      insights,
      responses,
      processedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error processing reflection:', error);
    
    // Return basic insights
    return {
      sessionId: reflectionSession.lessonTitle,
      insights: {
        keyInsights: ["Learner engaged with the material"],
        connections: ["Made some connections to existing knowledge"],
        futureInterests: ["Expressed interest in learning more"],
        confidenceLevel: 0.7,
        learningPatterns: ["Active reflection and engagement"],
        summary: "Learner demonstrated engagement and reflection on the material"
      },
      responses,
      processedAt: new Date().toISOString()
    };
  }
}

/**
 * Generate a reflection summary for memory storage
 * @param {Object} processedReflection - Processed reflection insights
 * @param {Object} lesson - Original lesson
 * @param {Object} quizResults - Quiz results
 * @returns {string} Formatted reflection text for memory
 */
export function generateReflectionSummary(processedReflection, lesson, quizResults) {
  const { insights } = processedReflection;
  
  let summary = `After learning about ${lesson.title} (scored ${quizResults.percentage}% on quiz), I reflected on: `;
  
  if (insights.keyInsights.length > 0) {
    summary += `Key insights: ${insights.keyInsights.join(', ')}. `;
  }
  
  if (insights.connections.length > 0) {
    summary += `Connections made: ${insights.connections.join(', ')}. `;
  }
  
  if (insights.futureInterests.length > 0) {
    summary += `Want to explore: ${insights.futureInterests.join(', ')}. `;
  }
  
  summary += insights.summary;
  
  return summary;
}

/**
 * Suggest follow-up learning based on reflection
 * @param {Object} processedReflection - Processed reflection insights
 * @param {Object} profile - Learner's profile
 * @returns {Array} Suggested next learning topics
 */
export function suggestFollowUpLearning(processedReflection, profile) {
  const { insights } = processedReflection;
  const suggestions = [];
  
  // Based on future interests
  insights.futureInterests.forEach(interest => {
    suggestions.push({
      topic: interest,
      reason: "Expressed interest during reflection",
      priority: "high"
    });
  });
  
  // Based on learning patterns
  if (insights.learningPatterns.includes("visual learning")) {
    suggestions.push({
      topic: "Visual examples and diagrams",
      reason: "Learner shows visual learning preferences",
      priority: "medium"
    });
  }
  
  // Based on confidence level
  if (insights.confidenceLevel < 0.6) {
    suggestions.push({
      topic: "Review and practice exercises",
      reason: "Lower confidence suggests need for reinforcement",
      priority: "high"
    });
  }
  
  return suggestions;
}

/**
 * Create a learning journal entry
 * @param {Object} sessionData - Complete session data
 * @returns {string} Journal entry text
 */
export function createJournalEntry(sessionData) {
  const { lesson, quizResults, reflection } = sessionData;
  
  const entry = `
📚 Learning Session: ${lesson.title}
📅 Date: ${new Date().toLocaleDateString()}
⏱️ Duration: ~${lesson.estimatedTime} minutes
📊 Quiz Score: ${quizResults.percentage}% (${quizResults.correctAnswers}/${quizResults.totalQuestions})

🎯 Key Learning:
${lesson.objectives.map(obj => `• ${obj}`).join('\n')}

💭 Reflection:
${reflection.insights.summary}

🔗 Connections Made:
${reflection.insights.connections.map(conn => `• ${conn}`).join('\n')}

🚀 Next Steps:
${reflection.insights.futureInterests.map(interest => `• Explore ${interest}`).join('\n')}

---
`;

  return entry;
}
