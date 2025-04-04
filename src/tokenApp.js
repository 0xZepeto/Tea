import TokenCLI from './TokenCLI.js';

const cli = new TokenCLI();
cli.run().catch(error => {
  console.error('Application error:', error.message);
  process.exit(1);
});
