import { ethers } from 'ethers';
import { chains } from '../../config/chains.js';
import fs from 'fs';
import path from 'path';

class WalletManager {
  constructor(chain) {
    this.chain = chain;
    this.provider = null;
    this.wallets = [];
  }

  async initializeWallets() {
    try {
      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(this.chain.rpcUrl);
      console.log(`\n🔗 Connected to ${this.chain.name} at ${this.chain.rpcUrl}`);

      // Resolve PK.txt path
      const pkPath = path.join(process.cwd(), 'data', 'PK.txt');
      console.log(`📁 Reading private keys from: ${pkPath}`);

      // Verify file exists
      if (!fs.existsSync(pkPath)) {
        throw new Error(`PK.txt not found at: ${pkPath}\nPlease create the file with one private key per line`);
      }

      // Read and validate private keys
      const fileContent = fs.readFileSync(pkPath, 'utf8');
      const privateKeys = fileContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => {
          // Validate 64-character hex private key
          const isValid = /^[0-9a-fA-F]{64}$/.test(line);
          if (!isValid && line.length > 0) {
            console.warn(`⚠️ Invalid private key format (skipping): ${line.substring(0, 6)}...`);
          }
          return isValid;
        });

      if (privateKeys.length === 0) {
        throw new Error('No valid private keys found in PK.txt\nEnsure each key is 64-character hex without 0x prefix');
      }

      console.log(`🔑 Found ${privateKeys.length} valid private key(s)`);

      // Initialize wallets and check balances
      this.wallets = await Promise.all(
        privateKeys.map(async (pk, index) => {
          const wallet = new ethers.Wallet(pk, this.provider);
          const balance = await this.provider.getBalance(wallet.address);
          
          console.log(`\nWallet ${index + 1}:`);
          console.log(`Address: ${wallet.address}`);
          console.log(`Balance: ${ethers.formatEther(balance)} ${this.chain.symbol}`);
          
          return wallet;
        })
      );

      console.log(`\n✅ Successfully initialized ${this.wallets.length} wallet(s)`);
      return this.wallets;

    } catch (error) {
      console.error('\n❌ Failed to initialize wallets:', error.message);
      throw error;
    }
  }

  getProvider() {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }
    return this.provider;
  }

  getWallets() {
    if (this.wallets.length === 0) {
      throw new Error('No wallets initialized');
    }
    return this.wallets;
  }

  getFirstWallet() {
    if (this.wallets.length === 0) {
      throw new Error('No wallets initialized');
    }
    return this.wallets[0];
  }
}

export default WalletManager;
