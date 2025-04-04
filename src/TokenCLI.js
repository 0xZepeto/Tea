// src/TokenCLI.js
import readline from 'readline';
import displayHeader from './utils/displayHeader.js';
import { chains } from '../config/chains.js';
import WalletManager from './utils/WalletManager.js';
import TokenDeployService from './services/TokenDeployService.js';
import BatchTransferService from './services/BatchTransferService.js';

class TokenCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  // ... (method lainnya tetap sama)

  async selectOperation() {
    console.log('\n📝 Pilih operasi yang akan dilakukan:');
    console.log('1. Deploy token baru');
    console.log('2. Batch Transfer 101x ke alamat di wallet.txt');
    
    const answer = await this.question('\nPilih operasi (1-2): ');
    const selection = parseInt(answer);

    if (selection >= 1 && selection <= 2) {
      return selection;
    } else {
      throw new Error('Pilihan operasi tidak valid');
    }
  }

  async run() {
    try {
      await this.initialize();
      const chain = await this.selectChain();
      const walletManager = new WalletManager(chain);
      
      // Load semua wallet pengirim dari PK.txt
      await walletManager.loadSenderWallets();

      const operation = await this.selectOperation();

      if (operation === 1) {
        // Deploy token baru
        const tokenDetails = await this.getTokenDetails();
        const tokenDeployService = new TokenDeployService({
          wallet: walletManager.getSenderWallets()[0].wallet,
          chain
        });
        await tokenDeployService.deployToken(
          tokenDetails.name,
          tokenDetails.symbol,
          tokenDetails.supply
        );
      } else {
        // Batch Transfer
        const amount = await this.question('Masukkan jumlah token per transfer: ');
        const batchService = new BatchTransferService(walletManager);
        await batchService.executeBatchTransfer(amount, 101); // 101x transfer
      }

      this.rl.close();
    } catch (error) {
      console.error('Error:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }
}

export default TokenCLI;
