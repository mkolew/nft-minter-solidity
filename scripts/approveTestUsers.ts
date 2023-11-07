import dotenv from 'dotenv';
import { ethers } from 'hardhat';

dotenv.config({ silent: (process.env.ENVIRONMENT as string) === 'prod' } as any);

/**
 * Script to create test users to the hardhat network
 */
async function main() {
  const signers = await ethers.getSigners();
  const nftMinterFactory = await ethers.getContractFactory('NFTMinter');
  const nftMinterContract = nftMinterFactory.attach(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string,
  );

  for (const signer of signers) {
    await nftMinterContract.connect(signers[0]).approveUser(await signer.getAddress());
  }

  console.log('users approved');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
