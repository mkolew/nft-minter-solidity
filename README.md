NFT Minter with a User Storage.

## Install dependencies
```bash
npm i
```

## Re-install node_modules
```bash
npm run clean-install
```

## Hardhat Project
Compile contract
```bash
npm run compile-contract
```

Test contract
```bash
npm run test-contract
```

Run hardhat
```bash
npx hardhat node
```

Deploy contract
```bash
npm run deploy-contract localhost
npm run deploy-contract mumbai
npm run deploy-contract main_net
```

Check contract sizes
```bash
npm run size-contract
npm run hardhat size-contracts
```

Create test users
```bash
npm run create-test-users localhost
npm run create-test-users mumbai
```

Approve test users
```bash
npm run approve-test-users localhost
npm run approve-test-users mumbai
```

Mint test tokens
```bash
npm run mint-test-tokens localhost
npm run mint-test-tokens mumbai
```

Mint test tokens
```bash
Set SCRIPT_TESTING=true in .env
Create folder with name 'test-drawings' in the 'public' folder
npm run mint-test-tokens localhost
npm run mint-test-tokens mumbai
```

Other useful commands
```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
```
