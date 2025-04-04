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

  async readContractList() {
    const filePath = path.join(process.cwd(), 'data', 'contract.txt');
    if (!fs.existsSync(filePath)) {
      throw new Error('❌ contract.txt not found in /data folder');
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const contracts = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => /^0x[a-fA-F0-9]{40}$/.test(line));

    if (contracts.length === 0) {
      throw new Error('❌ No valid contract addresses found in contract.txt');
    }

    return contracts;
  }

  async getTransferDetails(defaultTx = 101) {
    const amount = await this.question('\nEnter amount to transfer per transaction: ');
    const txPerWallet = await this.question(`Enter transactions per wallet (default ${defaultTx}): `) || defaultTx;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      throw new Error('Invalid transfer amount');
    }

    return {
      amount: parseFloat(amount),
      txPerWallet: parseInt(txPerWallet)
    };
  }

  async run() {
    try {
      await this.initialize();
      const chain = await this.selectChain();
      const walletManager = new WalletManager(chain);

      console.log('\n🔍 Loading wallets from PK.txt...');
      await walletManager.initializeWallets();
      const wallets = walletManager.getWallets();

      const operation = await this.selectOperation();

      if (operation === 1) {
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
        const contractList = await this.readContractList();

        if (contractList.length !== wallets.length) {
          throw new Error(`❌ Wallet count (${wallets.length}) and contract count (${contractList.length}) mismatch`);
        }

        const transferDetails = await this.getTransferDetails();

        const confirm = await this.confirmAction(
          `Transfer ${transferDetails.txPerWallet} txs per wallet (${wallets.length} wallets)?`
        );

        if (confirm) {
          const batchService = new BatchTransferService(walletManager);
          for (let i = 0; i < wallets.length; i++) {
            const contractAddress = contractList[i];
            const wallet = wallets[i];

            console.log(`\n➡️ Wallet ${i + 1} sending to contract ${contractAddress}`);
            await batchService.transferWithCustomWallet(
              wallet,
              contractAddress,
              transferDetails.amount,
              transferDetails.txPerWallet
            );
          }
        } else {
          console.log('\n🚫 Operation cancelled');
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
