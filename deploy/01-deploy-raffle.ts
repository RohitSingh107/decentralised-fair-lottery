import { HardhatRuntimeEnvironment } from "hardhat/types"
import { VRFCoordinatorV2Mock } from "../typechain-types"
import { developmentChains, networkConfig } from "../helper-hardhat.config"
import { ethers, network } from "hardhat"
import { verify } from "../utils/verify"

module.exports = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments } = hre
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()
  const chainId: number = network.config.chainId!

  let vrfCoordinatorV2Address: string | undefined
  let subsciptionId
  const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30")

  if (developmentChains.includes(network.name)) {
    const vRFCoordinatorV2Mock: VRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    )
    vrfCoordinatorV2Address = vRFCoordinatorV2Mock.address
    const transactionResponse = await vRFCoordinatorV2Mock.createSubscription()
    const transactionReceipt = await transactionResponse.wait(1)
    subsciptionId = transactionReceipt.events![0].args!.subId

    await vRFCoordinatorV2Mock.fundSubscription(
      subsciptionId,
      VRF_SUB_FUND_AMOUNT
    )
  } else {
    vrfCoordinatorV2Address = networkConfig[chainId]["vrfCoordinatorV2"]
    subsciptionId = networkConfig[chainId]["subsciptionId"]
  }

  const entranceFee = ethers.utils.parseEther(
    networkConfig[chainId]["entranceFee"]
  )
  const gasLane = networkConfig[chainId]["gasLane"]
  const callbackGasLimit = networkConfig[chainId]["callbackGasLimit"]
  const interval = networkConfig[chainId]["interval"]

  const args = [
    vrfCoordinatorV2Address,
    subsciptionId,
    gasLane,
    interval,
    entranceFee,
    callbackGasLimit,
  ]

  //   console.log(chainId)
  //   console.log(args)

  console.log("Deploying Raffle Contract...")
  const raffle = await deploy("Raffle", {
    from: deployer,
    args: args,
    log: true,
    waitConfirmations: networkConfig[chainId]["waitConfirmations"] || 1,
  })

  if (
    !developmentChains.includes(network.name) &&
    process.env.ETHERSCAN_API_KEY
  ) {
    log("Verifying...")
    await verify(raffle.address, args)
    log("--------------------------------------------")
  }

  // Adding Consumer to vrf Mock
  if (developmentChains.includes(network.name)) {
    const vRFCoordinatorV2Mock = await ethers.getContract(
      "VRFCoordinatorV2Mock"
    )
    await vRFCoordinatorV2Mock.addConsumer(subsciptionId, raffle.address)
    log("Consumer is added")
  }
}

module.exports.tags = ["all", "raffle"]
