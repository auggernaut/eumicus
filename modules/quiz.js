import { getJSONCompletion, getCompletion } from './openai-client.js';

/**
 * Generate quiz questions based on lesson content
 * @param {Object} lesson - Lesson object
 * @param {Object} profile - Learner's profile
 * @returns {Object} Quiz with questions and answers
 */
export async function generateQuiz(lesson, profile) {
  const prompt = `
Create a quiz based on this lesson: "${lesson.title}"

LESSON CONTENT:
${lesson.content}

LEARNING OBJECTIVES:
${lesson.objectives.join('\n')}

LEARNER PROFILE:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}

Create 3-5 quiz questions that:
1. Test understanding of the key concepts
2. Match the learner's complexity level
3. Include a mix of question types (multiple choice, short answer, true/false)
4. Are fair but challenging
5. Help reinforce the learning objectives

For each question, provide:
- The question text
- Correct answer
- Explanation of why the answer is correct
- Difficulty level (1-5, where 5 is hardest)

Respond with JSON containing an array of question objects.
`;

  const schema = {
    questions: [
      {
        id: "string",
        type: "string", // "multiple_choice", "short_answer", "true_false"
        question: "string",
        options: ["string"], // For multiple choice
        correctAnswer: "string",
        explanation: "string",
        difficulty: "number" // 1-5
      }
    ]
  };

  try {
    const quiz = await getJSONCompletion(prompt, schema);
    
    // Add metadata
    quiz.lessonTitle = lesson.title;
    quiz.createdAt = new Date().toISOString();
    quiz.totalQuestions = quiz.questions.length;
    quiz.estimatedTime = Math.ceil(quiz.totalQuestions * 2); // 2 minutes per question
    
    return quiz;
  } catch (error) {
    console.error('Error generating quiz:', error);
    
    // Return fallback quiz
    return {
      lessonTitle: lesson.title,
      questions: [
        {
          id: "1",
          type: "short_answer",
          question: `What is the main concept you learned about ${lesson.title}?`,
          correctAnswer: "Various answers accepted",
          explanation: "This question helps you reflect on the key takeaways from the lesson.",
          difficulty: 2
        },
        {
          id: "2",
          type: "true_false",
          question: `Did you find the lesson content appropriate for your learning level?`,
          correctAnswer: "True",
          explanation: "The lesson was designed to match your current knowledge level.",
          difficulty: 1
        }
      ],
      createdAt: new Date().toISOString(),
      totalQuestions: 2,
      estimatedTime: 4
    };
  }
}

/**
 * Grade a quiz answer
 * @param {Object} question - Quiz question
 * @param {string} userAnswer - User's answer
 * @param {Object} profile - Learner's profile
 * @returns {Object} Grading result
 */
