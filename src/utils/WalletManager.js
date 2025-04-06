import { ethers } from 'ethers';
import { chains } from '../../config/chains.js';

class WalletManager {
  constructor(chain) {
    this.chain = chain;
    this.provider = new ethers.JsonRpcProvider({
      url: this.chain.rpcUrl,
      retryLimit: 3,    // Coba ulang 3 kali
      retryDelay: 1000, // Tunggu 1 detik antar percobaan
      throttleLimit: 1  // Batasi 1 request per detik
    });
    this.wallet = null;
  }

  async initializeWallet(privateKey) {
    try {
      this.wallet = new ethers.Wallet(privateKey, this.provider);
      const balance = await this.provider.getBalance(this.wallet.address);
      console.log(`\n🔗 Connected to ${this.chain.name}`);
      console.log(`📍 Wallet Address: ${this.wallet.address}`);
      console.log(`💰 Balance: ${ethers.formatEther(balance)} ${this.chain.symbol}\n`);
      return this.wallet;
    } catch (error) {
      console.error('Failed to initialize wallet:', error.message);
      throw error;
    }
  }

  getProvider() {
    return this.provider;
  }

  getWallet() {
    return this.wallet;
  }
}

export default WalletManager;
