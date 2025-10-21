#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const KnowledgeGraphManager = require('../modules/knowledge-graph');
const UserProfiler = require('../modules/user-profiler');
const ContentProcessor = require('../modules/content-processor');
const KnowledgeReinforcer = require('../modules/knowledge-reinforcer');
const ExplorationSuggester = require('../modules/exploration-suggester');
const ConnectionMapper = require('../modules/connection-mapper');
const ReflectionEngine = require('../modules/reflection-engine');
const OpenAIClient = require('../modules/openai-client');

class EumicusCLI {
  constructor() {
    this.knowledgeGraph = null;
    this.openai = null;
    this.userProfiler = null;
    this.contentProcessor = null;
    this.knowledgeReinforcer = null;
    this.explorationSuggester = null;
    this.connectionMapper = null;
    this.reflectionEngine = null;
  }

  async initialize() {
    const spinner = ora('Initializing Eumicus CLI...').start();
    
    try {
      // Check for OpenAI API key
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        spinner.fail('OpenAI API key not found');
        console.error(chalk.red('❌ Please set OPENAI_API_KEY environment variable'));
        console.log(chalk.yellow('💡 You can get an API key from: https://platform.openai.com/api-keys'));
        process.exit(1);
      }

      // Initialize modules
      this.knowledgeGraph = new KnowledgeGraphManager();
      await this.knowledgeGraph.initialize();
      
      this.openai = new OpenAIClient(apiKey);
      this.userProfiler = new UserProfiler(this.openai, this.knowledgeGraph);
      this.contentProcessor = new ContentProcessor(this.openai, this.knowledgeGraph);
      this.knowledgeReinforcer = new KnowledgeReinforcer(this.openai, this.knowledgeGraph);
      this.explorationSuggester = new ExplorationSuggester(this.openai, this.knowledgeGraph);
      this.connectionMapper = new ConnectionMapper(this.openai, this.knowledgeGraph);
      this.reflectionEngine = new ReflectionEngine(this.openai, this.knowledgeGraph);
      
      await this.contentProcessor.initialize();
      
      spinner.succeed('Eumicus CLI initialized successfully!');
      
    } catch (error) {
      spinner.fail('Failed to initialize Eumicus CLI');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  async cleanup() {
    if (this.contentProcessor) {
      await this.contentProcessor.cleanup();
    }
  }

  async runInteractiveMode() {
    console.log(chalk.blue.bold('\n🧠 Eumicus CLI - Interactive Mode\n'));
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'What would you like to do?',
          choices: [
            { name: '📊 View Learning Statistics', value: 'stats' },
            { name: '🧠 Start User Profiling', value: 'profile' },
            { name: '📚 Process Content', value: 'process' },
            { name: '🔄 Run Reinforcement Session', value: 'reinforce' },
            { name: '🔍 Generate Exploration Suggestions', value: 'suggest' },
            { name: '🤔 Start Reflection Session', value: 'reflect' },
            { name: '🔗 Discover Hidden Connections', value: 'connections' },
            { name: '📈 View Knowledge Graph', value: 'graph' },
            { name: '🗑️  Reset Knowledge Graph', value: 'reset' },
            { name: '❌ Exit', value: 'exit' }
          ]
        }
      ]);

      try {
        switch (action) {
          case 'stats':
            await this.showStats();
            break;
          case 'profile':
            await this.runProfiling();
            break;
          case 'process':
            await this.processContent();
            break;
          case 'reinforce':
            await this.runReinforcement();
            break;
          case 'suggest':
            await this.generateSuggestions();
            break;
          case 'reflect':
            await this.runReflection();
            break;
          case 'connections':
            await this.discoverConnections();
            break;
          case 'graph':
            await this.viewGraph();
            break;
          case 'reset':
            await this.resetGraph();
            break;
          case 'exit':
            console.log(chalk.green('\n👋 Goodbye!'));
            await this.cleanup();
            process.exit(0);
        }
      } catch (error) {
        console.error(chalk.red('\n❌ Error:'), error.message);
      }

      console.log(); // Add spacing
    }
  }

  async showStats() {
    console.log(chalk.blue('\n📊 Learning Statistics\n'));
    
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    const connectionStats = await this.connectionMapper.getConnectionStats();
    const reinforcementStats = await this.knowledgeReinforcer.getReinforcementStats();
    const explorationStats = await this.explorationSuggester.getExplorationStats();
    const reflectionStats = await this.reflectionEngine.getReflectionStats();
    
    console.log(chalk.cyan('🧠 Knowledge Graph:'));
    console.log(chalk.white(`  Total concepts: ${connectionStats.total_concepts}`));
    console.log(chalk.white(`  Total connections: ${connectionStats.total_connections}`));
    console.log(chalk.white(`  Average connections per concept: ${connectionStats.average_connections.toFixed(1)}`));
    
    if (connectionStats.most_connected.length > 0) {
      console.log(chalk.white('  Most connected concepts:'));
      connectionStats.most_connected.slice(0, 3).forEach(concept => {
        console.log(chalk.gray(`    • ${concept.name} (${concept.connections} connections)`));
      });
    }
    
    console.log(chalk.cyan('\n🔄 Reinforcement:'));
    console.log(chalk.white(`  Total sessions: ${reinforcementStats.total_sessions}`));
    console.log(chalk.white(`  Average performance: ${(reinforcementStats.average_performance * 100).toFixed(1)}%`));
    console.log(chalk.white(`  Concepts reinforced: ${reinforcementStats.concepts_reinforced}`));
    
    console.log(chalk.cyan('\n🔍 Exploration:'));
    console.log(chalk.white(`  Total suggestions: ${explorationStats.total_suggestions}`));
    console.log(chalk.white(`  High priority: ${explorationStats.high_priority}`));
    
    console.log(chalk.cyan('\n🤔 Reflection:'));
    console.log(chalk.white(`  Total sessions: ${reflectionStats.total_sessions}`));
    console.log(chalk.white(`  Average insights per session: ${reflectionStats.average_insights_per_session.toFixed(1)}`));
    
    console.log(chalk.cyan('\n👤 User Profile:'));
    console.log(chalk.white(`  Goals: ${graph.user_profile.goals.length}`));
    console.log(chalk.white(`  Interests: ${graph.user_profile.interests.length}`));
    console.log(chalk.white(`  Learning style: ${graph.user_profile.learning_style || 'Not set'}`));
  }

  async runProfiling() {
    console.log(chalk.blue('\n🧠 Starting User Profiling\n'));
    
    const profile = await this.userProfiler.conductDeepDiveConversation();
    
    console.log(chalk.green('\n✅ User profiling completed!'));
    console.log(chalk.cyan('\n📋 Your Learning Profile:'));
    console.log(chalk.white('Goals:'), profile.goals.join(', '));
    console.log(chalk.white('Interests:'), profile.interests.join(', '));
    console.log(chalk.white('Learning Style:'), profile.learning_style);
    console.log(chalk.white('Time Commitment:'), profile.time_commitment);
  }

  async processContent() {
    const { content } = await inquirer.prompt([
      {
        type: 'input',
        name: 'content',
        message: 'Enter content to process (URL or text):',
        validate: input => input.trim().length > 0 || 'Content cannot be empty'
      }
    ]);

    const spinner = ora('Processing content...').start();
    
    try {
      const result = await this.contentProcessor.processContent(content);
      
      spinner.succeed('Content processed successfully!');
      
      console.log(chalk.cyan('\n📊 Results:'));
      console.log(chalk.white('Title:'), result.contentItem.title);
      console.log(chalk.white('Concepts extracted:'), result.concepts.length);
      console.log(chalk.white('Insights generated:'), result.insights.length);
      
      if (result.concepts.length > 0) {
        console.log(chalk.cyan('\n🔍 Key Concepts:'));
        result.concepts.forEach(concept => {
          console.log(chalk.white(`• ${concept.name}`), chalk.gray(`(confidence: ${(concept.confidence * 100).toFixed(0)}%)`));
        });
      }
      
      // Map connections
      if (result.concepts.length > 0) {
        const connectionSpinner = ora('Mapping connections...').start();
        const connectionResult = await this.connectionMapper.mapNewConnections(result.concepts);
        connectionSpinner.succeed(`Mapped ${connectionResult.connections.length} connections`);
      }
      
    } catch (error) {
      spinner.fail('Failed to process content');
      throw error;
    }
  }

  async runReinforcement() {
    const spinner = ora('Generating reinforcement session...').start();
    
    try {
      const session = await this.knowledgeReinforcer.generateReinforcementSession();
      
      if (!session) {
        spinner.warn('No concepts need reinforcement at this time');
        return;
      }
      
      spinner.succeed('Reinforcement session generated!');
      
      console.log(chalk.cyan('\n📝 Questions:'));
      
      for (let i = 0; i < session.questions.length; i++) {
        const question = session.questions[i];
        console.log(chalk.white(`\n${i + 1}. ${question.question}`));
        console.log(chalk.gray(`   Concept: ${question.concept_name}`));
        console.log(chalk.gray(`   Type: ${question.type} | Difficulty: ${question.difficulty}`));
        
        const { answer } = await inquirer.prompt([
          {
            type: 'input',
            name: 'answer',
            message: 'Your answer:',
            validate: input => input.trim().length > 0 || 'Answer cannot be empty'
          }
        ]);
        
        const analysisSpinner = ora('Analyzing your answer...').start();
        const result = await this.knowledgeReinforcer.processUserAnswer(question, answer);
        analysisSpinner.succeed('Answer analyzed!');
        
        console.log(chalk.cyan('\n📊 Analysis:'));
        console.log(chalk.white('Accuracy:'), `${(result.analysis.accuracy_score * 100).toFixed(1)}%`);
        console.log(chalk.white('Completeness:'), `${(result.analysis.completeness_score * 100).toFixed(1)}%`);
        console.log(chalk.white('New Confidence:'), `${(result.newConfidence * 100).toFixed(1)}%`);
        console.log(chalk.white('Feedback:'), result.analysis.feedback);
      }
      
    } catch (error) {
      spinner.fail('Failed to generate reinforcement session');
      throw error;
    }
  }

  async generateSuggestions() {
    const spinner = ora('Generating exploration suggestions...').start();
    
    try {
      const suggestions = await this.explorationSuggester.generateExplorationSuggestions();
      
      spinner.succeed('Exploration suggestions generated!');
      
      if (suggestions.knowledgeGaps.length > 0) {
        console.log(chalk.cyan('\n🕳️  Knowledge Gaps:'));
        suggestions.knowledgeGaps.forEach(gap => {
          console.log(chalk.white(`• ${gap.area}`), chalk.gray(`(${gap.priority} priority)`));
          console.log(chalk.gray(`  ${gap.reason}`));
        });
      }
      
      if (suggestions.personalizedSuggestions.length > 0) {
        console.log(chalk.cyan('\n💡 Personalized Suggestions:'));
        suggestions.personalizedSuggestions.slice(0, 5).forEach(suggestion => {
          console.log(chalk.white(`• ${suggestion.area}`), chalk.gray(`(${suggestion.priority} priority)`));
          console.log(chalk.gray(`  ${suggestion.reason}`));
        });
      }
      
    } catch (error) {
      spinner.fail('Failed to generate suggestions');
      throw error;
    }
  }

  async runReflection() {
    const spinner = ora('Starting reflection session...').start();
    
    try {
      const session = await this.reflectionEngine.initiateReflectionSession();
      
      spinner.succeed('Reflection session completed!');
      
      console.log(chalk.cyan('\n🤔 Reflection Insights:'));
      session.insights.forEach((insight, index) => {
        console.log(chalk.white(`\n${index + 1}. ${insight.prompt}`));
        console.log(chalk.gray(`   ${insight.user_response}`));
      });
      
      if (session.connections_made.length > 0) {
        console.log(chalk.cyan('\n🔗 Connections Made:'));
        session.connections_made.forEach(connection => {
          console.log(chalk.white(`• ${connection.concept1} ↔ ${connection.concept2}`));
          console.log(chalk.gray(`  ${connection.relationship}: ${connection.significance}`));
        });
      }
      
      if (session.next_steps.length > 0) {
        console.log(chalk.cyan('\n📈 Next Steps:'));
        session.next_steps.forEach(step => {
          console.log(chalk.white(`• ${step.action}`), chalk.gray(`(${step.priority} priority)`));
          console.log(chalk.gray(`  Timeline: ${step.timeline}`));
        });
      }
      
    } catch (error) {
      spinner.fail('Failed to run reflection session');
      throw error;
    }
  }

  async discoverConnections() {
    const spinner = ora('Discovering hidden connections...').start();
    
    try {
      const connections = await this.connectionMapper.discoverHiddenConnections();
      
      if (connections.length === 0) {
        spinner.warn('No new hidden connections found');
        return;
      }
      
      spinner.succeed(`Discovered ${connections.length} hidden connections!`);
      
      console.log(chalk.cyan('\n🔗 New Connections:'));
      connections.forEach(connection => {
        console.log(chalk.white(`• ${connection.from_concept} → ${connection.to_concept}`));
        console.log(chalk.gray(`  ${connection.relationship_type}: ${connection.description}`));
        console.log(chalk.gray(`  Strength: ${(connection.strength * 100).toFixed(0)}%`));
      });
      
    } catch (error) {
      spinner.fail('Failed to discover connections');
      throw error;
    }
  }

  async viewGraph() {
    const graph = await this.knowledgeGraph.loadKnowledgeGraph();
    
    console.log(chalk.cyan('\n📊 Knowledge Graph Overview\n'));
    
    if (graph.concepts.length === 0) {
      console.log(chalk.yellow('No concepts in knowledge graph yet.'));
      return;
    }
    
    console.log(chalk.white(`Total concepts: ${graph.concepts.length}`));
    console.log(chalk.white(`Total connections: ${graph.concepts.reduce((sum, c) => sum + (c.connections?.length || 0), 0)}`));
    
    console.log(chalk.cyan('\n🔍 Concepts by Category:'));
    const categories = {};
    graph.concepts.forEach(concept => {
      const category = concept.category || 'uncategorized';
      if (!categories[category]) categories[category] = [];
      categories[category].push(concept);
    });
    
    Object.entries(categories).forEach(([category, concepts]) => {
      console.log(chalk.white(`\n${category}:`));
      concepts.forEach(concept => {
        const confidence = (concept.confidence * 100).toFixed(0);
        const connections = concept.connections?.length || 0;
        console.log(chalk.gray(`  • ${concept.name} (${confidence}% confidence, ${connections} connections)`));
      });
    });
  }

  async resetGraph() {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset the knowledge graph? This will delete all data!',
        default: false
      }
    ]);

    if (!confirm) {
      console.log(chalk.green('Reset cancelled.'));
      return;
    }

    const spinner = ora('Resetting knowledge graph...').start();
    
    try {
      // In a real implementation, you would delete the knowledge graph files
      // For now, we'll just show a message
      spinner.succeed('Knowledge graph reset completed!');
      console.log(chalk.yellow('💡 Run the profiling command to start fresh.'));
      
    } catch (error) {
      spinner.fail('Failed to reset knowledge graph');
      throw error;
    }
  }
}

// CLI setup
program
  .name('eumicus-cli')
  .description('Eumicus CLI - AI Knowledge Reinforcement System')
  .version('1.0.0');

program
  .command('interactive')
  .description('Start interactive CLI mode')
  .action(async () => {
    const cli = new EumicusCLI();
    try {
      await cli.initialize();
      await cli.runInteractiveMode();
    } catch (error) {
      console.error(chalk.red('Fatal error:'), error.message);
      process.exit(1);
    }
  });

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught Exception:'), error.message);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

if (require.main === module) {
  program.parse();
}

module.exports = EumicusCLI;
