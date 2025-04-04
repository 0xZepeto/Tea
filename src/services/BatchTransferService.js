// src/services/BatchTransferService.js
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

class BatchTransferService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async loadContractAddress() {
    const contractPath = path.join(process.cwd(), 'Tea', 'data', 'contract.txt');
    if (!fs.existsSync(contractPath)) {
      throw new Error('File contract.txt tidak ditemukan di Tea/data');
    }
    
    const address = fs.readFileSync(contractPath, 'utf8').trim();
    if (!ethers.isAddress(address)) {
      throw new Error('Alamat kontrak tidak valid di contract.txt');
    }
    
    return address;
  }

  async loadTargetAddresses() {
    const walletPath = path.join(process.cwd(), 'Tea', 'data', 'wallet.txt');
    if (!fs.existsSync(walletPath)) {
      throw new Error('File wallet.txt tidak ditemukan di Tea/data');
    }

    const addresses = fs.readFileSync(walletPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && ethers.isAddress(line));

    if (addresses.length === 0) {
      throw new Error('Tidak ada alamat tujuan yang valid di wallet.txt');
    }

    return addresses;
  }

  async executeBatchTransfer(amount, transactionsPerAddress) {
    try {
      const contractAddress = await this.loadContractAddress();
      const targetAddresses = await this.loadTargetAddresses();
      const senderWallets = this.walletManager.getSenderWallets();

      console.log(`\n🚀 Memulai Batch Transfer:`);
      console.log(`- Kontrak Token: ${contractAddress}`);
      console.log(`- Jumlah Tujuan: ${targetAddresses.length} alamat`);
      console.log(`- Transfer per Alamat: ${transactionsPerAddress}x`);
      console.log(`- Wallet Pengirim: ${senderWallets.length} wallet\n`);

      const artifactPath = path.join(process.cwd(), 'artifacts', 'contracts', 'Token.sol', 'Token.json');
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      for (const sender of senderWallets) {
        console.log(`\n🔷 Menggunakan Wallet Pengirim: ${sender.wallet.address}`);
        
        const contract = new ethers.Contract(
          contractAddress,
          artifact.abi,
          sender.wallet
        );

        const decimals = await contract.decimals();
        const amountWithDecimals = ethers.parseUnits(amount.toString(), decimals);
        const totalNeeded = amountWithDecimals * BigInt(transactionsPerAddress * targetAddresses.length);

        // Cek saldo token
        const tokenBalance = await contract.balanceOf(sender.wallet.address);
        if (tokenBalance < totalNeeded) {
          console.log(`⚠ Saldo token tidak cukup (Dibutuhkan: ${ethers.formatUnits(totalNeeded, decimals)}, Tersedia: ${ethers.formatUnits(tokenBalance, decimals)})`);
          continue;
        }

        // Proses transfer ke setiap alamat tujuan
        for (const targetAddress of targetAddresses) {
          console.log(`\n🎯 Target: ${targetAddress}`);
          
          for (let i = 0; i < transactionsPerAddress; i++) {
            try {
              console.log(`  🚀 Mengirim TX ${i+1}...`);
              const tx = await contract.transfer(
                targetAddress,
                amountWithDecimals,
                { gasLimit: 100000, gasPrice: ethers.parseUnits('5', 'gwei') }
              );
              
              console.log(`  📝 TX Hash: ${tx.hash}`);
              const receipt = await tx.wait();
              console.log(`  ✅ Berhasil (Block: ${receipt.blockNumber})`);
            } catch (error) {
              console.log(`  ❌ Gagal TX ${i+1}: ${error.message}`);
            }
          }
        }
      }

      console.log('\n🎉 SEMUA TRANSFER SELESAI!');
    } catch (error) {
      console.error('❌ ERROR:', error.message);
      throw error;
    }
  }
}

export default BatchTransferService;
