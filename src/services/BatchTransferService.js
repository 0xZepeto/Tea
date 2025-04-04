// src/services/BatchTransferService.js
import { ethers } from 'ethers';

class BatchTransferService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async batchTransfer(contractAddress, amount, txPerWallet = 120) {
    try {
      const artifactPath = './artifacts/contracts/Token.sol/Token.json';
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      for (const wallet of this.walletManager.wallets) {
        console.log(`\n🔵 Processing wallet: ${wallet.address}`);
        const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

        for (let i = 1; i <= txPerWallet; i++) {
          try {
            const tx = await contract.transfer(
              wallet.address, // Send to self (sesuaikan dengan kebutuhan)
              ethers.parseUnits(amount.toString(), 18),
              { gasLimit: 100000 }
            );
            console.log(`✅ TX ${i}/${txPerWallet}: ${tx.hash}`);
          } catch (error) {
            console.error(`❌ TX ${i} failed: ${error.message}`);
          }
        }
      }
    } catch (error) {
      console.error('Batch transfer error:', error.message);
      throw error;
    }
  }
}

export default BatchTransferService;
