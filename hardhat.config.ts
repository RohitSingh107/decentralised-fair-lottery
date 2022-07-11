import * as dotenv from "dotenv"
import { HardhatUserConfig, task } from "hardhat/config"
import "@nomiclabs/hardhat-etherscan"
import "@nomiclabs/hardhat-waffle"
import "hardhat-gas-reporter"
import "solidity-coverage"
import "hardhat-deploy"
import "@nomiclabs/hardhat-ethers"
import "dotenv/config"
import "@typechain/hardhat"

dotenv.config()

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 31337,
      // blockConfirmations: 1,
    },
    rinkeby: {
      chainId: 4,
      // blockConfirmations: 6,
      url: process.env.RINKEBY_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  solidity: {
    compilers: [{ version: "0.8.9", settings: {} }],
  },

  namedAccounts: {
    deployer: {
      default: 0,
    },
    player: {
      default: 1,
    },
  },
}

export default config
