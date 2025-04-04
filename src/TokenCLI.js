// src/TokenCLI.js
import readline from 'readline';
import displayHeader from './utils/displayHeader.js';
import { chains } from '../config/chains.js';
import WalletManager from './utils/WalletManager.js';
import TokenDeployService from './services/TokenDeployService.js';
import TokenTransferService from './services/TokenTransferService.js';
import BatchTransferService from './services/BatchTransferService.js';
import fs from 'fs';
import path from 'path';

class TokenCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    await displayHeader();
  }

  async question(query) {
    return new Promise((resolve) => {
      this.rl.question(query, (answer) => {
        resolve(answer);
      });
    });
  }

  async selectChain() {
    try {
      if (chains.length === 1) {
        console.log(`\n🌐 Using chain: ${chains[0].name}`);
        return chains[0];
      }

      console.log('\n🌐 Available chains:');
      chains.forEach((chain, index) => {
        console.log(`${index + 1}. ${chain.name}`);
      });

      const answer = await this.question('\nSelect chain (enter number): ');
      const selection = parseInt(answer) - 1;

      if (selection >= 0 && selection < chains.length) {
        console.log(`\n✅ Selected chain: ${chains[selection].name}`);
        return chains[selection];
      } else {
        throw new Error('Invalid chain selection');
      }
    } catch (error) {
      console.error('Chain selection error:', error.message);
      process.exit(1);
    }
  }

  async getTokenDetails() {
    const name = await this.question('\nEnter token name: ');
    const symbol = await this.question('Enter token symbol: ');
    const supply = await this.question('Enter initial supply: ');

    if (!name || !symbol || !supply || isNaN(supply) || parseFloat(supply) <= 0) {
      throw new Error('Invalid token details');
    }

    return { name, symbol, supply: parseFloat(supply) };
  }

  async selectOperation() {
    console.log('\n📝 Select operation:');
    console.log('1. Deploy new token');
    console.log('2. Batch transfer to multiple addresses');
    console.log('3. Create new wallets and transfer tokens');

    const answer = await this.question('\nSelect operation (1-3): ');
    const selection = parseInt(answer);

    if (selection >= 1 && selection <= 3) {
      return selection;
    } else {
      throw new Error('Invalid operation selection');
    }
  }

  async getTransferDetails() {
    const contractAddress = await this.question('\nEnter token contract address: ');
    const amount = await this.question('Enter amount to transfer per transaction: ');
    const txPerWallet = await this.question('Enter transactions per wallet (default 120): ') || 120;

    if (!contractAddress || !amount || isNaN(amount) || parseFloat(amount) <= 0) {
      throw new Error('Invalid transfer details');
    }

    return { 
      contractAddress, 
      amount: parseFloat(amount),
      txPerWallet: parseInt(txPerWallet)
    };
  }

  async getNumberOfWallets() {
    const answer = await this.question('\nEnter number of new wallets to create: ');
    const number = parseInt(answer);

    if (isNaN(number) || number <= 0) {
      throw new Error('Invalid number of wallets');
    }

    return number;
  }

  async confirmAction(message) {
    const answer = await this.question(`\n${message} (y/n): `);
    return answer.toLowerCase() === 'y';
  }

  async run() {
    try {
      await this.initialize();
      const chain = await this.selectChain();
      const walletManager = new WalletManager(chain);
      
      // Initialize wallets from PK.txt
      console.log('\n🔍 Loading wallets from PK.txt...');
      await walletManager.initializeWallets();

      const operation = await this.selectOperation();

      if (operation === 1) {
        // Token deployment
        const tokenDetails = await this.getTokenDetails();
        const confirm = await this.confirmAction(`Deploy new token ${tokenDetails.symbol} with supply ${tokenDetails.supply}?`);
        
        if (confirm) {
          const tokenDeployService = new TokenDeployService(walletManager);
          await tokenDeployService.deployToken(
            tokenDetails.name,
            tokenDetails.symbol,
            tokenDetails.supply
          );
        } else {
          console.log('\n🚫 Deployment cancelled');
        }
      } else {
        // Transfer operations
        const transferDetails = await this.getTransferDetails();
        
        if (operation === 2) {
          // Batch transfer
          const confirm = await this.confirmAction(
            `Process ${transferDetails.txPerWallet} transactions per wallet to addresses in wallet.txt?`
          );
          
          if (confirm) {
            const batchService = new BatchTransferService(walletManager);
            await batchService.processBatch(
              transferDetails.contractAddress,
              transferDetails.amount,
              transferDetails.txPerWallet
            );
          } else {
            console.log('\n🚫 Batch transfer cancelled');
          }
        } else {
          // Create and fund new wallets
          const numberOfWallets = await this.getNumberOfWallets();
          const confirm = await this.confirmAction(
            `Create ${numberOfWallets} new wallets and transfer ${transferDetails.amount} tokens to each?`
          );
          
          if (confirm) {
            const tokenTransferService = new TokenTransferService(walletManager);
            await tokenTransferService.transferToNewWallets(
              transferDetails.contractAddress,
              numberOfWallets,
              transferDetails.amount
            );
          } else {
            console.log('\n🚫 Wallet creation cancelled');
          }
        }
      }

      this.rl.close();
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }
}

export default TokenCLI;
