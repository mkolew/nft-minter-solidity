import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { Common } from '../src/utils/Common';

dotenv.config({ silent: (process.env.ENVIRONMENT as string) === 'prod' } as any);

/**
 * Script to create test users to the hardhat network
 */
async function main() {
  const A_DAY = 24 * 60 * 60;
  const signers = await ethers.getSigners();
  const nftMinterFactory = await ethers.getContractFactory('NFTMinter');
  const nftMinterContract = nftMinterFactory.attach(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string,
  );

  await nftMinterContract.connect(signers[0]).enableSignUp(true);
  console.log('sign up enabled');

  for (let i = 1; i <= signers.length - 1; i++) {
    const random = Math.ceil(Math.random() * 12);
    const timestamp = Common.toUnixTimestamp(new Date().getTime()) - A_DAY * random;
    await nftMinterContract
      .connect(signers[i])
      .register(ethers.utils.formatBytes32String(`user-${i}`), random, timestamp);
  }

  console.log('users created');

  await nftMinterContract.connect(signers[0]).enableSignUp(false);
  console.log('sign up disabled');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
