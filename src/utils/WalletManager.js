// src/utils/WalletManager.js
import { ethers } from 'ethers';
import { chains } from '../../config/chains.js';
import fs from 'fs';
import path from 'path';

class WalletManager {
  constructor(chain) {
    this.chain = chain;
    this.provider = new ethers.JsonRpcProvider(chain.rpcUrl);
    this.senderWallets = [];
  }

  async loadSenderWallets() {
    try {
      const pkPath = path.join(process.cwd(), 'Tea', 'PK.txt');
      if (!fs.existsSync(pkPath)) {
        throw new Error('File PK.txt tidak ditemukan di folder Tea');
      }

      const privateKeys = fs.readFileSync(pkPath, 'utf8')
        .split('\n')
        .map(pk => pk.trim())
        .filter(pk => pk.length > 0);

      if (privateKeys.length === 0) {
        throw new Error('Tidak ada private key yang valid di PK.txt');
      }

      console.log(`\n🔍 Menemukan ${privateKeys.length} private key di PK.txt`);
      
      for (const pk of privateKeys) {
        const wallet = new ethers.Wallet(pk, this.provider);
        const balance = await this.provider.getBalance(wallet.address);
        this.senderWallets.push({
          wallet,
          balance: ethers.formatEther(balance)
        });
        console.log(`✅ Loaded wallet: ${wallet.address} (Balance: ${ethers.formatEther(balance)} ${this.chain.symbol})`);
      }

      return this.senderWallets;
    } catch (error) {
      console.error('Gagal memuat wallet pengirim:', error.message);
      throw error;
    }
  }

  getSenderWallets() {
    return this.senderWallets;
  }

  getProvider() {
    return this.provider;
  }
}

export default WalletManager;
