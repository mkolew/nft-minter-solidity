import { HardhatUserConfig } from 'hardhat/config';
import 'hardhat-gas-reporter';
import 'hardhat-contract-sizer';
import '@nomiclabs/hardhat-waffle';
import dotenv from 'dotenv';

dotenv.config({ silent: (process.env.ENVIRONMENT as string) === 'prod' } as any);

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mumbai: {
      url: `https://polygon-mumbai.infura.io/v3/${process.env.POLYGON_PROJECT_ID}`,
      accounts: [process.env.WALLET as string],
      chainId: 80001,
    },
    main_net: {
      url: `https://polygon-mainnet.infura.io/v3/${process.env.POLYGON_PROJECT_ID}`,
      accounts: [process.env.WALLET as string],
      chainId: 137,
    },
  },
  solidity: {
    version: '0.8.17',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
};

export default config;
