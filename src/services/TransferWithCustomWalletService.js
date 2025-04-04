import { JsonRpcProvider, Contract, parseUnits } from 'ethers';
import fs from 'fs';

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)"
];

class TransferWithCustomWalletService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async run(chain, amountPerTx, txCountPerWallet = 101) {
    console.log(`\n🌐 Menggunakan RPC: ${chain.rpc}`);
    
    let provider;
    try {
      provider = new JsonRpcProvider(chain.rpc);
      await provider.getBlockNumber(); // Cek apakah RPC valid
    } catch (error) {
      console.error("❌ RPC Error:", error.message);
      process.exit(1);
    }

    const mainWallets = this.walletManager.wallets;
    const recipientAddresses = fs.readFileSync('./data/wallet.txt', 'utf-8')
      .split('\n')
      .map(addr => addr.trim())
      .filter(Boolean);

    const contractAddresses = fs.readFileSync('./data/contract.txt', 'utf-8')
      .split('\n')
      .map(addr => addr.trim())
      .filter(Boolean);

    if (contractAddresses.length < mainWallets.length) {
      console.warn(`⚠️ Jumlah kontrak (${contractAddresses.length}) lebih sedikit dari jumlah dompet (${mainWallets.length}).`);
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

      console.log(`\n➡️ Wallet #${i + 1} memulai transfer token dari ${contractAddress}`);

      for (const recipient of recipientAddresses) {
        try {
          // Kirim transaksi secara paralel hingga txCountPerWallet
          const txPromises = Array.from({ length: txCountPerWallet }, async (_, txIndex) => {
            try {
              const txRes = await token.transfer(recipient, parseUnits(amountPerTx.toString(), 18));
              console.log(`✅ TX ${txIndex + 1} to ${recipient}: ${txRes.hash}`);
              await txRes.wait();
            } catch (err) {
              console.log(`❌ Gagal TX ${txIndex + 1} to ${recipient}: ${err.message}`);
            }
          });

          await Promise.all(txPromises);
        } catch (err) {
          console.error(`❌ Kesalahan umum saat transfer ke ${recipient}:`, err.message);
        }
      }
    }

    console.log('\n🎉 Semua transfer selesai!');
  }
}

export default TransferWithCustomWalletService;
