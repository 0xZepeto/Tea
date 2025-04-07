import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

class TokenTransferService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async transferToken(contractAddress, toAddress, amount) {
    const artifactPath = './artifacts/contracts/Token.sol/Token.json';
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

    const contract = new ethers.Contract(
      contractAddress,
      artifact.abi,
      this.walletManager.wallet
    );

    const decimals = await contract.decimals();
    const amountWithDecimals = ethers.parseUnits(amount.toString(), decimals);

    const balance = await contract.balanceOf(this.walletManager.wallet.address);
    if (balance < amountWithDecimals) {
      throw new Error(`Saldo tidak cukup: ${ethers.formatUnits(balance, decimals)} tersedia`);
    }

    const tx = await contract.transfer(toAddress, amountWithDecimals);
    console.log(`│ 🔗 Tx Hash: ${tx.hash}`);
    console.log(`│ 🔍 Explorer: ${this.walletManager.chain.explorer}/tx/${tx.hash}`);

    const receipt = await tx.wait();
    console.log(`│ ⛓️ Block: ${receipt.blockNumber}`);
    return receipt;
  }

  async transferFromWalletTxt(contractAddress, amount) {
    try {
      const walletPath = './data/wallet.txt';
      if (!fs.existsSync(walletPath)) {
        throw new Error('File wallet.txt tidak ditemukan');
      }

      const addresses = fs.readFileSync(walletPath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && line.length > 0);

      if (addresses.length === 0) {
        throw new Error('Tidak ada alamat wallet yang valid di wallet.txt');
      }

      console.log(`\n🚀 Memulai transfer token ke ${addresses.length} alamat dari wallet.txt...\n`);

      for (const address of addresses) {
        if (!ethers.isAddress(address)) {
          console.log(`⚠️ Melewati alamat tidak valid: ${address}`);
          continue;
        }

        console.log(`💸 Mentransfer token ke ${address}...`);
        await this.transferToken(contractAddress, address, amount);
        console.log(`✅ Transfer selesai!\n`);
      }

      console.log('🎉 Semua transfer selesai!');
    } catch (error) {
      console.error(`Error batch transfer: ${error.message}`);
      throw error;
    }
  }

  async transferToNewWallets(contractAddress, numberOfWallets, amount) {
    try {
      const wallets = [];
      console.log(`\n🚀 Membuat ${numberOfWallets} wallet baru dan mentransfer token...\n`);

      for (let i = 0; i < numberOfWallets; i++) {
        const newWallet = ethers.Wallet.createRandom();
        wallets.push(newWallet);

        console.log(`💸 Mentransfer token ke wallet #${i + 1}: ${newWallet.address}`);
        await this.transferToken(contractAddress, newWallet.address, amount);
        console.log(`🔑 Private Key: ${newWallet.privateKey}\n`);
      }

      const walletInfo = wallets.map(wallet => ({
        address: wallet.address,
        privateKey: wallet.privateKey
      }));

      const filename = `./data/generated_wallets_${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(walletInfo, null, 2));
      console.log(`💾 Informasi wallet baru disimpan di: ${filename}`);

      console.log('🎉 Semua transfer ke wallet baru selesai!');
      return wallets;
    } catch (error) {
      console.error(`Error transfer ke wallet baru: ${error.message}`);
      throw error;
    }
  }
}

export default TokenTransferService;
