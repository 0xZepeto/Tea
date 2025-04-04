// src/utils/WalletManager.js
import { ethers } from 'ethers';
import { chains } from '../../config/chains.js';
import fs from 'fs';

class WalletManager {
  constructor(chain) {
    this.chain = chain;
    this.provider = null;
    this.wallets = []; // Ubah ke array untuk multiple wallets
  }

  async initializeWallets() {
    try {
      this.provider = new ethers.JsonRpcProvider(this.chain.rpcUrl);
      
      // Baca semua private key dari file
      const pkPath = './data/PK.txt';
      if (!fs.existsSync(pkPath)) {
        throw new Error('File PK.txt tidak ditemukan');
      }

      const privateKeys = fs.readFileSync(pkPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.length === 64);

      if (privateKeys.length === 0) {
        throw new Error('Tidak ada private key yang valid di PK.txt');
      }

      // Inisialisasi semua wallet
      this.wallets = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));

      // Cek saldo setiap wallet
      for (const wallet of this.wallets) {
        const balance = await this.provider.getBalance(wallet.address);
        console.log(`\n🔗 Wallet ${wallet.address}`);
        console.log(`💰 Balance: ${ethers.formatEther(balance)} ${this.chain.symbol}`);
      }

      return this.wallets;
    } catch (error) {
      console.error('Failed to initialize wallets:', error.message);
      throw error;
    }
  }
}

export default WalletManager;
