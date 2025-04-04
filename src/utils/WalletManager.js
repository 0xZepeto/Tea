// src/utils/WalletManager.js
import fs from 'fs';
import path from 'path';

class WalletManager {
  // ... (kode sebelumnya tetap)

  async initializeWalletsFromFile() {
    try {
      const pkPath = path.resolve('./data/PK.txt');
      if (!fs.existsSync(pkPath)) {
        throw new Error('File PK.txt tidak ditemukan');
      }

      const privateKeys = fs.readFileSync(pkPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.length > 0);

      if (privateKeys.length === 0) {
        throw new Error('Tidak ada private key yang valid di PK.txt');
      }

      this.wallets = privateKeys.map(pk => new ethers.Wallet(pk, this.provider));
      console.log(`\n🔑 Loaded ${this.wallets.length} wallets from PK.txt`);
      return this.wallets;
    } catch (error) {
      console.error('Failed to load wallets:', error.message);
      throw error;
    }
  }
}
