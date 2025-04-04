import { chains } from './config/chains.js';
import WalletManager from './src/utils/WalletManager.js';
import TransferWithCustomWalletService from './src/services/TransferWithCustomWalletService.js';
import readline from 'readline';

// Ambil chain pertama dari config
const selectedChain = chains[0];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Masukkan jumlah token per TX: ', async (answer) => {
  const amountPerTx = answer.trim();
  rl.close();

  try {
    const walletManager = new WalletManager();
    await walletManager.loadWallets(); // pastikan ini ada di WalletManager.js

    const transferService = new TransferWithCustomWalletService(walletManager);
    await transferService.run(selectedChain, amountPerTx);
  } catch (err) {
    console.error('❌ Terjadi kesalahan:', err.message);
  }
});
