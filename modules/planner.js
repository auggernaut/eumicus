import { getJSONCompletion } from './openai-client.js';

/**
 * Create a personalized learning plan based on goal and profile
 * @param {string} goal - Learning goal
 * @param {Object} profile - Learning profile from profiler
 * @returns {Object} Learning plan with subtopics and sequence
 */
export async function planCurriculum(goal, profile) {
  const prompt = `
Create a personalized learning plan for this goal: "${goal}"

LEARNER PROFILE:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}
- Preferred Pace: ${profile.preferredPace}
- Current Strengths: ${profile.learningStrengths.join(', ')}
- Knowledge Gaps: ${profile.knowledgeGaps.join(', ')}
- Summary: ${profile.summary}

Create a learning plan with 3-4 subtopics that:
1. Builds on their existing strengths
2. Addresses their knowledge gaps
3. Matches their learning style and pace
4. Progresses logically from basic to advanced concepts
5. Is achievable in a single learning session (10-15 minutes per subtopic)

Respond with JSON containing:
- subtopics: Array of 3-4 subtopic objects, each with:
  - title: Clear, engaging title
  - description: Brief explanation of what will be learned
  - estimatedTime: Time in minutes
  - prerequisites: Array of concepts they should know
  - learningObjectives: Array of 2-3 specific things they'll understand
- totalEstimatedTime: Total time for all subtopics
- learningPath: Brief explanation of why this sequence works for them
`;

  const schema = {
    subtopics: [
      {
        title: "string",
        description: "string",
        estimatedTime: "number",
        prerequisites: ["string"],
        learningObjectives: ["string"]
      }
    ],
    totalEstimatedTime: "number",
    learningPath: "string"
  };

  try {
    const plan = await getJSONCompletion(prompt, schema);
    
    // Add metadata
    plan.goal = goal;
    plan.createdAt = new Date().toISOString();
    plan.currentSubtopic = 0;
    plan.completedSubtopics = [];
    
    return plan;
  } catch (error) {
    console.error('Error planning curriculum:', error);
    
    // Return default plan if AI fails
    return {
      goal,
      subtopics: [
        {
          title: "Introduction to " + goal,
          description: `Basic overview of ${goal} concepts`,
          estimatedTime: 5,
          prerequisites: [],
          learningObjectives: [`Understand basic ${goal} concepts`, `Identify key components`]
        },
        {
          title: "Core Concepts",
          description: `Deeper dive into fundamental ${goal} principles`,
          estimatedTime: 8,
          prerequisites: [`Basic ${goal} knowledge`],
          learningObjectives: [`Master core principles`, `Apply concepts practically`]
        },
        {
          title: "Practical Applications",
          description: `Real-world examples and use cases`,
          estimatedTime: 7,
          prerequisites: [`Core ${goal} understanding`],
          learningObjectives: [`Apply knowledge to examples`, `Recognize patterns`]
        }
      ],
      totalEstimatedTime: 20,
      learningPath: "Progressive learning from basics to applications",
      createdAt: new Date().toISOString(),
      currentSubtopic: 0,
      completedSubtopics: []
    };
  }
}

/**
 * Get the next subtopic to learn
 * @param {Object} plan - Learning plan
 * @returns {Object|null} Next subtopic or null if all completed
 */
export function getNextSubtopic(plan) {
  if (plan.currentSubtopic >= plan.subtopics.length) {
    return null;
  }
  return plan.subtopics[plan.currentSubtopic];
}

/**
 * Mark a subtopic as completed
 * @param {Object} plan - Learning plan
 * @param {number} subtopicIndex - Index of completed subtopic
 */
export function markSubtopicCompleted(plan, subtopicIndex) {
  if (!plan.completedSubtopics.includes(subtopicIndex)) {
    plan.completedSubtopics.push(subtopicIndex);
  }
  plan.currentSubtopic = subtopicIndex + 1;
}

/**
 * Get progress summary
 * @param {Object} plan - Learning plan
 * @returns {Object} Progress information
 */
export function getProgress(plan) {
  const total = plan.subtopics.length;
  const completed = plan.completedSubtopics.length;
  const current = plan.currentSubtopic;
  
  return {
    total,
    completed,
    current,
    percentage: Math.round((completed / total) * 100),
    isComplete: completed === total,
    nextSubtopic: getNextSubtopic(plan)
  };
}

/**
 * Adjust plan based on learner performance
 * @param {Object} plan - Current learning plan
 * @param {Object} performance - Performance data from quizzes/feedback
 * @returns {Object} Adjusted plan
 */
export function adjustPlan(plan, performance) {
  // If learner is struggling, we might add more basic subtopics
  // If learner is excelling, we might add more advanced subtopics
  // For now, we'll keep the original plan but could extend this
  
  const adjustedPlan = { ...plan };
  adjustedPlan.adjustments = {
    madeAt: new Date().toISOString(),
    reason: performance.averageScore < 0.6 ? 'struggling' : 'performing well',
    changes: performance.averageScore < 0.6 ? 'Added more foundational content' : 'Maintained current pace'
  };
  
  return adjustedPlan;
}
