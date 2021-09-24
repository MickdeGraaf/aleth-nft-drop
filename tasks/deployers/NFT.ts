import { task } from "hardhat/config";
import { TaskArguments } from "hardhat/types";
import { BigNumber } from "ethers";
import sleep from "../../utils/sleep";

import { AlEthNFT__factory, MerkleNFTDrop__factory } from "../../typechain"
import { createClaimTree, NFTEntry } from "../../utils";


task("deploy-nft")
    .addParam("name", "NFT name")
    .addParam("symbol", "NFT symbol")
    .addParam("baseTokenUri", "NFT base URI for metadata")
    .addParam("gov", "address governing the NFT contract")
    .addFlag("verify")
    .setAction(async(taskArgs, { ethers, run }) => {
        const signers = await ethers.getSigners();

        if(taskArgs.baseTokenUri.substr(taskArgs.baseTokenUri.length - 1) != "/") {
            throw new Error("Invalid baseTokenURI");
        }

        const root = await run("calc-root");

        console.log("Deploying NFT");
        const alEthNFT = await new AlEthNFT__factory(signers[0]).deploy(taskArgs.name, taskArgs.symbol, taskArgs.baseTokenUri);
        console.log(`NFT deployed at ${alEthNFT.address}`);
        if(taskArgs.verify) {
            console.log("verifying on Etherscan, might take some time");
            await sleep(60000);
            await run("verify:verify", {
                address: alEthNFT.address,
                constructorArguments: [
                    taskArgs.name,
                    taskArgs.symbol,
                    taskArgs.baseTokenUri
                ]
            })
        }

        console.log("deploying merkle drop");
        const merkleNFTDrop = await new MerkleNFTDrop__factory(signers[0]).deploy(alEthNFT.address, root);
        console.log(`Merkle drop deployed at ${merkleNFTDrop.address}`);
        if(taskArgs.verify){
            console.log("verifying on Etherscan, might take some time");
            await sleep(60000);
            await run("verify:verify", {
                address: merkleNFTDrop.address,
                constructorArguments: [
                    alEthNFT.address,
                    root
                ]
            })
        }

        console.log("Setting permissions");

        const MINTER_ROLE = await alEthNFT.MINTER_ROLE();
        const DEFAULT_ADMIN_ROLE = await alEthNFT.DEFAULT_ADMIN_ROLE();
        await (await alEthNFT.grantRole(MINTER_ROLE, merkleNFTDrop.address)).wait(1);
        await (await alEthNFT.grantRole(DEFAULT_ADMIN_ROLE, taskArgs.gov)).wait(1);

        await (await alEthNFT.renounceRole(MINTER_ROLE, signers[0].address)).wait(1);
        await (await alEthNFT.renounceRole(DEFAULT_ADMIN_ROLE, signers[0].address)).wait(1);

        console.log("Deployed contracts:");
        console.table({
            alEthNFT: alEthNFT.address,
            merkleNFTDrop: merkleNFTDrop.address
        });
});

task("calc-root", async() => {
    const patrons = require("../../patrons.json");
    const patronsWithId: NFTEntry[] = [];

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

    return root;
});