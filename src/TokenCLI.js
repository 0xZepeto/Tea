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
      .filter(line => line && line.length > 0)
      .map(pk => pk.startsWith('0x') ? pk.slice(2) : pk);
    if (privateKeys.length === 0) {
      throw new Error('Tidak ada private key yang valid di PK.txt');
    }
    return privateKeys;
  }

  async getContractAddresses() {
    const contractPath = './data/contract.txt';
    if (!fs.existsSync(contractPath)) {
      throw new Error('File contract.txt tidak ditemukan di folder data');
    }
    const contractAddresses = fs.readFileSync(contractPath, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && line.length > 0);
    if (contractAddresses.length === 0) {
      throw new Error('Tidak ada contract address yang valid di contract.txt');
    }
    for (const addr of contractAddresses) {
      if (!ethers.isAddress(addr)) {
        throw new Error(`Contract address tidak valid: ${addr}`);
      }
    }
    return contractAddresses;
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

  async getTokenDetails() {
    const name = await this.question('\nMasukkan nama token: ');
    const symbol = await this.question('Masukkan simbol token: ');
    const supply = await this.question('Masukkan jumlah supply awal: ');
    if (!name || !symbol || !supply || isNaN(supply) || parseFloat(supply) <= 0) {
      throw new Error('Detail token tidak valid');
    }
    return { name, symbol, supply: parseFloat(supply) };
  }

  getRandomAmount() {
    const min = 5686;
    const max = 17810;
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  getRandomAddress(addresses) {
    const randomIndex = Math.floor(Math.random() * addresses.length);
    return addresses[randomIndex];
  }

  getRandomContractAddress(contractAddresses) {
    const randomIndex = Math.floor(Math.random() * contractAddresses.length);
    return contractAddresses[randomIndex];
  }

  async selectOperation() {
    console.log('\n📝 Pilih operasi yang akan dilakukan:');
    console.log('1. Deploy token baru');
    console.log('2. Transfer token dari daftar kontrak (paralel)');
    const answer = await this.question('\nPilih operasi (1-2): ');
    const selection = parseInt(answer);
    if (selection >= 1 && selection <= 2) {
      return selection;
    } else {
      throw new Error('Pilihan operasi tidak valid');
    }
  }

  async processAccount(index, privateKey, chain, contractAddresses, walletAddresses) {
    try {
      console.log(`\n🔄 Memulai akun #${index + 1}...`);
      const walletManager = new WalletManager(chain);
      await walletManager.initializeWallet('0x' + privateKey);
      const tokenTransferService = new TokenTransferService(walletManager);

      for (let i = 0; i < 101; i++) {
        const amount = this.getRandomAmount();
        const toAddress = this.getRandomAddress(walletAddresses);
        const contractAddress = this.getRandomContractAddress(contractAddresses);
        console.log(`[${new Date().toISOString()}] 📤 Transaksi #${i + 1} untuk akun #${index + 1} - Mengirim ${amount} token dari kontrak ${contractAddress} ke ${toAddress}`);
        await tokenTransferService.transferToken(contractAddress, toAddress, amount);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Delay 1 detik
      }
      console.log(`✅ Akun #${index + 1} selesai`);
    } catch (error) {
      console.error(`Error pada akun #${index + 1}: ${error.message}`);
    }
  }

  async run() {
    try {
      await this.initialize();
      const chain = await this.selectChain();
      const privateKeys = await this.getPrivateKeys();
      console.log(`\n🔑 Ditemukan ${privateKeys.length} private key di PK.txt`);
      const operation = await this.selectOperation();

      if (operation === 1) {
        const tokenDetails = await this.getTokenDetails();
        const walletManager = new WalletManager(chain);
        const privateKey = privateKeys[0];
        await walletManager.initializeWallet('0x' + privateKey);
        const tokenDeployService = new TokenDeployService(walletManager);
        await tokenDeployService.deployToken(
          tokenDetails.name,
          tokenDetails.symbol,
          tokenDetails.supply
        );
      } else if (operation === 2) {
        const contractAddresses = await this.getContractAddresses();
        console.log(`\n📜 Ditemukan ${contractAddresses.length} contract address di contract.txt`);
        const walletAddresses = await this.getWalletAddresses();
        console.log(`\n📍 Ditemukan ${walletAddresses.length} alamat tujuan di wallet.txt`);

        // Proses akun satu per satu, bukan paralel
        for (const [index, privateKey] of privateKeys.entries()) {
          await this.processAccount(index, privateKey, chain, contractAddresses, walletAddresses);
        }
      }

      console.log('\n🎉 Operasi selesai!');
      this.rl.close();
    } catch (error) {
      console.error('Error:', error.message);
      this.rl.close();
      process.exit(1);
    }
  }
}

export default TokenCLI;
