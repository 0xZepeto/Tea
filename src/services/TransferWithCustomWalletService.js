import { ethers } from 'ethers';
import fs from 'fs';

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)"
];

class TransferWithCustomWalletService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async run(chain, amountPerTx, txCountPerWallet = 101) {
    const provider = new ethers.providers.JsonRpcProvider(chain.rpc);

    const mainWallets = this.walletManager.wallets;
    const recipientAddresses = fs.readFileSync('wallet.txt', 'utf-8')
      .split('\n')
      .map(addr => addr.trim())
      .filter(Boolean);

    const contractAddresses = fs.readFileSync('contract.txt', 'utf-8')
      .split('\n')
      .map(addr => addr.trim())
      .filter(Boolean);

    console.log(`\n🧾 Total contract loaded: ${contractAddresses.length}`);
    console.log(`📥 Total recipient loaded: ${recipientAddresses.length}`);

    for (let i = 0; i < mainWallets.length; i++) {
      const wallet = mainWallets[i].connect(provider);
      const contractAddress = contractAddresses[i];

      if (!contractAddress) {
        console.log(`⚠️ Tidak ada contract untuk wallet #${i + 1}`);
        continue;
      }

      const token = new ethers.Contract(contractAddress, ERC20_ABI, wallet);

      console.log(`\n➡️ Wallet #${i + 1} memulai transfer token dari ${contractAddress}`);

      for (const recipient of recipientAddresses) {
        for (let tx = 0; tx < txCountPerWallet; tx++) {
          try {
            const txHash = await token.transfer(recipient, ethers.utils.parseUnits(amountPerTx.toString(), 18));
            console.log(`✅ TX ${tx + 1} to ${recipient}: ${txHash.hash}`);
            await txHash.wait();
          } catch (err) {
            console.log(`❌ Gagal TX ${tx + 1} to ${recipient}: ${err.message}`);
            break;
          }
        }
      }
    }

    console.log('\n🎉 Semua transfer selesai!');
  }
}

export default TransferWithCustomWalletService;
              
