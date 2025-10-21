import chalk from 'chalk';
import ora from 'ora';
import { loadMemory, saveSession, clearSession } from '../modules/memory.js';
import { profileMemory } from '../modules/profiler.js';
import { planCurriculum, getNextSubtopic, markSubtopicCompleted } from '../modules/planner.js';
import { teachLesson } from '../modules/tutor.js';
import { generateQuiz, gradeQuiz } from '../modules/quiz.js';
import { promptReflection, processReflection } from '../modules/reflection.js';
import { updateMemory, analyzeProgress } from '../modules/assimilator.js';
import { isConfigured } from '../modules/openai-client.js';

/**
 * Main learning pipeline that orchestrates the entire learning session
 * @param {string} goal - Learning goal from user
 * @param {Function} askUser - Function to get user input
 * @param {Function} displayContent - Function to display content to user
 * @returns {Object} Session results
 */
export async function runLearningPipeline(goal, askUser, displayContent) {
  console.log(chalk.blue.bold('\n🧠 Eumicus - AI-Assisted Adaptive Learning\n'));
  
  // Check OpenAI configuration
  if (!isConfigured()) {
    throw new Error('OpenAI API key not configured. Please set OPENAI_API_KEY in your environment.');
  }
  
  const sessionData = {
    goal,
    startTime: new Date().toISOString(),
    steps: []
  };
  
  try {
    // Step 1: Load memory
    const memorySpinner = ora('Loading your learning memory...').start();
    const memory = await loadMemory();
    memorySpinner.succeed('Memory loaded successfully');
    sessionData.steps.push({ step: 'load_memory', success: true });
    
    // Step 2: Profile existing knowledge
    const profileSpinner = ora('Analyzing your knowledge profile...').start();
    const profile = await profileMemory(memory);
    profileSpinner.succeed('Knowledge profile created');
    sessionData.steps.push({ step: 'profile_memory', success: true });
    
    // Display profile summary
    displayContent(chalk.green('\n📊 Your Learning Profile:'));
    displayContent(`Learning Style: ${profile.learningStyle}`);
    displayContent(`Complexity Level: ${profile.complexityLevel}`);
    displayContent(`Current Strengths: ${profile.learningStrengths.join(', ')}`);
    displayContent(`Knowledge Gaps: ${profile.knowledgeGaps.join(', ')}`);
    displayContent(`Summary: ${profile.summary}\n`);
    
    // Step 3: Plan curriculum
    const planSpinner = ora('Creating your personalized learning plan...').start();
    const plan = await planCurriculum(goal, profile);
    planSpinner.succeed('Learning plan created');
    sessionData.steps.push({ step: 'plan_curriculum', success: true });
    
    // Display learning plan
    displayContent(chalk.blue('\n📚 Your Learning Plan:'));
    plan.subtopics.forEach((subtopic, index) => {
      displayContent(`${index + 1}. ${subtopic.title} (${subtopic.estimatedTime} min)`);
      displayContent(`   ${subtopic.description}`);
    });
    displayContent(`\nTotal estimated time: ${plan.totalEstimatedTime} minutes\n`);
    
    // Step 4: Teach lessons and quiz for each subtopic
    const lessons = [];
    const quizResults = [];
    
    for (let i = 0; i < plan.subtopics.length; i++) {
      const subtopic = plan.subtopics[i];
      
      displayContent(chalk.yellow(`\n🎯 Learning: ${subtopic.title}`));
      
      // Teach lesson
      const lessonSpinner = ora(`Teaching ${subtopic.title}...`).start();
      const lesson = await teachLesson(subtopic, profile, memory);
      lessonSpinner.succeed(`Lesson: ${subtopic.title}`);
      sessionData.steps.push({ step: 'teach_lesson', subtopic: subtopic.title, success: true });
      
      // Display lesson content
      displayContent(chalk.cyan('\n📖 Lesson Content:'));
      displayContent(lesson.content);
      displayContent(chalk.cyan('\n🎯 Learning Objectives:'));
      lesson.objectives.forEach(obj => displayContent(`• ${obj}`));
      
      // Ask if user wants to continue
      const continueLearning = await askUser('\nReady for the quiz? (y/n): ');
      if (continueLearning.toLowerCase() !== 'y') {
        displayContent('Skipping quiz for this lesson.');
        continue;
      }
      
      // Generate and conduct quiz
      const quizSpinner = ora(`Creating quiz for ${subtopic.title}...`).start();
      const quiz = await generateQuiz(lesson, profile);
      quizSpinner.succeed('Quiz generated');
      
      displayContent(chalk.magenta('\n📝 Quiz Time!'));
      const answers = [];
      
      for (let j = 0; j < quiz.questions.length; j++) {
        const question = quiz.questions[j];
        displayContent(`\nQuestion ${j + 1}: ${question.question}`);
        
        if (question.type === 'multiple_choice') {
          question.options.forEach((option, index) => {
            displayContent(`${index + 1}. ${option}`);
          });
        }
        
        const answer = await askUser('Your answer: ');
        answers.push(answer);
      }
      
      // Grade quiz
      const gradeSpinner = ora('Grading your quiz...').start();
      const quizResult = await gradeQuiz(quiz, answers, profile);
      gradeSpinner.succeed('Quiz graded');
      sessionData.steps.push({ step: 'grade_quiz', subtopic: subtopic.title, score: quizResult.percentage, success: true });
      
      // Display quiz results
      displayContent(chalk.green(`\n📊 Quiz Results: ${quizResult.percentage}% (${quizResult.correctAnswers}/${quizResult.totalQuestions})`));
      displayContent(chalk.blue('\n📝 Detailed Feedback:'));
      quizResult.results.forEach((result, index) => {
        displayContent(`\nQuestion ${index + 1}: ${result.isCorrect ? '✅' : '❌'}`);
        displayContent(`Your answer: ${result.userAnswer}`);
        displayContent(`Feedback: ${result.feedback}`);
      });
      displayContent(chalk.blue(`\nOverall: ${quizResult.overallFeedback}`));
      
      lessons.push(lesson);
      quizResults.push(quizResult);
      
      // Mark subtopic as completed
      markSubtopicCompleted(plan, i);
    }
    
    // Step 5: Reflection
    if (lessons.length > 0 && quizResults.length > 0) {
      displayContent(chalk.yellow('\n🤔 Reflection Time'));
      
      const reflectionSpinner = ora('Preparing reflection questions...').start();
      const reflectionPrompts = await promptReflection(lessons[lessons.length - 1], quizResults[quizResults.length - 1], memory, profile);
      reflectionSpinner.succeed('Reflection prompts ready');
      
      displayContent(chalk.cyan('\n💭 Let\'s reflect on what you\'ve learned:'));
      const reflectionResponses = [];
      
      for (const prompt of reflectionPrompts.prompts) {
        displayContent(`\n${prompt.question}`);
        const response = await askUser('Your reflection: ');
        reflectionResponses.push(response);
      }
      
      // Process reflection
      const processSpinner = ora('Processing your reflections...').start();
      const reflection = await processReflection(reflectionResponses, reflectionPrompts, profile);
      processSpinner.succeed('Reflections processed');
      sessionData.steps.push({ step: 'process_reflection', success: true });
      
      // Display reflection insights
      displayContent(chalk.green('\n✨ Reflection Insights:'));
      displayContent(reflection.insights.summary);
      if (reflection.insights.keyInsights.length > 0) {
        displayContent(chalk.blue('\nKey Insights:'));
        reflection.insights.keyInsights.forEach(insight => displayContent(`• ${insight}`));
      }
      if (reflection.insights.futureInterests.length > 0) {
        displayContent(chalk.blue('\nFuture Learning Interests:'));
        reflection.insights.futureInterests.forEach(interest => displayContent(`• ${interest}`));
      }
      
      // Step 6: Update memory
      const updateSpinner = ora('Updating your learning memory...').start();
      const sessionResults = {
        lesson: lessons[lessons.length - 1],
        quizResults: quizResults[quizResults.length - 1],
        reflection
      };
      
      const memoryUpdate = await updateMemory(memory, sessionResults);
      updateSpinner.succeed('Memory updated');
      sessionData.steps.push({ step: 'update_memory', success: true });
      
      // Display memory update summary
      displayContent(chalk.green('\n🧠 Memory Updated:'));
      if (memoryUpdate.addedConcepts.length > 0) {
        displayContent(`New concepts learned: ${memoryUpdate.addedConcepts.join(', ')}`);
      }
      displayContent(`Confidence level: ${Math.round(memoryUpdate.confidenceLevel * 100)}%`);
      
      // Step 7: Progress analysis
      const progressSpinner = ora('Analyzing your learning progress...').start();
      const progress = analyzeProgress(memory);
      progressSpinner.succeed('Progress analyzed');
      
      displayContent(chalk.blue('\n📈 Learning Progress:'));
      displayContent(`Total sessions: ${progress.totalSessions}`);
      displayContent(`Average quiz score: ${progress.averageQuizScore}%`);
      displayContent(`Concepts learned: ${progress.conceptsLearned}`);
      if (progress.trends.length > 0) {
        displayContent(chalk.green('\nTrends:'));
        progress.trends.forEach(trend => displayContent(`• ${trend}`));
      }
      if (progress.recommendations.length > 0) {
        displayContent(chalk.yellow('\nRecommendations:'));
        progress.recommendations.forEach(rec => displayContent(`• ${rec}`));
      }
    }
    
    // Save session data
    sessionData.endTime = new Date().toISOString();
    sessionData.lessons = lessons;
    sessionData.quizResults = quizResults;
    sessionData.success = true;
    await saveSession(sessionData);
    
    displayContent(chalk.green.bold('\n🎉 Learning session completed successfully!'));
    displayContent(chalk.blue('Your knowledge has been updated and saved.'));
    
    return sessionData;
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error in learning pipeline:'), error.message);
    sessionData.error = error.message;
    sessionData.endTime = new Date().toISOString();
    sessionData.success = false;
    await saveSession(sessionData);
    throw error;
  }
}

/**
 * Get session summary for display
 * @param {Object} sessionData - Session data
 * @returns {string} Formatted summary
 */
export function getSessionSummary(sessionData) {
  if (!sessionData.success) {
    return `❌ Session failed: ${sessionData.error}`;
  }
  
  const duration = new Date(sessionData.endTime) - new Date(sessionData.startTime);
  const minutes = Math.round(duration / 60000);
  
  return `
🎯 Goal: ${sessionData.goal}
⏱️ Duration: ${minutes} minutes
📚 Lessons: ${sessionData.lessons?.length || 0}
📊 Average Score: ${sessionData.quizResults?.length > 0 ? 
  Math.round(sessionData.quizResults.reduce((sum, r) => sum + r.percentage, 0) / sessionData.quizResults.length) : 0}%
✅ Steps Completed: ${sessionData.steps.filter(s => s.success).length}/${sessionData.steps.length}
`;
}
