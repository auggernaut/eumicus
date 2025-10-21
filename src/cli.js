import inquirer from 'inquirer';
import chalk from 'chalk';
import { runLearningPipeline, getSessionSummary } from './learning-pipeline.js';
import { loadMemory, clearSession, saveMemory, addConversationLearning } from '../modules/memory.js';
import { analyzeProgress, getLearningRecommendations } from '../modules/assimilator.js';
import { isConfigured } from '../modules/openai-client.js';

/**
 * Main CLI interface for Eumicus
 */
export async function runCLI() {
  console.log(chalk.blue.bold('\n🧠 Welcome to Eumicus - AI-Assisted Adaptive Learning\n'));
  
  // Check OpenAI configuration
  if (!isConfigured()) {
    console.log(chalk.red('❌ OpenAI API key not configured.'));
    console.log(chalk.yellow('Please set your OPENAI_API_KEY environment variable.'));
    console.log(chalk.gray('You can copy env.example to .env and add your API key.'));
    process.exit(1);
  }
  
  while (true) {
    try {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '🎯 Start a new learning session', value: 'learn' },
            { name: '💬 Capture conversation learning', value: 'capture' },
            { name: '📊 View learning progress', value: 'progress' },
            { name: '🧠 View knowledge profile', value: 'profile' },
            { name: '💡 Get learning recommendations', value: 'recommendations' },
            { name: '📚 View learning history', value: 'history' },
            { name: '🗑️ Clear session data', value: 'clear' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);
      
      switch (action) {
        case 'learn':
          await handleLearningSession();
          break;
        case 'capture':
          await handleConversationCapture();
          break;
        case 'progress':
          await showProgress();
          break;
        case 'profile':
          await showProfile();
          break;
        case 'recommendations':
          await showRecommendations();
          break;
        case 'history':
          await showHistory();
          break;
        case 'clear':
          await clearSessionData();
          break;
        case 'exit':
          console.log(chalk.green('\n👋 Happy learning! Goodbye!\n'));
          process.exit(0);
      }
    } catch (error) {
      console.error(chalk.red('\n❌ Error:'), error.message);
      console.log(chalk.yellow('Please try again.\n'));
    }
  }
}

/**
 * Handle conversation capture
 */
async function handleConversationCapture() {
  console.log(chalk.blue('\n💬 Capture Conversation Learning\n'));
  console.log(chalk.gray('Use this to capture insights from conversations, articles, videos, or any learning experience.\n'));
  
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'topic',
      message: 'What was the main topic or concept you learned about?',
      validate: (input) => input.trim().length > 0 || 'Please enter a topic'
    },
    {
      type: 'input',
      name: 'content',
      message: 'Describe what you learned (be specific and detailed):',
      validate: (input) => input.trim().length > 10 || 'Please provide more detail about what you learned'
    },
    {
      type: 'input',
      name: 'source',
      message: 'Where did you learn this from? (e.g., "chat conversation", "website", "book", "video")',
      default: 'conversation'
    },
    {
      type: 'input',
      name: 'connections',
      message: 'What related topics or concepts does this connect to? (comma-separated, optional)',
      default: ''
    }
  ]);
  
  try {
    const memory = await loadMemory();
    
    // Parse connections
    const connections = answers.connections
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);
    
    // Add the learning to memory
    addConversationLearning(
      memory,
      answers.topic,
      answers.content,
      answers.source,
      connections
    );
    
    // Save updated memory
    await saveMemory(memory);
    
    console.log(chalk.green('\n✅ Learning captured successfully!'));
    console.log(chalk.blue(`📊 Total concepts in memory: ${memory.concepts.length}`));
    console.log(chalk.blue(`📝 Total reflections in memory: ${memory.reflections.length}`));
    
    const { captureMore } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'captureMore',
        message: 'Would you like to capture another learning?',
        default: false
      }
    ]);
    
    if (captureMore) {
      await handleConversationCapture();
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error capturing learning:'), error.message);
  }
}

/**
 * Handle a new learning session
 */
async function handleLearningSession() {
  const { goal } = await inquirer.prompt([
    {
      type: 'input',
      name: 'goal',
      message: 'What would you like to learn about?',
      validate: (input) => input.trim().length > 0 || 'Please enter a learning goal'
    }
  ]);
  
  console.log(chalk.blue(`\n🎯 Learning Goal: ${goal}\n`));
  
  try {
    const sessionData = await runLearningPipeline(
      goal,
      askUserInput,
      displayContent
    );
    
    console.log(chalk.green('\n✅ Session completed successfully!'));
    console.log(getSessionSummary(sessionData));
    
    const { continueLearning } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueLearning',
        message: 'Would you like to start another learning session?',
        default: false
      }
    ]);
    
    if (continueLearning) {
      await handleLearningSession();
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Learning session failed:'), error.message);
    
    const { retry } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'retry',
        message: 'Would you like to try again?',
        default: false
      }
    ]);
    
    if (retry) {
      await handleLearningSession();
    }
  }
}

/**
 * Show learning progress
 */
