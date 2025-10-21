import { getJSONCompletion } from './openai-client.js';
import { getConceptsByConfidence, getRecentReflections } from './memory.js';

/**
 * Analyze user's existing knowledge and create a learning profile
 * @param {Object} memory - User's memory object
 * @returns {Object} Learning profile with strengths, gaps, and learning style
 */
export async function profileMemory(memory) {
  const concepts = getConceptsByConfidence(memory);
  const recentReflections = getRecentReflections(memory, 3);
  
  const prompt = `
Analyze this learner's knowledge profile and create a personalized learning assessment:

KNOWN CONCEPTS (with confidence levels):
${concepts.map(c => `- ${c.name}: ${Math.round(c.confidence * 100)}% confidence`).join('\n')}

RECENT REFLECTIONS:
${recentReflections.map(r => `- ${r.text}`).join('\n')}

Please provide a JSON response with:
1. learningStrengths: Array of 3-5 areas where the learner shows strong understanding
2. knowledgeGaps: Array of 3-5 areas that could be improved or are missing
3. learningStyle: One of "visual", "analytical", "practical", "conceptual" based on their reflections
4. complexityLevel: "beginner", "intermediate", or "advanced" based on their concept confidence
5. preferredPace: "slow", "moderate", or "fast" based on their learning patterns
6. summary: A brief 2-3 sentence summary of their current knowledge state
`;

  const schema = {
    learningStrengths: ["string"],
    knowledgeGaps: ["string"],
    learningStyle: "string",
    complexityLevel: "string",
    preferredPace: "string",
    summary: "string"
  };

  try {
    const profile = await getJSONCompletion(prompt, schema);
    
    // Add metadata
    profile.analyzedAt = new Date().toISOString();
    profile.totalConcepts = memory.concepts.length;
    profile.averageConfidence = memory.concepts.length > 0 
      ? memory.concepts.reduce((sum, c) => sum + c.confidence, 0) / memory.concepts.length 
      : 0;
    
    return profile;
  } catch (error) {
    console.error('Error profiling memory:', error);
    
    // Return default profile if AI fails
    return {
      learningStrengths: ["general knowledge"],
      knowledgeGaps: ["specific expertise"],
      learningStyle: "analytical",
      complexityLevel: "beginner",
      preferredPace: "moderate",
      summary: "New learner with basic knowledge foundation",
      analyzedAt: new Date().toISOString(),
      totalConcepts: memory.concepts.length,
      averageConfidence: 0
    };
  }
}

/**
 * Get learning recommendations based on profile
 * @param {Object} profile - Learning profile
 * @param {string} goal - Learning goal
 * @returns {Array} Array of learning recommendations
 */
export function getLearningRecommendations(profile, goal) {
  const recommendations = [];
  
  // Pace recommendations
  if (profile.preferredPace === "slow") {
    recommendations.push("Focus on one concept at a time with detailed explanations");
  } else if (profile.preferredPace === "fast") {
    recommendations.push("Provide quick overviews with key points highlighted");
  }
  
  // Style recommendations
  if (profile.learningStyle === "visual") {
    recommendations.push("Use diagrams, examples, and visual metaphors");
  } else if (profile.learningStyle === "practical") {
    recommendations.push("Include hands-on examples and real-world applications");
  } else if (profile.learningStyle === "analytical") {
    recommendations.push("Provide step-by-step logical explanations");
  } else if (profile.learningStyle === "conceptual") {
    recommendations.push("Focus on big-picture understanding and connections");
  }
  
  // Complexity recommendations
  if (profile.complexityLevel === "beginner") {
    recommendations.push("Start with fundamental concepts and build gradually");
  } else if (profile.complexityLevel === "advanced") {
    recommendations.push("Dive into nuanced details and advanced applications");
  }
  
  return recommendations;
}
