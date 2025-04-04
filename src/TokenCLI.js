import readline from 'readline';
import fs from 'fs';
import displayHeader from './utils/displayHeader.js';
import { chains } from '../config/chains.js';
import WalletManager from './utils/WalletManager.js';
import TokenDeployService from './services/TokenDeployService.js';
import TokenTransferService from './services/TokenTransferService.js';
import { ethers } from 'ethers';

class TokenCLI {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async initialize() {
    await displayHeader();
  }

  async question(query) {
    return new Promise((resolve) => {
      this.rl.question(query, (answer) => {
        resolve(answer);
      });
    });
  }

  async selectChain() {
    try {
      if (chains.length === 1) {
        console.log(`\n🌐 Menggunakan chain: ${chains[0].name}`);
        return chains[0];
      }
      console.log('\n🌐 Chain yang tersedia:');
      chains.forEach((chain, index) => {
        console.log(`${index + 1}. ${chain.name}`);
      });
      const answer = await this.question('\nPilih chain (masukkan nomor): ');
      const selection = parseInt(answer) - 1;
      if (selection >= 0 && selection < chains.length) {
        console.log(`\n✅ Chain terpilih: ${chains[selection].name}`);
        return chains[selection];
      } else {
        throw new Error('Pilihan chain tidak valid');
      }
    } catch (error) {
      console.error('Error pemilihan chain:', error.message);
      process.exit(1);
    }
  }

  async getPrivateKeys() {
    const pkPath = './data/PK.txt';
    if (!fs.existsSync(pkPath)) {
      throw new Error('File PK.txt tidak ditemukan di folder data');
    }
    const privateKeys = fs.readFileSync(pkPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.length > 0);
    if (privateKeys.length === 0)A {
      throw new Error('Tidak ada private key yang valid di PK.txt');
    }
    return privateKeys;
  }

  async getContractAddress() {
    const contractPath = './data/contract.txt';
    if (!fs.existsSync(contractPath)) {
      throw new Error('File contract.txt tidak ditemukan di folder data');
    }
    const contractAddress = fs.readFileSync(contractPath, 'utf8').trim();
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      throw new Error('Contract address tidak valid di contract.txt');
    }
    return contractAddress;
  }

  async getWalletAddresses() {
    const walletPath = './data/wallet.txt';
    if (!fs.existsSync(walletPath)) {
      throw new Error('File wallet.txt tidak ditemukan di folder data');
    }
    const addresses = fs.readFileSync(walletPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.length > 0);
    if (addresses.length === 0) {
      throw new Error('Tidak ada alamat wallet yang valid di wallet.txt');
    }
    return addresses;
  }

  // Fungsi untuk menghasilkan jumlah token acak antara 1 juta dan 100 juta
  getRandomAmount() {
    const min = 1000000; // 1 juta
    const max = 100000000; // 100 juta
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  // Fungsi untuk memilih alamat acak dari wallet.txt
  getRandomAddress(addresses) {
    const randomIndex = Math.floor(Math.random() * addresses.length);
    return addresses[randomIndex];
  }

  async run() {
    try {
      await this.initialize();
      const chain = await this.selectChain();

      // Ambil semua private key dari PK.txt
      const privateKeys = await this.getPrivateKeys();
      console.log(`\n🔑 Ditemukan ${privateKeys.length} private key di PK.txt`);

      // Ambil contract address dari contract.txt
      const contractAddress = await this.getContractAddress();
      console.log(`\n📜 Menggunakan contract address: ${contractAddress}`);

      // Ambil semua alamat dari wallet.txt
      const walletAddresses = await this.getWalletAddresses();
      console.log(`\n📍 Ditemukan ${walletAddresses.length} alamat tujuan di wallet.txt`);

      // Proses setiap private key secara berurutan
      for (const [index, privateKey] of privateKeys.entries()) {
        console.log(`\n🔄 Memproses akun #${index + 1}...`);

        // Inisialisasi wallet untuk private key saat ini
        const walletManager = new WalletManager(chain);
        await walletManager.initializeWallet(privateKey);

        // Inisialisasi TokenTransferService
        const tokenTransferService = new TokenTransferService(walletManager);

        // Lakukan 101 transaksi untuk akun ini dengan jumlah token dan tujuan acak
        for (let i = 0; i < 101; i++) {
          const amount = this.getRandomAmount(); // Jumlah token acak
          const toAddress = this.getRandomAddress(walletAddresses); // Alamat tujuan acak dari wallet.txt
          console.log(`\n📤 Transaksi #${i + 1} untuk akun #${index + 1} - Mengirim ${amount} token ke ${toAddress}`);
          await tokenTransferService.transferToken(
            contractAddress,
            toAddress, // Kirim ke alamat acak dari wallet.txt
            amount
          );
        }
        console.log(`✅ Selesai memproses 101 transaksi untuk akun #${index + 1}`);
      }

      console.log('\n🎉 Semua akun telah diproses!');
      this.rl.close();
    } catch (error) {
      console.error('Error:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }
}

export default TokenCLI;
