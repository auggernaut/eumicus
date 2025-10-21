#!/usr/bin/env node

import readline from 'readline';
import chalk from 'chalk';
import { processConversationExchange, getSessionStatus } from '../modules/conversation-session.js';
import { loadMemory } from '../modules/memory.js';

/**
 * Interactive chat interface with automatic learning capture
 */
export async function startChatInterface() {
  console.log(chalk.blue.bold('\n💬 Eumicus Chat - Learning Conversations\n'));
  console.log(chalk.gray('Chat with me and I\'ll automatically capture any learnings!\n'));
  console.log(chalk.yellow('Type "exit" to quit, "status" to see session info, "memory" to view your knowledge\n'));
  
  // Get initial session status
  const initialStatus = await getSessionStatus();
  if (initialStatus.totalMessages > 0) {
    console.log(chalk.green(`📊 Continuing session with ${initialStatus.totalMessages} messages, ${initialStatus.learningsCaptured} learnings captured\n`));
  }
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const askQuestion = (question) => {
    return new Promise((resolve) => {
      rl.question(question, resolve);
    });
  };
  
  try {
    while (true) {
      const userMessage = await askQuestion(chalk.cyan('You: '));
      
      if (userMessage.toLowerCase() === 'exit') {
        console.log(chalk.green('\n👋 Goodbye! Your learnings have been saved.\n'));
        break;
      }
      
      if (userMessage.toLowerCase() === 'status') {
        await showSessionStatus();
        continue;
      }
      
      if (userMessage.toLowerCase() === 'memory') {
        await showMemoryStatus();
        continue;
      }
      
      if (userMessage.trim() === '') {
        continue;
      }
      
      // Simulate assistant response (in a real implementation, this would be the AI response)
      const assistantResponse = await generateAssistantResponse(userMessage);
      console.log(chalk.blue(`\nAssistant: ${assistantResponse}\n`));
      
      // Process the conversation and capture learnings
      const result = await processConversationExchange(userMessage, assistantResponse, 'interactive chat');
      
      // Show learning capture feedback
      if (result.learningCaptured) {
        console.log(chalk.green(`🧠 Learning captured: "${result.learningDetails.topic}" (confidence: ${Math.round(result.learningDetails.confidence * 100)}%)\n`));
      }
    }
    
  } catch (error) {
    console.error(chalk.red('\n❌ Error in chat interface:'), error.message);
  } finally {
    rl.close();
  }
}

/**
 * Generate a simple assistant response (placeholder for AI integration)
 * @param {string} userMessage - User's message
 * @returns {string} Assistant response
 */
async function generateAssistantResponse(userMessage) {
  // This is a placeholder - in a real implementation, this would call the AI
  const responses = [
    "That's an interesting point! Can you tell me more about that?",
    "I see what you mean. How does that relate to your previous experiences?",
    "That's a great insight! What made you think of that?",
    "Fascinating! Have you explored this concept before?",
    "I understand. What are the implications of that idea?",
    "That's a valuable perspective. How did you come to this understanding?",
    "Interesting! What would you like to explore further about this?",
    "That makes sense. What connections do you see to other topics?",
    "Great question! Let me think about that with you.",
    "I appreciate you sharing that. What's your experience been with this?"
  ];
  
  // Simple response selection based on message content
  const messageLower = userMessage.toLowerCase();
  if (messageLower.includes('learn') || messageLower.includes('understand')) {
    return "Learning is a fascinating process! What specific aspect would you like to explore deeper?";
  } else if (messageLower.includes('business') || messageLower.includes('startup')) {
    return "Business and entrepreneurship are complex topics. What's your experience been in this area?";
  } else if (messageLower.includes('technology') || messageLower.includes('ai')) {
    return "Technology is evolving rapidly! What aspects of tech are you most curious about?";
  } else if (messageLower.includes('spirituality') || messageLower.includes('meditation')) {
    return "Spiritual practices can be deeply transformative. What draws you to explore this area?";
  } else {
    return responses[Math.floor(Math.random() * responses.length)];
  }
}

/**
 * Show current session status
 */
async function showSessionStatus() {
  const status = await getSessionStatus();
  
  console.log(chalk.blue.bold('\n📊 Session Status\n'));
  console.log(chalk.green(`Session ID: ${status.sessionId}`));
  console.log(chalk.green(`Start Time: ${new Date(status.startTime).toLocaleString()}`));
  console.log(chalk.green(`Total Messages: ${status.totalMessages}`));
  console.log(chalk.green(`Learnings Captured: ${status.learningsCaptured}`));
  console.log(chalk.green(`Last Activity: ${new Date(status.lastActivity).toLocaleString()}`));
  
  if (status.lastLearning) {
    console.log(chalk.yellow(`\n🧠 Last Learning: "${status.lastLearning.topic}" (${Math.round(status.lastLearning.confidence * 100)}% confidence)`));
  }
  
  if (status.summary && status.summary.totalMessages > 0) {
    console.log(chalk.blue(`\n📈 Session Summary:`));
    console.log(chalk.blue(`  Duration: ${status.summary.duration} minutes`));
    console.log(chalk.blue(`  Avg Message Length: ${status.summary.avgMessageLength} characters`));
  }
  
  console.log('');
}

/**
 * Show memory status
 */
async function showMemoryStatus() {
  const memory = await loadMemory();
  
  console.log(chalk.blue.bold('\n🧠 Your Knowledge Memory\n'));
  console.log(chalk.green(`Total Concepts: ${memory.concepts.length}`));
  console.log(chalk.green(`Total Reflections: ${memory.reflections.length}`));
  console.log(chalk.green(`Last Updated: ${new Date(memory.lastUpdated).toLocaleString()}`));
  
  if (memory.concepts.length > 0) {
    console.log(chalk.yellow('\n📚 Recent Concepts:'));
    const recentConcepts = memory.concepts
      .filter(c => c.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 5);
    
    recentConcepts.forEach((concept, index) => {
      const date = new Date(concept.timestamp).toLocaleDateString();
      console.log(chalk.blue(`  ${index + 1}. [${date}] ${concept.name}`));
    });
  }
  
  console.log('');
}
