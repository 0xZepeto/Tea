// src/services/BatchTransferService.js
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

export default class BatchTransferService {
  constructor(walletManager) {
    this.walletManager = walletManager;
    this.provider = walletManager.getProvider();
  }

  async processBatch(contractAddress, amount, txPerWallet = 120) {
    try {
      // 1. Load contract ABI
      const artifactPath = path.join(process.cwd(), 'artifacts', 'contracts', 'Token.sol', 'Token.json');
      if (!fs.existsSync(artifactPath)) {
        throw new Error(`Contract artifact not found at ${artifactPath}`);
      }
      
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      // 2. Load recipient addresses
      const recipientsPath = path.join(process.cwd(), 'data', 'wallet.txt');
      if (!fs.existsSync(recipientsPath)) {
        throw new Error('wallet.txt not found in data directory');
      }

      const recipients = fs.readFileSync(recipientsPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => ethers.isAddress(line));

      if (recipients.length === 0) {
        throw new Error('No valid recipient addresses in wallet.txt');
      }

      console.log(`\n📊 Starting batch transfer with:`);
      console.log(`- Contract: ${contractAddress}`);
      console.log(`- Amount per TX: ${amount} tokens`);
      console.log(`- TXs per wallet: ${txPerWallet}`);
      console.log(`- Recipients: ${recipients.length} addresses`);

      // 3. Process each wallet
      for (const wallet of this.walletManager.getWallets()) {
        console.log(`\n🔵 Processing wallet ${wallet.address}`);
        const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
        const decimals = await contract.decimals();
        const amountInWei = ethers.parseUnits(amount.toString(), decimals);

        // Check balance first
        const balance = await contract.balanceOf(wallet.address);
        if (balance < amountInWei * BigInt(txPerWallet)) {
          console.warn(`⚠️ Insufficient balance in ${wallet.address} (needed: ${amount * txPerWallet}, has: ${ethers.formatUnits(balance, decimals)})`);
          continue;
        }

        // Process transactions
        for (let i = 0; i < txPerWallet; i++) {
          const recipient = recipients[i % recipients.length];
          try {
            const tx = await contract.transfer(
              recipient,
              amountInWei,
              {
                gasLimit: 100000,
                maxPriorityFeePerGas: ethers.parseUnits("2.5", "gwei"),
                maxFeePerGas: ethers.parseUnits("30", "gwei")
              }
            );
            console.log(`✅ TX ${i + 1}/${txPerWallet} to ${recipient} | ${tx.hash}`);
            await tx.wait(1); // Tunggu 1 konfirmasi block
            await new Promise(resolve => setTimeout(resolve, 500)); // delay ringan
          } catch (error) {
            console.error(`❌ Failed TX ${i + 1}: ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 3000)); // delay lebih lama jika error
          }
        }
      }
      
      console.log('\n🎉 Batch transfer completed!');
    } catch (error) {
      console.error('\n❌ Batch transfer failed:', error.message);
      throw error;
    }
  }
        }
