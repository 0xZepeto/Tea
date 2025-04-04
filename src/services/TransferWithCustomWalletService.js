import { JsonRpcProvider, Contract, parseUnits } from 'ethers';
import fs from 'fs';
import { chains } from './config/chains.js';

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)"
];

class TransferWithCustomWalletService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async run(amountPerTx, txCountPerWallet = 101) {
    const chain = chains.find(c => c.name === "Tea Sepolia");

    if (!chain) {
      console.error("❌ Chain 'Tea Sepolia' tidak ditemukan di config.");
      process.exit(1);
    }

    console.log(`\n🌐 Menggunakan RPC: ${chain.rpcUrl}`);

    let provider;
    try {
      provider = new JsonRpcProvider(chain.rpcUrl);
      await provider.getBlockNumber(); // Tes koneksi RPC
    } catch (error) {
      console.error("❌ RPC Error:", error.message);
      process.exit(1);
    }

    const mainWallets = this.walletManager.wallets;
    const recipientAddresses = fs.readFileSync('./data/wallet.txt', 'utf-8')
      .split('\n').map(addr => addr.trim()).filter(Boolean);

    const contractAddresses = fs.readFileSync('./data/contract.txt', 'utf-8')
      .split('\n').map(addr => addr.trim()).filter(Boolean);

    if (contractAddresses.length < mainWallets.length) {
      console.warn(`⚠️ Jumlah kontrak (${contractAddresses.length}) lebih sedikit dari jumlah wallet (${mainWallets.length}).`);
    }

    console.log(`\n🧾 Total contract loaded: ${contractAddresses.length}`);
    console.log(`📥 Total recipient loaded: ${recipientAddresses.length}`);

    for (let i = 0; i < mainWallets.length; i++) {
      const wallet = mainWallets[i].connect(provider);
      const contractAddress = contractAddresses[i];

      if (!contractAddress) {
        console.log(`⚠️ Tidak ada contract untuk wallet #${i + 1}`);
        continue;
      }

      const token = new Contract(contractAddress, ERC20_ABI, wallet);
      console.log(`\n➡️ Wallet #${i + 1} mulai transfer token dari ${contractAddress}`);

      for (const recipient of recipientAddresses) {
        try {
          const txPromises = Array.from({ length: txCountPerWallet }, async (_, txIndex) => {
            try {
              const txRes = await token.transfer(recipient, parseUnits(amountPerTx.toString(), 18));
              console.log(`✅ TX ${txIndex + 1} ke ${recipient}: ${txRes.hash}`);
              await txRes.wait();
            } catch (err) {
              console.log(`❌ Gagal TX ${txIndex + 1} ke ${recipient}: ${err.message}`);
            }
          });

          await Promise.all(txPromises);
        } catch (err) {
          console.error(`❌ Kesalahan saat transfer ke ${recipient}:`, err.message);
        }
      }
    }

    console.log('\n🎉 Semua transfer selesai!');
  }
}

export default TransferWithCustomWalletService;