export async function gradeAnswer(question, userAnswer, profile) {
  const prompt = `
Grade this quiz answer:

QUESTION: ${question.question}
TYPE: ${question.type}
CORRECT ANSWER: ${question.correctAnswer}
USER'S ANSWER: "${userAnswer}"
EXPLANATION: ${question.explanation}

LEARNER PROFILE:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}

Provide a grade and feedback that:
1. Is encouraging and constructive
2. Explains what was correct or incorrect
3. Offers additional insights if the answer was wrong
4. Celebrates good understanding
5. Suggests areas for improvement if needed

Respond with JSON containing:
- isCorrect: boolean
- score: number (0-1)
- feedback: string with detailed explanation
- suggestions: array of improvement suggestions (if any)
`;

  const schema = {
    isCorrect: "boolean",
    score: "number",
    feedback: "string",
    suggestions: ["string"]
  };

  try {
    const grade = await getJSONCompletion(prompt, schema);
    
    return {
      questionId: question.id,
      userAnswer,
      ...grade,
      gradedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error grading answer:', error);
    
    // Simple fallback grading
    const isCorrect = userAnswer.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    
    return {
      questionId: question.id,
      userAnswer,
      isCorrect,
      score: isCorrect ? 1 : 0,
      feedback: isCorrect 
        ? "Great job! That's correct." 
        : `Not quite. The correct answer is: ${question.correctAnswer}. ${question.explanation}`,
      suggestions: isCorrect ? [] : ["Review the lesson content", "Try to understand the underlying concept"],
      gradedAt: new Date().toISOString()
    };
  }
}

/**
 * Grade an entire quiz
 * @param {Object} quiz - Quiz object
 * @param {Array} answers - Array of user answers
 * @param {Object} profile - Learner's profile
 * @returns {Object} Complete quiz results
 */
export async function gradeQuiz(quiz, answers, profile) {
  const results = [];
  let totalScore = 0;
  
  for (let i = 0; i < quiz.questions.length; i++) {
    const question = quiz.questions[i];
    const userAnswer = answers[i] || "";
    
    const grade = await gradeAnswer(question, userAnswer, profile);
    results.push(grade);
    totalScore += grade.score;
  }
  
  const averageScore = totalScore / quiz.questions.length;
  const percentage = Math.round(averageScore * 100);
  
  // Generate overall feedback
  const overallFeedback = await generateOverallFeedback(quiz, results, averageScore, profile);
  
  return {
    quizId: quiz.lessonTitle,
    results,
    averageScore,
    percentage,
    totalQuestions: quiz.questions.length,
    correctAnswers: results.filter(r => r.isCorrect).length,
    overallFeedback,
    completedAt: new Date().toISOString()
  };
}

/**
 * Generate overall quiz feedback
 * @param {Object} quiz - Quiz object
 * @param {Array} results - Individual question results
 * @param {number} averageScore - Average score
 * @param {Object} profile - Learner's profile
 * @returns {string} Overall feedback
 */
async function generateOverallFeedback(quiz, results, averageScore, profile) {
  const prompt = `
Provide overall feedback for this quiz performance:

QUIZ: ${quiz.lessonTitle}
AVERAGE SCORE: ${Math.round(averageScore * 100)}%
TOTAL QUESTIONS: ${quiz.questions.length}
CORRECT ANSWERS: ${results.filter(r => r.isCorrect).length}

LEARNER PROFILE:
- Learning Style: ${profile.learningStyle}
- Complexity Level: ${profile.complexityLevel}

Provide encouraging, constructive feedback that:
1. Celebrates their achievements
2. Identifies areas of strength
3. Suggests areas for improvement
4. Motivates continued learning
5. Connects to their learning style

Keep it positive and actionable.
`;

  try {
    return await getCompletion(prompt, {
      temperature: 0.7,
      maxTokens: 300
    });
  } catch (error) {
    console.error('Error generating overall feedback:', error);
    
    if (averageScore >= 0.8) {
      return "Excellent work! You've demonstrated strong understanding of the material. Keep up the great learning!";
    } else if (averageScore >= 0.6) {
      return "Good job! You're on the right track. Consider reviewing the areas where you had difficulty to strengthen your understanding.";
    } else {
      return "Don't worry - learning takes time! Review the lesson content and try the quiz again. You're making progress!";
    }
  }
}

/**
 * Get quiz statistics
 * @param {Object} quizResults - Quiz results
 * @returns {Object} Statistics summary
 */
export function getQuizStats(quizResults) {
  const { results, averageScore, percentage } = quizResults;
  
  const difficultyStats = {};
  results.forEach(result => {
    const question = quizResults.quizId; // This would need the full quiz object
    // For now, we'll provide basic stats
  });
  
  return {
    averageScore,
    percentage,
    totalQuestions: quizResults.totalQuestions,
    correctAnswers: quizResults.correctAnswers,
    performance: percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : 'needs_improvement',
    recommendations: percentage >= 80 
      ? ['Ready for next topic', 'Great understanding demonstrated']
      : percentage >= 60 
      ? ['Review missed concepts', 'Practice with examples']
      : ['Revisit lesson content', 'Focus on fundamentals', 'Ask for clarification']
  };
}
