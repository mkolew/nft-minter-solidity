import dotenv from 'dotenv';
import { ethers } from 'hardhat';
import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import axios, { AxiosResponse } from 'axios';
import { Drawing } from '../src/types';

dotenv.config({ silent: (process.env.ENVIRONMENT as string) === 'prod' } as any);

function generateTestImage(j: number, i: number): string {
  const canvas = createCanvas(600, 600);
  const ctx = canvas.getContext('2d');
  const bgColor = getRandomColor();
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x = Math.floor(Math.random() * canvas.width);
  const y = Math.floor(Math.random() * canvas.height);

  ctx.fillStyle = getRandomColorDiffThanBg(bgColor);
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fill();

  const buffer = canvas.toBuffer('image/png');
  const imagePath = `./public/test-drawings/test drawing ${j}_1_${i}.png`;
  writeFileSync(imagePath, buffer);
  return imagePath;
}

function getRandomColorDiffThanBg(bgColor: string): string {
  const color = getRandomColor();
  if (color === bgColor) {
    return getRandomColorDiffThanBg(bgColor);
  }
  return color;
}

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;
}

/**
 * Script to create test users to the hardhat network
 */
async function main() {
  const signers = await ethers.getSigners();
  const nftMinterFactory = await ethers.getContractFactory('NFTMinter');
  const nftMinterContract = nftMinterFactory.attach(
    process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as string,
  );

  await nftMinterContract.connect(signers[0]).enableMinting(true);
  console.log('minting enabled');

  for (let i = 0; i < signers.length; i++) {
    for (let j = 1; j <= 6; j++) {
      const imagePath = generateTestImage(j, i);

      const response: AxiosResponse = await axios.post(`http://localhost:5001/api/upload-drawing`, {
        status: 1,
        path: imagePath.replace('./public', ''),
        title: `test drawing ${j} ${i}`,
        owner: 'test',
      } as Drawing);
      await nftMinterContract.connect(signers[i]).mint([response.data?.metaUri], {
        value: ethers.utils.parseEther('0.6'),
      });
      console.log(`test drawing ${j} ${i} minted`);
    }
  }

  console.log('test tokens minted');

  await nftMinterContract.connect(signers[0]).enableMinting(false);
  console.log('minting disabled');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
