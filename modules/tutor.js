import { getCompletion } from './openai-client.js';

/**
 * Generate an interactive lesson for a specific subtopic
 * @param {Object} subtopic - Subtopic from learning plan
 * @param {Object} profile - Learner's profile
 * @param {Object} memory - Learner's memory/knowledge base
 * @returns {Object} Lesson content and structure
 */
export async function teachLesson(subtopic, profile, memory) {
  const knownConcepts = memory.concepts.map(c => c.name).join(', ');
  const recentReflections = memory.reflections.slice(-2).map(r => r.text).join('; ');
  
  const prompt = `
Create an engaging, interactive lesson for this subtopic: "${subtopic.title}"

LEARNER CONTEXT:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}
- Known Concepts: ${knownConcepts || 'None yet'}
- Recent Insights: ${recentReflections || 'None yet'}
- Learning Objectives: ${subtopic.learningObjectives.join(', ')}

LESSON REQUIREMENTS:
- Duration: ${subtopic.estimatedTime} minutes
- Style: Match their ${profile.learningStyle} learning style
- Level: Appropriate for ${profile.complexityLevel} level
- Connection: Build on their existing knowledge when possible
- Engagement: Include interactive elements and examples

Create a lesson with:
1. A clear, engaging introduction that connects to what they know
2. Core content broken into digestible sections
3. Practical examples or analogies
4. Interactive checkpoints or questions
5. A summary that reinforces key points

Make it conversational, encouraging, and personalized to their background.
`;

  try {
    const lessonContent = await getCompletion(prompt, {
      temperature: 0.8, // Slightly more creative for engaging content
      maxTokens: 3000
    });

    // Structure the lesson
    const lesson = {
      title: subtopic.title,
      content: lessonContent,
      objectives: subtopic.learningObjectives,
      estimatedTime: subtopic.estimatedTime,
      createdAt: new Date().toISOString(),
      style: profile.learningStyle,
      complexity: profile.complexityLevel
    };

    return lesson;
  } catch (error) {
    console.error('Error generating lesson:', error);
    
    // Return fallback lesson
    return {
      title: subtopic.title,
      content: `Let's explore ${subtopic.title}!\n\n${subtopic.description}\n\nThis topic builds on your existing knowledge and will help you understand ${subtopic.learningObjectives.join(' and ')}.\n\nWe'll start with the basics and work our way up to more complex concepts.`,
      objectives: subtopic.learningObjectives,
      estimatedTime: subtopic.estimatedTime,
      createdAt: new Date().toISOString(),
      style: profile.learningStyle,
      complexity: profile.complexityLevel
    };
  }
}

/**
 * Generate follow-up explanations for specific questions
 * @param {string} question - Learner's question
 * @param {Object} lesson - Current lesson context
 * @param {Object} profile - Learner's profile
 * @returns {string} Detailed explanation
 */
export async function explainFurther(question, lesson, profile) {
  const prompt = `
The learner has a follow-up question about the lesson "${lesson.title}".

Question: "${question}"

LEARNER PROFILE:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}

LESSON CONTEXT:
${lesson.content.substring(0, 500)}...

Provide a clear, helpful explanation that:
1. Directly answers their question
2. Connects to the lesson content
3. Uses examples appropriate for their learning style
4. Maintains the right complexity level
5. Encourages further learning

Keep it concise but thorough.
`;

  try {
    return await getCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 1000
    });
  } catch (error) {
    console.error('Error generating explanation:', error);
    return "I'd be happy to help explain that further. Could you rephrase your question or let me know which specific part you'd like me to clarify?";
  }
}

/**
 * Generate analogies to help explain complex concepts
 * @param {string} concept - Concept to explain
 * @param {Object} profile - Learner's profile
 * @returns {string} Analogy explanation
 */
export async function createAnalogy(concept, profile) {
  const prompt = `
Create a helpful analogy to explain this concept: "${concept}"

LEARNER PROFILE:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}

Create an analogy that:
1. Uses familiar, everyday concepts
2. Matches their learning style (visual, practical, analytical, or conceptual)
3. Is appropriate for their complexity level
4. Makes the abstract concept more concrete
5. Includes a clear connection between the analogy and the real concept

Keep it simple but accurate.
`;

  try {
    return await getCompletion(prompt, {
      temperature: 0.9, // Higher creativity for analogies
      maxTokens: 800
    });
  } catch (error) {
    console.error('Error creating analogy:', error);
    return `Think of ${concept} like building blocks - each piece connects to others to create something bigger and more complex.`;
  }
}

/**
 * Check if learner understands the lesson
 * @param {Object} lesson - Current lesson
 * @param {string} response - Learner's response to understanding check
 * @returns {Object} Understanding assessment
 */
export async function assessUnderstanding(lesson, response) {
  const prompt = `
Assess the learner's understanding based on their response to the lesson "${lesson.title}".

LESSON OBJECTIVES:
${lesson.objectives.join('\n')}

LEARNER RESPONSE:
"${response}"

Evaluate their understanding and provide:
1. A confidence score (0-1) for their comprehension
2. Specific areas they understand well
3. Areas that need clarification
4. Suggested next steps

Respond in a supportive, encouraging tone.
`;

  try {
    const assessment = await getCompletion(prompt, {
      temperature: 0.5,
      maxTokens: 500
    });

    return {
      response: assessment,
      timestamp: new Date().toISOString(),
      lessonTitle: lesson.title
    };
  } catch (error) {
    console.error('Error assessing understanding:', error);
    return {
      response: "Thank you for sharing your thoughts! Let's continue with the lesson to build on your understanding.",
      timestamp: new Date().toISOString(),
      lessonTitle: lesson.title
    };
  }
}
