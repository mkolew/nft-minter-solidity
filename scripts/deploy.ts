import { ethers } from 'hardhat';

/**
 * Deploy contract script
 */
async function main() {
  const NFTMinter = await ethers.getContractFactory('NFTMinter');
  const nftMinter = await NFTMinter.deploy();
  await nftMinter.deployed();
  console.log('nftMinter deployed to:', nftMinter.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
