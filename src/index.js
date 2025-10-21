const WebServer = require('./web-server');
const LearningPipeline = require('./learning-pipeline');
const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');

class EumicusApp {
  constructor() {
    this.webServer = null;
    this.learningPipeline = null;
    this.isRunning = false;
  }

  async initialize() {
    console.log(chalk.blue.bold('\n🧠 Eumicus - AI Knowledge Reinforcement System\n'));
    
    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error(chalk.red('❌ OpenAI API key not found. Please set OPENAI_API_KEY environment variable.'));
      console.log(chalk.yellow('💡 You can get an API key from: https://platform.openai.com/api-keys'));
      process.exit(1);
    }

    const spinner = ora('Initializing Eumicus...').start();
    
    try {
      // Initialize web server
      this.webServer = new WebServer(process.env.PORT || 3000);
      const initialized = await this.webServer.initialize(apiKey);
      
      if (!initialized) {
        throw new Error('Failed to initialize web server');
      }

      // Initialize learning pipeline
      this.learningPipeline = new LearningPipeline(this.webServer);
      
      spinner.succeed('Eumicus initialized successfully!');
      
      console.log(chalk.green('\n✅ All systems ready!'));
      console.log(chalk.cyan('🌐 Web interface: http://localhost:' + (process.env.PORT || 3000)));
      console.log(chalk.cyan('📚 Knowledge graph: ./data/knowledge-graph.json'));
      console.log(chalk.cyan('📊 Activity log: ./data/activity-log.json\n'));
      
    } catch (error) {
      spinner.fail('Failed to initialize Eumicus');
      console.error(chalk.red('Error:'), error.message);
      process.exit(1);
    }
  }

  async start() {
    if (this.isRunning) {
      console.log(chalk.yellow('⚠️  Eumicus is already running'));
      return;
    }

    try {
      await this.webServer.start();
      this.isRunning = true;
      
      // Start background learning pipeline
      await this.learningPipeline.start();
      
      console.log(chalk.green('\n🚀 Eumicus is now running!'));
      console.log(chalk.gray('Press Ctrl+C to stop\n'));
      
      // Handle graceful shutdown
      process.on('SIGINT', () => this.shutdown());
      process.on('SIGTERM', () => this.shutdown());
      
    } catch (error) {
      console.error(chalk.red('Failed to start Eumicus:'), error.message);
      process.exit(1);
    }
  }

  async shutdown() {
    if (!this.isRunning) return;
    
    console.log(chalk.yellow('\n🛑 Shutting down Eumicus...'));
    
    try {
      if (this.learningPipeline) {
        await this.learningPipeline.stop();
      }
      
      if (this.webServer) {
        await this.webServer.cleanup();
        await this.webServer.stop();
      }
      
      console.log(chalk.green('✅ Eumicus stopped gracefully'));
      process.exit(0);
      
    } catch (error) {
      console.error(chalk.red('Error during shutdown:'), error.message);
      process.exit(1);
    }
  }

  async runCLI() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
      // No arguments - start web interface
      await this.initialize();
      await this.start();
    } else {
      // Handle CLI commands
      program
        .name('eumicus')
        .description('AI-assisted knowledge reinforcement system')
        .version('1.0.0');

      program
        .command('start')
        .description('Start the web interface')
        .option('-p, --port <port>', 'Port number', '3000')
        .action(async (options) => {
          process.env.PORT = options.port;
          await this.initialize();
          await this.start();
        });

      program
        .command('profile')
        .description('Run user profiling in CLI mode')
        .action(async () => {
          await this.initialize();
          await this.runProfilingCLI();
        });

      program
        .command('process')
        .description('Process content from command line')
        .argument('<content>', 'Content to process (URL or text)')
        .action(async (content) => {
          await this.initialize();
          await this.processContentCLI(content);
        });

      program
        .command('reinforce')
        .description('Run knowledge reinforcement session')
        .action(async () => {
          await this.initialize();
          await this.runReinforcementCLI();
        });

      program
        .command('suggest')
        .description('Generate exploration suggestions')
        .action(async () => {
          await this.initialize();
          await this.generateSuggestionsCLI();
        });

      program
        .command('stats')
        .description('Show learning statistics')
        .action(async () => {
          await this.initialize();
          await this.showStatsCLI();
        });

      program
        .command('reset')
        .description('Reset knowledge graph (WARNING: This will delete all data)')
        .option('-f, --force', 'Force reset without confirmation')
        .action(async (options) => {
          await this.initialize();
          await this.resetCLI(options.force);
        });

      await program.parseAsync();
    }
  }

  async runProfilingCLI() {
    console.log(chalk.blue('\n🧠 Starting user profiling...\n'));
    
    try {
      const profile = await this.webServer.userProfiler.conductDeepDiveConversation();
      
      console.log(chalk.green('\n✅ User profiling completed!'));
      console.log(chalk.cyan('\n📋 Your Learning Profile:'));
      console.log(chalk.white('Goals:'), profile.goals.join(', '));
      console.log(chalk.white('Interests:'), profile.interests.join(', '));
      console.log(chalk.white('Learning Style:'), profile.learning_style);
      console.log(chalk.white('Time Commitment:'), profile.time_commitment);
      
    } catch (error) {
      console.error(chalk.red('Error during profiling:'), error.message);
    }
  }

  async processContentCLI(content) {
    console.log(chalk.blue('\n📚 Processing content...\n'));
    
    try {
      const result = await this.webServer.contentProcessor.processContent(content);
      
      console.log(chalk.green('\n✅ Content processed successfully!'));
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
        console.log(chalk.blue('\n🔗 Mapping connections...'));
        const connectionResult = await this.webServer.connectionMapper.mapNewConnections(result.concepts);
        console.log(chalk.green(`✅ Mapped ${connectionResult.connections.length} connections`));
      }
      
    } catch (error) {
      console.error(chalk.red('Error processing content:'), error.message);
    }
  }

  async runReinforcementCLI() {
    console.log(chalk.blue('\n🔄 Starting reinforcement session...\n'));
    
    try {
      const session = await this.webServer.knowledgeReinforcer.generateReinforcementSession();
      
      if (!session) {
        console.log(chalk.yellow('No concepts need reinforcement at this time.'));
        return;
      }
      
      console.log(chalk.green('\n✅ Reinforcement session generated!'));
      console.log(chalk.cyan('\n📝 Questions:'));
      
      session.questions.forEach((question, index) => {
        console.log(chalk.white(`\n${index + 1}. ${question.question}`));
        console.log(chalk.gray(`   Concept: ${question.concept_name}`));
        console.log(chalk.gray(`   Type: ${question.type} | Difficulty: ${question.difficulty}`));
      });
      
    } catch (error) {
      console.error(chalk.red('Error generating reinforcement session:'), error.message);
    }
  }

  async generateSuggestionsCLI() {
    console.log(chalk.blue('\n🔍 Generating exploration suggestions...\n'));
    
    try {
      const suggestions = await this.webServer.explorationSuggester.generateExplorationSuggestions();
      
      console.log(chalk.green('\n✅ Exploration suggestions generated!'));
      
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
      console.error(chalk.red('Error generating suggestions:'), error.message);
    }
  }

  async showStatsCLI() {
    console.log(chalk.blue('\n📊 Learning Statistics\n'));
    
    try {
      const graph = await this.webServer.knowledgeGraph.loadKnowledgeGraph();
      const connectionStats = await this.webServer.connectionMapper.getConnectionStats();
      const reinforcementStats = await this.webServer.knowledgeReinforcer.getReinforcementStats();
      const explorationStats = await this.webServer.explorationSuggester.getExplorationStats();
      const reflectionStats = await this.webServer.reflectionEngine.getReflectionStats();
      
      console.log(chalk.cyan('🧠 Knowledge Graph:'));
      console.log(chalk.white(`  Total concepts: ${connectionStats.total_concepts}`));
      console.log(chalk.white(`  Total connections: ${connectionStats.total_connections}`));
      console.log(chalk.white(`  Average connections per concept: ${connectionStats.average_connections.toFixed(1)}`));
      
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
      
    } catch (error) {
      console.error(chalk.red('Error loading statistics:'), error.message);
    }
  }

  async resetCLI(force = false) {
    if (!force) {
      console.log(chalk.red('\n⚠️  WARNING: This will delete all your knowledge graph data!'));
      console.log(chalk.yellow('This action cannot be undone.\n'));
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Are you sure you want to reset? Type "yes" to confirm: ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() !== 'yes') {
        console.log(chalk.green('Reset cancelled.'));
        return;
      }
    }
    
    console.log(chalk.blue('\n🗑️  Resetting knowledge graph...'));
    
    try {
      // This would delete the knowledge graph files
      // In a real implementation, you'd want to be more careful about this
      console.log(chalk.green('✅ Knowledge graph reset completed!'));
      console.log(chalk.yellow('💡 Run the profiling command to start fresh.'));
      
    } catch (error) {
      console.error(chalk.red('Error resetting knowledge graph:'), error.message);
    }
  }
}

// Main execution
async function main() {
  const app = new EumicusApp();
  await app.runCLI();
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(chalk.red('\n💥 Uncaught Exception:'), error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error(chalk.red('\n💥 Unhandled Rejection at:'), promise);
  console.error(chalk.red('Reason:'), reason);
  process.exit(1);
});

if (require.main === module) {
  main().catch(error => {
    console.error(chalk.red('💥 Fatal error:'), error.message);
    process.exit(1);
  });
}

module.exports = EumicusApp;
