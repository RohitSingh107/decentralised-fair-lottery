import { developmentChains, networkConfig } from "../../helper-hardhat.config"
import { getNamedAccounts, deployments, network, ethers } from "hardhat"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", async () => {
      let raffle: Raffle
      let vRFCoordinatorV2Mock: VRFCoordinatorV2Mock
      const chainId: number = network.config.chainId!
      let raffleEnteranceFee: BigNumber
      let accounts: SignerWithAddress[]
      let deployer: SignerWithAddress

      beforeEach(async () => {
        // const { deployer } = await getNamedAccounts()
        accounts = await ethers.getSigners()
        deployer = accounts[0]

        const deployedContracts = await deployments.fixture(["all"])

        // List of Contracts deployed
        // console.log(Object.keys(deployedContracts))

        raffle = await ethers.getContract("Raffle", deployer)
        vRFCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        )
        raffleEnteranceFee = await raffle.getEnranceFee()
      })

      describe("constructor", async () => {
        it("Initializes the raffle correctly", async () => {
          const raffleState = await raffle.getRaffleState()
          const interval = await raffle.getInterval()
          assert.equal(raffleState.toString(), "0")
          assert.equal(interval.toString(), networkConfig[chainId]["interval"])
        })
      })

      describe("enterRaffle", async () => {
        it("reverts when you don't pay enough", async () => {
          await expect(raffle.enterRaffle()).to.be.revertedWith(
            "Raffle__NotEnoughETHEntered"
          )
        })

        it("records players when they enter", async () => {
          await raffle.enterRaffle({ value: raffleEnteranceFee })
          const playerFromContract = await raffle.getPlayer(0)
          assert.equal(playerFromContract, deployer.address)
        })
      })
    })
