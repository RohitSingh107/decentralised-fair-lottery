import { developmentChains, networkConfig } from "../../helper-hardhat.config"
import { deployments, network, ethers } from "hardhat"
import { Raffle, VRFCoordinatorV2Mock } from "../../typechain-types"
import { assert, expect } from "chai"
import { BigNumber } from "ethers"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Raffle Unit Tests", () => {
      let raffle: Raffle
      let vRFCoordinatorV2Mock: VRFCoordinatorV2Mock
      const chainId: number = network.config.chainId!
      let raffleEnteranceFee: BigNumber
      let accounts: SignerWithAddress[]
      let deployer: SignerWithAddress
      let interval: BigNumber

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
        interval = await raffle.getInterval()
      })

      describe("constructor", () => {
        it("Initializes the raffle correctly", async () => {
          const raffleState = await raffle.getRaffleState()
          assert.equal(raffleState.toString(), "0")
          assert.equal(interval.toString(), networkConfig[chainId]["interval"])
        })
      })

      describe("enterRaffle", () => {
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

        it("emits event on enter", async () => {
          await expect(
            raffle.enterRaffle({ value: raffleEnteranceFee })
          ).to.emit(raffle, "RaffleEnter")
        })

        it("doesn't allow entrance when raffle is calculating", async () => {
          await raffle.enterRaffle({ value: raffleEnteranceFee })
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ])

          await network.provider.send("evm_mine", [])

          await raffle.performUpkeep([])
          await expect(
            raffle.enterRaffle({ value: raffleEnteranceFee })
          ).to.be.revertedWith("Raffle__NotOpen")
        })

        describe("checkUpkeep", () => {
          it("returns false if people haven't sent any ETH", async () => {
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ])

            await network.provider.send("evm_mine", [])
            // await raffle.callStatic.checkUpkeep([])
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
          })
          it("returns false if raffle isn't open", async () => {
            await raffle.enterRaffle({ value: raffleEnteranceFee })
            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ])

            await network.provider.send("evm_mine", [])
            await raffle.performUpkeep([])
            const raffleState = await raffle.getRaffleState()
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            assert.equal(raffleState.toString(), "1")
            assert.equal(upkeepNeeded, false)
          })

          // it("returns false if enough time isn't passed, () => {}")

          // it("returns true if enough time has passed, has players, eth and is open () => {}")
        })

        describe("performUpkeep", () => {
          it("it can only run if checkUpkeep is true", async () => {
            await raffle.enterRaffle({ value: raffleEnteranceFee })

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ])
            await network.provider.send("evm_mine", [])
            const tx = await raffle.performUpkeep([])
            assert(tx)
          })

          it("reverts when checkUpkeep is false", async () => {
            await expect(raffle.performUpkeep([])).to.be.revertedWith(
              "Raffle__UpkeepNotNeed"
            )
          })

          it("updates the raffle state, emits and event and calls the vrf cordinator", async () => {
            await raffle.enterRaffle({ value: raffleEnteranceFee })

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ])
            await network.provider.send("evm_mine", [])

            const txResponse = await raffle.performUpkeep([])
            const txReceipt = await txResponse.wait(1)

            const requestId = txReceipt!.events![1].args!.requestId

            const raffleState = await raffle.getRaffleState()
            assert(requestId.toNumber() > 0)
            assert(raffleState.toString() == "1")
          })
        })
        describe("fulfillRandomWords", async () => {
          beforeEach(async () => {
            await raffle.enterRaffle({ value: raffleEnteranceFee })

            await network.provider.send("evm_increaseTime", [
              interval.toNumber() + 1,
            ])
            await network.provider.send("evm_mine", [])
          })

          it("can only be called after performUpkeep", async () => {
            await expect(
              vRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
            ).to.be.revertedWith("nonexistent request")

            await expect(
              vRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
            ).to.be.revertedWith("nonexistent request")
          })

          it("picks a winner, resets the lottery, and sends money", async () => {
            const additionalEntrants = 3
            const startingAccountIndex = 1 // deployer = 0
            for (
              let i = startingAccountIndex;
              i < startingAccountIndex + additionalEntrants;
              i++
            ) {
              const accountConnectedRaffle = raffle.connect(accounts[i])
              await accountConnectedRaffle.enterRaffle({
                value: raffleEnteranceFee,
              })
              // console.log(accountConnectedRaffle)
            }

            const startingTimeStamp = await raffle.getLatestTimeStamp()
            await new Promise<void>(async (resolve, reject) => {
              raffle.once("WinnerPicked", async () => {
                console.log("Found the winner!")
                try {
                  const recentWinner = await raffle.getRecentWinner()
                  // console.log(recentWinner)
                  // console.log(accounts[2].address)
                  // console.log(accounts[0].address)
                  // console.log(accounts[1].address)
                  // console.log(accounts[3].address)
                  const raffleState = await raffle.getRaffleState()
                  const endingTimeStamp = await raffle.getLatestTimeStamp()
                  const numPlayers = await raffle.getNumberOfPlayers()
                  const winnerEndingBalance = await accounts[1].getBalance()
                  assert.equal(numPlayers.toString(), "0")
                  assert.equal(raffleState.toString(), "0")
                  assert(endingTimeStamp > startingTimeStamp)
                  // assert.equal(winnerEndingBalance.toString(), winnerStarttingBalance.add(raffleEnteranceFee.mul(additionalEntrants).add(raffleEnteranceFee).toString()))
                  assert.equal(
                    winnerEndingBalance.toString(),
                    winnerStarttingBalance
                      .add(
                        raffleEnteranceFee
                          .mul(additionalEntrants)
                          .add(raffleEnteranceFee)
                      )
                      .toString()
                  )
                } catch (e) {
                  reject(e)
                }
                resolve()
              })

              const tx = await raffle.performUpkeep([])
              const txReceipt = await tx.wait(1)
              const winnerStarttingBalance = await accounts[1].getBalance()
              await vRFCoordinatorV2Mock.fulfillRandomWords(
                txReceipt.events![1].args!.requestId,
                raffle.address
              )
            })
          })
        })
      })
    })