async function showProgress() {
  try {
    const memory = await loadMemory();
    const progress = analyzeProgress(memory);
    
    console.log(chalk.blue.bold('\n📈 Your Learning Progress\n'));
    
    if (progress.totalSessions === 0) {
      console.log(chalk.yellow('No learning sessions completed yet.'));
      console.log(chalk.gray('Start your first session to see progress!'));
      return;
    }
    
    console.log(chalk.green(`Total Sessions: ${progress.totalSessions}`));
    console.log(chalk.green(`Average Quiz Score: ${progress.averageQuizScore}%`));
    console.log(chalk.green(`Total Learning Time: ${progress.totalLearningTime} minutes`));
    console.log(chalk.green(`Concepts Learned: ${progress.conceptsLearned}`));
    
    if (progress.trends.length > 0) {
      console.log(chalk.blue('\n📊 Trends:'));
      progress.trends.forEach(trend => console.log(`  • ${trend}`));
    }
    
    if (progress.recommendations.length > 0) {
      console.log(chalk.yellow('\n💡 Recommendations:'));
      progress.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
    
    if (progress.lastSession) {
      const lastSession = new Date(progress.lastSession);
      console.log(chalk.gray(`\nLast session: ${lastSession.toLocaleDateString()}`));
    }
    
  } catch (error) {
    console.error(chalk.red('Error loading progress:'), error.message);
  }
}

/**
 * Show knowledge profile
 */
async function showProfile() {
  try {
    const memory = await loadMemory();
    
    console.log(chalk.blue.bold('\n🧠 Your Knowledge Profile\n'));
    
    if (memory.concepts.length === 0) {
      console.log(chalk.yellow('No concepts learned yet.'));
      console.log(chalk.gray('Start learning to build your knowledge profile!'));
      return;
    }
    
    console.log(chalk.green(`Total Concepts: ${memory.concepts.length}`));
    
    // Show concepts by confidence
    const conceptsByConfidence = memory.concepts
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);
    
    console.log(chalk.blue('\n🏆 Top Concepts (by confidence):'));
    conceptsByConfidence.forEach((concept, index) => {
      const confidence = Math.round(concept.confidence * 100);
      const bar = '█'.repeat(Math.floor(confidence / 10)) + '░'.repeat(10 - Math.floor(confidence / 10));
      console.log(`  ${index + 1}. ${concept.name} [${bar}] ${confidence}%`);
    });
    
    // Show recent reflections
    if (memory.reflections.length > 0) {
      console.log(chalk.yellow('\n💭 Recent Reflections:'));
      const recentReflections = memory.reflections
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 3);
      
      recentReflections.forEach((reflection, index) => {
        const date = new Date(reflection.date).toLocaleDateString();
        console.log(`  ${index + 1}. [${date}] ${reflection.text.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error(chalk.red('Error loading profile:'), error.message);
  }
}

/**
 * Show learning recommendations
 */
async function showRecommendations() {
  try {
    const memory = await loadMemory();
    const recommendations = getLearningRecommendations(memory);
    
    console.log(chalk.blue.bold('\n💡 Learning Recommendations\n'));
    
    if (recommendations.length === 0) {
      console.log(chalk.yellow('No specific recommendations at this time.'));
      console.log(chalk.gray('Complete some learning sessions to get personalized recommendations!'));
      return;
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. ${rec}`);
    });
    
  } catch (error) {
    console.error(chalk.red('Error loading recommendations:'), error.message);
  }
}

/**
 * Show learning history
 */
async function showHistory() {
  try {
    const memory = await loadMemory();
    
    console.log(chalk.blue.bold('\n📚 Learning History\n'));
    
    if (memory.reflections.length === 0) {
      console.log(chalk.yellow('No learning history yet.'));
      console.log(chalk.gray('Complete some learning sessions to see your history!'));
      return;
    }
    
    // Group reflections by topic
    const reflectionsByTopic = {};
    memory.reflections.forEach(reflection => {
      const topic = reflection.topic || 'General';
      if (!reflectionsByTopic[topic]) {
        reflectionsByTopic[topic] = [];
      }
      reflectionsByTopic[topic].push(reflection);
    });
    
    Object.entries(reflectionsByTopic).forEach(([topic, reflections]) => {
      console.log(chalk.green(`\n📖 ${topic}:`));
      reflections
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach(reflection => {
          const date = new Date(reflection.date).toLocaleDateString();
          console.log(`  [${date}] ${reflection.text.substring(0, 150)}...`);
        });
    });
    
  } catch (error) {
    console.error(chalk.red('Error loading history:'), error.message);
  }
}

/**
 * Clear session data
 */
async function clearSessionData() {
  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are you sure you want to clear all session data? This cannot be undone.',
      default: false
    }
  ]);
  
  if (confirm) {
    try {
      await clearSession();
      console.log(chalk.green('✅ Session data cleared successfully.'));
    } catch (error) {
      console.error(chalk.red('Error clearing session data:'), error.message);
    }
  } else {
    console.log(chalk.yellow('Session data not cleared.'));
  }
}

/**
 * Helper function to ask user for input (used by learning pipeline)
 */
async function askUserInput(prompt) {
  const { answer } = await inquirer.prompt([
    {
      type: 'input',
      name: 'answer',
      message: prompt
    }
  ]);
  return answer;
}

/**
 * Helper function to display content (used by learning pipeline)
 */
function displayContent(content) {
  console.log(content);
}
