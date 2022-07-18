import { developmentChains, networkConfig } from "../../helper-hardhat.config"
import { deployments, network, ethers } from "hardhat"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { count, log } from "console"

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Staging Tests", () => {
      let raffle: Raffle
      const chainId: number = network.config.chainId!
      let raffleEnteranceFee: BigNumber
      let accounts: SignerWithAddress[]
      let deployer: SignerWithAddress

      beforeEach(async () => {
        // const { deployer } = await getNamedAccounts()
        accounts = await ethers.getSigners()
        deployer = accounts[0]

        raffle = await ethers.getContract("Raffle", deployer)
        raffleEnteranceFee = await raffle.getEnranceFee()
      })

      describe("works with live Chainlink keepers and Chainlink vrf, we get a random winner", async () => {
        it("works with live Chainlink keepers and Chainlink vrf, we get a random winner", async () => {
          const startingTimeStamp = await raffle.getLatestTimeStamp()

          await new Promise<void>(async (resolve, reject) => {
            raffle.once("WinnerPicked", async () => {
              console.log("WinnerPicked event fired!")
              resolve()

              try {
                const recentWinner = await raffle.getLatestTimeStamp()
                const raffleState = await raffle.getRaffleState()
                const winnerEndingBalance = await accounts[0].getBalance()
                const endingTimeStamp = await raffle.getLatestTimeStamp()

                await expect(raffle.getPlayer(0)).to.be.reverted
                assert.equal(recentWinner.toString(), accounts[0].address)
                assert.equal(raffleState, 0)
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStarttingBalance.add(raffleEnteranceFee).toString()
                )
                assert(endingTimeStamp > startingTimeStamp)
              } catch (error) {
                console.log(error)
                reject(error)
              }
            })

            await raffle.enterRaffle({ value: raffleEnteranceFee })
            const winnerStarttingBalance = await accounts[0].getBalance()
          })
        })
      })
    })
