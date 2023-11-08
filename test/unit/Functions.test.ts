import { assert, expect } from "chai"
import { network, deployments, ethers } from "hardhat"
import { Functions } from "../../typechain-types/"
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers"

!(network.name == "hardhat")
    ? describe.skip : describe("Functions Unit Tests", function () {
        let accounts: HardhatEthersSigner[], deployer: HardhatEthersSigner, user: HardhatEthersSigner
        let functionsContract: Functions

        beforeEach(async function () {
            accounts = await ethers.getSigners()
            deployer = accounts[0]
            user = accounts[1]
            await deployments.fixture(["all"])

            functionsContract = await ethers.getContract("Functions")
        })

        describe("constructor", function () {
            it("should have the correct owner", async function () {
                expect(await functionsContract.getOwner()).to.equal(deployer.address)
            })
        })
    })
