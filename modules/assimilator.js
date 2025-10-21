import { getJSONCompletion } from './openai-client.js';
import { addConcept, addReflection, saveMemory } from './memory.js';

/**
 * Update memory with new concepts and insights from learning session
 * @param {Object} memory - Current memory object
 * @param {Object} sessionData - Complete session data (lesson, quiz, reflection)
 * @returns {Object} Updated memory and summary of changes
 */
export async function updateMemory(memory, sessionData) {
  const { lesson, quizResults, reflection } = sessionData;
  
  // Extract new concepts from the lesson
  const newConcepts = await extractConcepts(lesson, memory);
  
  // Calculate confidence based on quiz performance
  const confidenceLevel = calculateConfidence(quizResults);
  
  // Add new concepts to memory
  const addedConcepts = [];
  for (const concept of newConcepts) {
    addConcept(memory, concept.name, concept.confidence || confidenceLevel);
    addedConcepts.push(concept.name);
  }
  
  // Add reflection to memory
  const reflectionText = generateReflectionSummary(reflection, lesson, quizResults);
  addReflection(memory, reflectionText, lesson.title);
  
  // Update learning statistics
  updateLearningStats(memory, sessionData);
  
  // Save updated memory
  await saveMemory(memory);
  
  return {
    addedConcepts,
    confidenceLevel,
    reflectionText,
    memoryUpdated: true,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Extract key concepts from lesson content
 * @param {Object} lesson - Lesson object
 * @param {Object} memory - Current memory
 * @returns {Array} Array of concept objects
 */
async function extractConcepts(lesson, memory) {
  const existingConcepts = memory.concepts.map(c => c.name.toLowerCase());
  
  const prompt = `
Extract key concepts from this lesson content:

LESSON: ${lesson.title}
CONTENT: ${lesson.content.substring(0, 1000)}...

EXISTING CONCEPTS (don't repeat these): ${existingConcepts.join(', ')}

Identify 3-5 NEW key concepts that the learner should remember. For each concept:
1. Provide a clear, concise name
2. Estimate confidence level (0-1) based on lesson complexity
3. Include a brief description

Focus on concepts that are:
- Fundamental to understanding the topic
- Not already in their knowledge base
- Appropriate for their learning level
- Worth remembering for future learning

Respond with JSON array of concept objects.
`;

  const schema = [
    {
      name: "string",
      confidence: "number",
      description: "string"
    }
  ];

  try {
    const concepts = await getJSONCompletion(prompt, schema);
    return concepts;
  } catch (error) {
    console.error('Error extracting concepts:', error);
    
    // Fallback: extract basic concepts from lesson title and objectives
    return [
      {
        name: lesson.title,
        confidence: 0.7,
        description: `Core concepts from ${lesson.title}`
      }
    ];
  }
}

/**
 * Calculate confidence level based on quiz performance
 * @param {Object} quizResults - Quiz results
 * @returns {number} Confidence level (0-1)
 */
function calculateConfidence(quizResults) {
  const { percentage } = quizResults;
  
  // Map percentage to confidence level
  if (percentage >= 90) return 0.9;
  if (percentage >= 80) return 0.8;
  if (percentage >= 70) return 0.7;
  if (percentage >= 60) return 0.6;
  if (percentage >= 50) return 0.5;
  return 0.4; // Minimum confidence for attempted learning
}

/**
 * Update learning statistics in memory
 * @param {Object} memory - Memory object
 * @param {Object} sessionData - Session data
 */
function updateLearningStats(memory, sessionData) {
  // Initialize stats if they don't exist
  if (!memory.stats) {
    memory.stats = {
      totalSessions: 0,
      totalQuizScore: 0,
      averageQuizScore: 0,
      totalLearningTime: 0,
      conceptsLearned: 0,
      lastSessionDate: null
    };
  }
  
  const { lesson, quizResults } = sessionData;
  
  // Update statistics
  memory.stats.totalSessions += 1;
  memory.stats.totalQuizScore += quizResults.percentage;
  memory.stats.averageQuizScore = memory.stats.totalQuizScore / memory.stats.totalSessions;
  memory.stats.totalLearningTime += lesson.estimatedTime;
  memory.stats.conceptsLearned = memory.concepts.length;
  memory.stats.lastSessionDate = new Date().toISOString();
}

/**
 * Generate a reflection summary for memory storage
 * @param {Object} reflection - Reflection data
 * @param {Object} lesson - Lesson data
 * @param {Object} quizResults - Quiz results
 * @returns {string} Formatted reflection text
 */
function generateReflectionSummary(reflection, lesson, quizResults) {
  const { insights } = reflection;
  
  let summary = `Learned about ${lesson.title} and scored ${quizResults.percentage}% on the quiz. `;
  
  if (insights.keyInsights && insights.keyInsights.length > 0) {
    summary += `Key insights: ${insights.keyInsights.join(', ')}. `;
  }
  
  if (insights.connections && insights.connections.length > 0) {
    summary += `Made connections to: ${insights.connections.join(', ')}. `;
  }
  
  if (insights.futureInterests && insights.futureInterests.length > 0) {
    summary += `Interested in learning more about: ${insights.futureInterests.join(', ')}. `;
  }
  
  if (insights.summary) {
    summary += insights.summary;
  }
  
  return summary;
}

/**
 * Analyze learning progress over time
 * @param {Object} memory - Memory object
 * @returns {Object} Progress analysis
 */
export function analyzeProgress(memory) {
  if (!memory.stats || memory.stats.totalSessions === 0) {
    return {
      message: "No learning sessions completed yet",
      trends: [],
      recommendations: ["Start your first learning session!"]
    };
  }
  
  const { stats } = memory;
  const trends = [];
  const recommendations = [];
  
  // Analyze quiz performance trend
  if (stats.averageQuizScore >= 80) {
    trends.push("Excellent quiz performance - strong understanding");
    recommendations.push("Ready for more challenging topics");
  } else if (stats.averageQuizScore >= 60) {
    trends.push("Good quiz performance - solid understanding");
    recommendations.push("Continue building on current knowledge");
  } else {
    trends.push("Quiz performance suggests need for review");
    recommendations.push("Focus on reinforcing fundamentals");
  }
  
  // Analyze learning pace
  const avgTimePerSession = stats.totalLearningTime / stats.totalSessions;
  if (avgTimePerSession < 10) {
    trends.push("Quick learning pace - efficient sessions");
    recommendations.push("Consider longer, more detailed sessions");
  } else if (avgTimePerSession > 20) {
    trends.push("Thorough learning approach - detailed sessions");
    recommendations.push("Great depth of learning");
  }
  
  // Analyze concept growth
  const conceptsPerSession = stats.conceptsLearned / stats.totalSessions;
  if (conceptsPerSession >= 3) {
    trends.push("High concept acquisition rate");
    recommendations.push("Excellent knowledge building");
  }
  
  return {
    totalSessions: stats.totalSessions,
    averageQuizScore: Math.round(stats.averageQuizScore),
    totalLearningTime: stats.totalLearningTime,
    conceptsLearned: stats.conceptsLearned,
    trends,
    recommendations,
    lastSession: stats.lastSessionDate
  };
}

/**
 * Get learning recommendations based on memory analysis
 * @param {Object} memory - Memory object
 * @returns {Array} Learning recommendations
 */
export function getLearningRecommendations(memory) {
  const progress = analyzeProgress(memory);
  const recommendations = [...progress.recommendations];
  
  // Add recommendations based on recent reflections
  const recentReflections = memory.reflections.slice(-3);
  recentReflections.forEach(reflection => {
    if (reflection.text.includes('want to learn') || reflection.text.includes('interested in')) {
      recommendations.push("Follow up on recent learning interests");
    }
  });
  
  // Add recommendations based on concept gaps
  const lowConfidenceConcepts = memory.concepts.filter(c => c.confidence < 0.6);
  if (lowConfidenceConcepts.length > 0) {
    recommendations.push(`Review concepts: ${lowConfidenceConcepts.map(c => c.name).join(', ')}`);
  }
  
  return recommendations;
}

/**
 * Export memory data for backup or analysis
 * @param {Object} memory - Memory object
 * @returns {Object} Exportable memory data
 */
export function exportMemory(memory) {
  return {
    concepts: memory.concepts,
    reflections: memory.reflections,
    stats: memory.stats,
    exportedAt: new Date().toISOString(),
    version: "1.0"
  };
}

/**
 * Import memory data from backup
 * @param {Object} importData - Imported memory data
 * @returns {Object} Validated and cleaned memory object
 */
export function importMemory(importData) {
  const memory = {
    concepts: importData.concepts || [],
    reflections: importData.reflections || [],
    stats: importData.stats || null,
    lastUpdated: new Date().toISOString()
  };
  
  // Validate and clean data
  memory.concepts = memory.concepts.filter(c => c.name && typeof c.confidence === 'number');
  memory.reflections = memory.reflections.filter(r => r.text && r.date);
  
  return memory;
}
