  
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import hre from "hardhat";
import { AlEthNFT, AlEthNFT__factory, MerkleNFTDrop } from "../typechain";
import TimeTraveler from "../utils/TimeTraveler";

describe("AlEthNFT", function () {
    let account: SignerWithAddress;
    let account2: SignerWithAddress;
    let alEthNFT: AlEthNFT;
    let timeTraveler = new TimeTraveler(hre.network.provider);

    before(async() => {
        [account, account2] = await hre.ethers.getSigners();
        alEthNFT = await new AlEthNFT__factory(account).deploy("NFT", "NFT", "http://kek.lol/");
        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    })

    it("Minting should work", async() => {
        await alEthNFT.mint(0, 1337, account.address);
        const owner = await alEthNFT.ownerOf(0);
        const tokenData = await alEthNFT.tokenData(0);
        const tokenURI = await alEthNFT.tokenURI(0);

        expect(tokenURI).to.eq("http://kek.lol/0");
        expect(owner).to.eq(account.address);
        expect(tokenData).to.eq(1337);
    });

    it("Minting an NFT with the same tokenId should fail", async() => {
        await alEthNFT.mint(0, 1337, account.address);
        await expect(alEthNFT.mint(0, 1337, account.address)).to.be.revertedWith("ERC721: token already minted");
    });

    it("Minting by a non whitelisted address should fail", async() => {
        await expect(alEthNFT.connect(account2).mint(0, 1337, account.address)).to.be.revertedWith("AlEthNFT.onlyMinter: msg.sender not minter");
    });

});