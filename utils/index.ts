import { BigNumber, ethers } from "ethers"
import { MerkleTree } from "./MerkleTree";

export interface NFTEntry {
    tokenId: number,
    tokenData: BigNumber
    receiver: string,
}

export interface NFTEntryWithLeaf extends NFTEntry {
  leaf: string
}

const hashEntry = (entry: NFTEntry) => {
  return ethers.utils.solidityKeccak256(
    ["uint256", "uint256", "address"],
    [
     entry.tokenId,
     entry.tokenData,
     entry.receiver
    ]
  );
}

export const createClaimTree = (entries: NFTEntry[]) => {
  const entriesWithLeafs = entries.map((item) => {
    const entryWithLeaf: NFTEntryWithLeaf = {
      ...item,
      leaf: hashEntry(item)
    }

    return entryWithLeaf;
  })

  return {
    merkleTree: new MerkleTree(entriesWithLeafs.map((item) => item.leaf)),
    leafs: entriesWithLeafs
  }
}