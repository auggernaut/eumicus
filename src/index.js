#!/usr/bin/env node

import { runCLI } from './cli.js';

// Handle uncaught exceptions gracefully
process.on('uncaughtException', (error) => {
  console.error('\n❌ Unexpected error:', error.message);
  console.log('Please check your configuration and try again.');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n❌ Unhandled promise rejection:', reason);
  process.exit(1);
});

// Run the CLI
runCLI().catch((error) => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
