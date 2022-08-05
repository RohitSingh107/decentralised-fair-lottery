import { ethers, network } from "hardhat"
import fs from "fs"

const FRONT_END_ADDRESSES_FILE =
  "../decentralised-fair-lottery-nextjs/constants/contractAddresses.json"

const FRONT_END_ABI_FILE =
  "../decentralised-fair-lottery-nextjs/constants/abi.json"

module.exports = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Updating front end...")
    updateContractAddress()
    updateAbi()
  }
}
async function updateContractAddress() {
  const raffle = await ethers.getContract("Raffle")
  const chainId = network.config.chainId!.toString()

  const currentAddresses = JSON.parse(
    fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8")
  )

  if (chainId in currentAddresses) {
    if (!currentAddresses[chainId].includes(raffle.address)) {
      currentAddresses[chainId].push[raffle.address]
    }
  }
  {
    currentAddresses[chainId] = [raffle.address]
  }
  fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(currentAddresses))
}

// async function updateAbi() {
//   const raffle = await ethers.getContract("Raffle")
//   const jsonAbi = raffle.interface.format(ethers.utils.FormatTypes.json)
//   fs.writeFileSync(
//     FRONT_END_ABI_FILE,
//     JSON.stringify(JSON.parse(jsonAbi.toString()), null, 2)
//   )
// }

async function updateAbi() {
  const raffle = await ethers.getContract("Raffle")
  fs.writeFileSync(
    FRONT_END_ABI_FILE,
    raffle.interface.format(ethers.utils.FormatTypes.json).toString()
  )
}

module.exports.tags = ["all", "frontend"]
