import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "./config.env" });

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY

const SEPOLIA_PRIVATE_KEY = process.env.SEPOLIA_PRIVATE_KEY

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY

console.log("ETHERSCAN_API_KEY", process.env.ETHERSCAN_API_KEY);


if (!ALCHEMY_API_KEY || !SEPOLIA_PRIVATE_KEY || !ETHERSCAN_API_KEY) {

  throw new Error("Missing required environment variables.");
}

const config: HardhatUserConfig = {
  solidity: "0.8.26",
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  networks: {
    sepolia: {
      url: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`,
      accounts: [SEPOLIA_PRIVATE_KEY]
    },
  },
};

export default config;


