// src/services/TokenDeployService.js
import { ethers } from 'ethers';
import gasConfig from '../../config/gas.json' assert { type: 'json' };
import fs from 'fs';
import path from 'path';

class TokenDeployService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async deployToken(name, symbol, initialSupply) {
    try {
      // Load artifact kontrak
      const artifactPath = path.join(process.cwd(), 'artifacts', 'contracts', 'Token.sol', 'Token.json');
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      // Buat folder deployments jika belum ada
      const deploymentPath = path.join(process.cwd(), 'Tea', 'data', 'deployments');
      if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true });
      }

      const senderWallets = this.walletManager.getSenderWallets();
      const deploymentResults = [];

      console.log(`\n🚀 Memulai deploy token dengan ${senderWallets.length} wallet...`);

      for (const walletData of senderWallets) {
        try {
          console.log(`\n🔷 Menggunakan wallet: ${walletData.wallet.address}`);
          
          const factory = new ethers.ContractFactory(
            artifact.abi,
            artifact.bytecode,
            walletData.wallet
          );

          const deployGasLimit = process.env.TOKEN_DEPLOY_GAS_LIMIT || gasConfig.deployment.gasLimit;
          const gasPrice = process.env.TOKEN_GAS_PRICE || gasConfig.deployment.gasPrice;

          console.log(`⚙️ Configurasi:`);
          console.log(`- Nama: ${name}`);
          console.log(`- Symbol: ${symbol}`);
          console.log(`- Initial Supply: ${initialSupply}`);
          console.log(`- Gas Limit: ${deployGasLimit}`);
          console.log(`- Gas Price: ${gasPrice} gwei`);

          const deployTx = await factory.deploy(
            name,
            symbol,
            initialSupply,
            walletData.wallet.address, // Owner = wallet pengirim
            {
              gasLimit: ethers.parseUnits(deployGasLimit, 'wei'),
              gasPrice: ethers.parseUnits(gasPrice, 'gwei')
            }
          );

          console.log(`📝 TX Hash: ${deployTx.deploymentTransaction().hash}`);
          
          const contract = await deployTx.waitForDeployment();
          const contractAddress = await contract.getAddress();
          console.log(`✅ Kontrak berhasil di deploy di: ${contractAddress}`);

          // Simpan info deployment
          const deploymentInfo = {
            name,
            symbol,
            initialSupply,
            contractAddress,
            deployerAddress: walletData.wallet.address,
            deploymentTxHash: deployTx.deploymentTransaction().hash,
            chainId: this.walletManager.chain.chainId,
            timestamp: new Date().toISOString()
          };

          const filename = path.join(deploymentPath, `${symbol}_${walletData.wallet.address}_${Date.now()}.json`);
          fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
          console.log(`💾 Deployment info disimpan di: ${filename}`);

          deploymentResults.push(deploymentInfo);

          // Update contract.txt dengan alamat terakhir
          const contractFilePath = path.join(process.cwd(), 'Tea', 'data', 'contract.txt');
          fs.writeFileSync(contractFilePath, contractAddress);
          console.log(`✏️ File contract.txt diperbarui dengan alamat terbaru`);

        } catch (error) {
          console.error(`❌ Gagal deploy dengan wallet ${walletData.wallet.address}:`, error.message);
          continue;
        }
      }

      console.log('\n🎉 HASIL DEPLOYMENT:');
      deploymentResults.forEach((result, index) => {
        console.log(`\n${index + 1}. ${result.symbol} (${result.name})`);
        console.log(`   Alamat Kontrak: ${result.contractAddress}`);
        console.log(`   Deployer: ${result.deployerAddress}`);
        console.log(`   TX Hash: ${result.deploymentTxHash}`);
      });

      return deploymentResults;
    } catch (error) {
      console.error('Token deployment error:', error.message);
      throw error;
    }
  }
}

export default TokenDeployService;
