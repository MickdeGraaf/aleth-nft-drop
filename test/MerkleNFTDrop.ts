  
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import hre from "hardhat";
import { createClaimTree, NFTEntry } from "../utils/index";
import patrons from "../patrons.json";
import { AlEthNFT, AlEthNFT__factory, MerkleNFTDrop, MerkleNFTDrop__factory } from "../typechain";
import TimeTraveler from "../utils/TimeTraveler";

describe("AlEthNFT", function () {
    let account: SignerWithAddress;
    let account2: SignerWithAddress;
    const patronsWithId: NFTEntry[] = [];
    let alEthNFT: AlEthNFT;
    let timeTraveler = new TimeTraveler(hre.network.provider);
    
    let merkleNFTDrop: MerkleNFTDrop;
    let i = 0;
    for (const address in patrons) {
        if (Object.prototype.hasOwnProperty.call(patrons, address)) {
            patronsWithId.push({
                receiver: address,
                // @ts-ignore
                tokenData: BigNumber.from(patrons[address].toString()),
                tokenId: i
            });
            i++;
        }
    }
    const NFTTree = createClaimTree(patronsWithId);
    const root = NFTTree.merkleTree.getRoot();

    before(async() => {
        [account, account2] = await hre.ethers.getSigners();
        alEthNFT = await new AlEthNFT__factory(account).deploy("NFT", "NFT", "http://kek.lol/");
        merkleNFTDrop = await new MerkleNFTDrop__factory(account).deploy(alEthNFT.address, root);
        const MINTER_ROLE = await alEthNFT.MINTER_ROLE();
        await alEthNFT.grantRole(MINTER_ROLE, merkleNFTDrop.address);
        await timeTraveler.snapshot();
    });

    beforeEach(async() => {
        await timeTraveler.revertSnapshot();
    })

    it("Claiming an NFT should work", async() => {
        const entry = NFTTree.leafs[0];
        const proof = NFTTree.merkleTree.getProof(entry.leaf);

        await merkleNFTDrop.claim(entry.tokenId, entry.tokenData, entry.receiver, proof);

        const owner = await alEthNFT.ownerOf(entry.tokenId);
        const tokenData = await alEthNFT.tokenData(entry.tokenId);
        
        expect(owner.toLowerCase()).to.eq(entry.receiver.toLowerCase());
        expect(tokenData).to.eq(entry.tokenData);
    });

    it("Claiming an NFT twice should fail", async() => {
        const entry = NFTTree.leafs[0];
        const proof = NFTTree.merkleTree.getProof(entry.leaf);

        await merkleNFTDrop.claim(entry.tokenId, entry.tokenData, entry.receiver, proof);
        await expect(merkleNFTDrop.claim(entry.tokenId, entry.tokenData, entry.receiver, proof)).to.be.revertedWith("ERC721: token already minted");
    });

    it("Claiming with an invalid proof should fail", async() => {
        const entry = NFTTree.leafs[0];
        const proof = NFTTree.merkleTree.getProof(entry.leaf);

        await expect(merkleNFTDrop.claim(entry.tokenId + 1, entry.tokenData, entry.receiver, proof)).to.be.revertedWith("MerkleNFTDrop.claim: Proof invalid");
    })

});