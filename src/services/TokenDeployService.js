import { ethers } from 'ethers';
import gasConfig from '../../config/gas.json' assert { type: 'json' };

class TokenDeployService {
  constructor(walletManager) {
    this.walletManager = walletManager;
  }

  async deployToken(name, symbol, initialSupply) {
    try {
      const fs = await import('fs');
      const artifactPath = './artifacts/contracts/Token.sol/Token.json';
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

      const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode,
        this.walletManager.wallet
      );
      const deployGasLimit = process.env.TOKEN_DEPLOY_GAS_LIMIT || gasConfig.deployment.gasLimit;
      const gasPrice = process.env.TOKEN_GAS_PRICE || gasConfig.deployment.gasPrice;

      console.log('\n🚀 Deploying token with the following configuration:');
      console.log(`Name: ${name}`);
      console.log(`Symbol: ${symbol}`);
      console.log(`Initial Supply: ${initialSupply}`);
      console.log(`Gas Limit: ${deployGasLimit}`);
      console.log(`Gas Price: ${gasPrice} gwei\n`);

      const deployTx = await factory.deploy(
        name,
        symbol,
        initialSupply,
        this.walletManager.wallet.address,
        {
          gasLimit: ethers.parseUnits(deployGasLimit, 'wei'),
          gasPrice: ethers.parseUnits(gasPrice, 'gwei')
        }
      );

      console.log(`📝 Token deployment transaction sent: ${deployTx.deploymentTransaction().hash}`);
      console.log(`🔍 Explorer: ${this.walletManager.chain.explorer}/tx/${deployTx.deploymentTransaction().hash}`);

      const contract = await deployTx.waitForDeployment();
      console.log(`✅ Token deployed at: ${await contract.getAddress()}`);
      const deploymentInfo = {
        name,
        symbol,
        initialSupply,
        contractAddress: await contract.getAddress(),
        deployerAddress: this.walletManager.wallet.address,
        deploymentTxHash: deployTx.deploymentTransaction().hash,
        chainId: this.walletManager.chain.chainId
      };

      const deploymentPath = './data/deployments';
      if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath, { recursive: true });
      }

      const filename = `${deploymentPath}/${symbol}_${Date.now()}.json`;
      fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
      console.log(`\n💾 Deployment info saved to: ${filename}`);

      return contract;
    } catch (error) {
      console.error(`Token deployment error: ${error.message}`);
      throw error;
    }
  }
}

export default TokenDeployService;
