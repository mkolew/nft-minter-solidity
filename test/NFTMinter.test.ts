import { ethers } from 'hardhat';
import { describe, it, before } from 'mocha';
import { expect } from 'chai';
import { Contract } from '@ethersproject/contracts';
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { Token, User } from '../src/types';
import { Solidity } from '../src/utils/Solidity';
import { Common } from '../src/utils/Common';

describe('NFTMinter and UserStorage unit tests', function () {
  const A_DAY = 24 * 60 * 60;
  let timestampNow: number;
  let nftMinterContract: Contract;
  let nftMinterNoSupplyMockContract: Contract;
  let nftMinterNoSupplyPerUserMockContract: Contract;
  let nftMinterMintingDisabledMockContract: Contract;
  let owner: SignerWithAddress;
  let secondSigner: SignerWithAddress; // validator
  let thirdSigner: SignerWithAddress; // approved user
  let forthSigner: SignerWithAddress; // not approved user
  let fifthSigner: SignerWithAddress; // problem with registration
  let contractAddress: string;
  let signers: SignerWithAddress[];
  let shortUsername: string = ethers.utils.formatBytes32String('admn');
  let ownerUsername: string = ethers.utils.formatBytes32String('admin');
  let ownerUpdatedUsername: string = ethers.utils.formatBytes32String('admin-updated');
  let secondSignerUsername: string = ethers.utils.formatBytes32String('second');
  let secondSignerUpdatedUsername: string = ethers.utils.formatBytes32String('second-updated');
  let thirdSignerUsername: string = ethers.utils.formatBytes32String('third');
  let thirdSignerUpdatedUsername: string = ethers.utils.formatBytes32String('third-updated');
  let forthSignerUsername: string = ethers.utils.formatBytes32String('forth');
  let forthSignerUpdatedUsername: string = ethers.utils.formatBytes32String('forth-updated');
  let testSignerUsername: string = ethers.utils.formatBytes32String('test-signer');

  before(async function () {
    const block = await ethers.provider.getBlock('latest');
    timestampNow = block.timestamp;

    const nftMinterContractFactory = await ethers.getContractFactory('NFTMinter');
    const nftMinterNoSupplyMockContractFactory = await ethers.getContractFactory(
      'NFTMinterNoSupplyMock',
    );
    const nftMinterNoSupplyPerUserMockContractFactory = await ethers.getContractFactory(
      'NFTMinterNoSupplyPerUserMock',
    );
    const nftMinterMintingDisabledMockContractFactory = await ethers.getContractFactory(
      'NFTMinterMintingDisabled',
    );
    signers = await ethers.getSigners();
    [owner, secondSigner, thirdSigner, forthSigner, fifthSigner] = signers;
    nftMinterContract = await nftMinterContractFactory.connect(owner).deploy();
    nftMinterNoSupplyMockContract = await nftMinterNoSupplyMockContractFactory
      .connect(owner)
      .deploy();
    nftMinterNoSupplyPerUserMockContract = await nftMinterNoSupplyPerUserMockContractFactory
      .connect(owner)
      .deploy();
    nftMinterMintingDisabledMockContract = await nftMinterMintingDisabledMockContractFactory
      .connect(owner)
      .deploy();
    contractAddress = nftMinterContract.address;

    // enable the sign-up for testing purposes
    await nftMinterContract.connect(owner).enableSignUp(true);
    await nftMinterNoSupplyMockContract.connect(owner).enableSignUp(true);
    await nftMinterNoSupplyPerUserMockContract.connect(owner).enableSignUp(true);
    await nftMinterMintingDisabledMockContract.connect(owner).enableSignUp(true);

    // enable mint for testing purposes
    await nftMinterContract.connect(owner).enableMinting(true);
    await nftMinterNoSupplyMockContract.connect(owner).enableMinting(true);
    await nftMinterNoSupplyPerUserMockContract.connect(owner).enableMinting(true);
    await nftMinterMintingDisabledMockContract.connect(owner).enableMinting(true);

    // Add the second signer to the users in the mocked contracts
    await nftMinterNoSupplyMockContract.connect(secondSigner).signUp(secondSignerUsername, 2);
    await nftMinterNoSupplyMockContract.connect(owner).approveUser(await secondSigner.getAddress());
    await nftMinterNoSupplyPerUserMockContract
      .connect(secondSigner)
      .signUp(secondSignerUsername, 2);
    await nftMinterNoSupplyPerUserMockContract
      .connect(owner)
      .approveUser(await secondSigner.getAddress());
  });

  // ============ START ============
  it('should check if owner is the only user in the beginning', async function () {
    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(owner).getUser(),
    );
    const isUserNameExisting: string = await nftMinterContract
      .connect(owner)
      .isUserNameExisting(ownerUsername);
    const expectedUser: User = {
      created: true,
      userIndex: 1,
      dateHash: user.dateHash,
      dateIndex: 1,
      userName: 'admin',
      avatarId: 1,
      userAddress: await owner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(1);
    expect(users[0]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
    expect(isUserNameExisting).to.be.true;
  });

  // ============ signUp() ============
  it('should be able to sign up as not existing users', async function () {
    await expect(nftMinterContract.connect(secondSigner).signUp(secondSignerUsername, 2))
      .to.emit(nftMinterContract, 'SignUpCompleted')
      .withArgs(secondSignerUsername);

    await expect(nftMinterContract.connect(thirdSigner).signUp(thirdSignerUsername, 3))
      .to.emit(nftMinterContract, 'SignUpCompleted')
      .withArgs(thirdSignerUsername);

    await expect(nftMinterContract.connect(forthSigner).signUp(forthSignerUsername, 2))
      .to.emit(nftMinterContract, 'SignUpCompleted')
      .withArgs(forthSignerUsername);

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user1: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUser(),
    );
    const user2: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(thirdSigner).getUser(),
    );
    const user3: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(forthSigner).getUser(),
    );
    const isUserNameExisting1: string = await nftMinterContract
      .connect(secondSigner)
      .isUserNameExisting(secondSignerUsername);
    const isUserNameExisting2: string = await nftMinterContract
      .connect(thirdSigner)
      .isUserNameExisting(thirdSignerUsername);
    const isUserNameExisting3: string = await nftMinterContract
      .connect(forthSigner)
      .isUserNameExisting(forthSignerUsername);
    const secondSignerUser: User = {
      created: true,
      userIndex: 2,
      dateHash: users[1].dateHash,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users[1].dateJoined,
    };
    const thirdSignerUser: User = {
      created: true,
      userIndex: 3,
      dateHash: users[2].dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users[2].dateJoined,
    };
    const fourthSignerUser: User = {
      created: true,
      userIndex: 4,
      dateHash: users[3].dateHash,
      dateIndex: 4,
      userName: 'forth',
      avatarId: 2,
      userAddress: await forthSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users[3].dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[1]).to.be.deep.equal(secondSignerUser);
    expect(users[2]).to.be.deep.equal(thirdSignerUser);
    expect(users[3]).to.be.deep.equal(fourthSignerUser);
    expect(user1).to.be.deep.equal(secondSignerUser);
    expect(user2).to.be.deep.equal(thirdSignerUser);
    expect(user3).to.be.deep.equal(fourthSignerUser);
    expect(isUserNameExisting1).to.be.true;
    expect(isUserNameExisting2).to.be.true;
    expect(isUserNameExisting3).to.be.true;
  });

  it('should not be able to sign up if username contains less than 5 characters', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).signUp(shortUsername, 1),
    ).to.be.revertedWith('Username must contain at least 5 characters.');
  });

  it('should not be able to sign up if username already exists', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).signUp(secondSignerUsername, 2),
    ).to.be.revertedWith('Username must be unique.');
  });

  it('should not be able to sign up if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).signUp(testSignerUsername, 1)).to.be
      .reverted; // void signer
  });

  it('should not be able to sign up if signer username is not bytes32', async function () {
    await expect(nftMinterContract.connect(fifthSigner).signUp('test-signer', 1)).to.be.reverted; // Invalid arrayify value
  });

  // ============ addUserAsValidator() ============
  it('should be able to add user as validator if signer is owner', async function () {
    await nftMinterContract.connect(owner).addUserAsValidator(await secondSigner.getAddress());

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 2,
      dateHash: user.dateHash,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[1]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should not be able to add user as validator if signer is validator', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).addUserAsValidator(await thirdSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to add user as validator if signer is approved user', async function () {
    await expect(
      nftMinterContract.connect(thirdSigner).addUserAsValidator(await thirdSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to add user as validator if signer is not approved user', async function () {
    await expect(
      nftMinterContract.connect(forthSigner).addUserAsValidator(await thirdSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to add user as validator if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).addUserAsValidator(await thirdSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to add user as validator if contract is calling', async function () {
    await expect(
      nftMinterContract.connect(contractAddress).addUserAsValidator(await thirdSigner.getAddress()),
    ).to.be.reverted; // void signer
  });

  // ============ approveUser() ============
  it('should be able to approve the user if signer is owner', async function () {
    await nftMinterContract.connect(owner).approveUser(await secondSigner.getAddress());

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 2,
      dateHash: user.dateHash,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[1]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should be able to approve the user if signer is validator', async function () {
    await nftMinterContract.connect(secondSigner).approveUser(await thirdSigner.getAddress());

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(thirdSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 3,
      dateHash: user.dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[2]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should not be able to approve the user if signer is approved user', async function () {
    await expect(
      nftMinterContract.connect(thirdSigner).approveUser(await forthSigner.getAddress()),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to approve the user if signer is not approved user', async function () {
    await expect(
      nftMinterContract.connect(forthSigner).approveUser(await forthSigner.getAddress()),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to approve the user if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).approveUser(await forthSigner.getAddress()),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to approve the user if contract is calling', async function () {
    await expect(
      nftMinterContract.connect(contractAddress).approveUser(await forthSigner.getAddress()),
    ).to.be.reverted; // void signer
  });

  // ============ getUsers() ============
  it('should be able to get users if signer is owner', async function () {
    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const ownerUser: User = {
      created: true,
      userIndex: 1,
      dateHash: users[0].dateHash,
      dateIndex: 1,
      userName: 'admin',
      avatarId: 1,
      userAddress: await owner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users[0].dateJoined,
    };
    const secondSignerUser: User = {
      created: true,
      userIndex: 2,
      dateHash: users[1].dateHash,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users[1].dateJoined,
    };
    const thirdSignerUser: User = {
      created: true,
      userIndex: 3,
      dateHash: users[2].dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users[2].dateJoined,
    };
    const fourthSignerUser: User = {
      created: true,
      userIndex: 4,
      dateHash: users[3].dateHash,
      dateIndex: 4,
      userName: 'forth',
      avatarId: 2,
      userAddress: await forthSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users[3].dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[0]).to.be.deep.equal(ownerUser);
    expect(users[1]).to.be.deep.equal(secondSignerUser);
    expect(users[2]).to.be.deep.equal(thirdSignerUser);
    expect(users[3]).to.be.deep.equal(fourthSignerUser);
  });

  it('should not be able to get users if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).getUsers(1, 10)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get users if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).getUsers(1, 10)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get users if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).getUsers(1, 10)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get users if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).getUsers(1, 10)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get users if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).getUsers(1, 10)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  // ============ getUsersByDate() ============
  it('should be able to get users by date if signer is owner', async function () {
    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract
        .connect(owner)
        .getUsersByDate(Solidity.utToDateHash(timestampNow), 1, 10),
    );
    const ownerUser: User = {
      created: true,
      userIndex: 1,
      dateHash: users[0].dateHash,
      dateIndex: 1,
      userName: 'admin',
      avatarId: 1,
      userAddress: await owner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users[0].dateJoined,
    };
    const secondSignerUser: User = {
      created: true,
      userIndex: 2,
      dateHash: users[1].dateHash,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users[1].dateJoined,
    };
    const thirdSignerUser: User = {
      created: true,
      userIndex: 3,
      dateHash: users[2].dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users[2].dateJoined,
    };
    const fourthSignerUser: User = {
      created: true,
      userIndex: 4,
      dateHash: users[3].dateHash,
      dateIndex: 4,
      userName: 'forth',
      avatarId: 2,
      userAddress: await forthSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users[3].dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[0]).to.be.deep.equal(ownerUser);
    expect(users[1]).to.be.deep.equal(secondSignerUser);
    expect(users[2]).to.be.deep.equal(thirdSignerUser);
    expect(users[3]).to.be.deep.equal(fourthSignerUser);
  });

  it('should not be able to get users by date if signer is validator', async function () {
    await expect(
      nftMinterContract
        .connect(secondSigner)
        .getUsersByDate(Solidity.utToDateHash(timestampNow), 1, 10),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to get users by date if signer is approved user', async function () {
    await expect(
      nftMinterContract
        .connect(thirdSigner)
        .getUsersByDate(Solidity.utToDateHash(timestampNow), 1, 10),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to get users by date if signer is not approved user', async function () {
    await expect(
      nftMinterContract
        .connect(forthSigner)
        .getUsersByDate(Solidity.utToDateHash(timestampNow), 1, 10),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to get users by date if signer is not registered user', async function () {
    await expect(
      nftMinterContract
        .connect(fifthSigner)
        .getUsersByDate(Solidity.utToDateHash(timestampNow), 1, 10),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to get users by date if contract is calling', async function () {
    await expect(
      nftMinterContract
        .connect(secondSigner)
        .getUsersByDate(Solidity.utToDateHash(timestampNow), 1, 10),
    ).to.be.revertedWith('You are not an owner.');
  });

  // ============ getUsersCount() ============
  it('should be able to get users count as anybody', async function () {
    const userCount: number = Solidity.toNumber(
      await nftMinterContract.connect(contractAddress).getUsersCount(),
    );

    expect(userCount).to.be.equal(4);
  });

  // ============ getUsersByDateCount() ============
  it('should be able to get users count as anybody', async function () {
    const usersByDateCount: number = Solidity.toNumber(
      await nftMinterContract
        .connect(contractAddress)
        .getUsersByDateCount(Solidity.utToDateHash(timestampNow)),
    );

    expect(usersByDateCount).to.be.equal(4);
  });

  // ============ getDateHashes() ============
  it('should be able to get date hashes as anybody', async function () {
    const dateHashes: number[] = Solidity.toTimestamps(
      await nftMinterContract.connect(contractAddress).getDateHashes(),
    );

    expect(dateHashes).to.be.eql([Common.today().getTime()]);
  });

  // ============ enableSignUp() ============
  it('should be able to disable the sign up if signer is owner', async function () {
    await nftMinterContract.connect(owner).enableSignUp(false);
    const isSignUpEnabled: boolean = await nftMinterContract.connect(owner).isSignUpEnabled();

    expect(isSignUpEnabled).to.be.false;
  });

  it('should not be able to enable the signup if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).enableSignUp(true)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to enable the signup if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).enableSignUp(true)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to enable the signup if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).enableSignUp(true)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to enable the signup if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).enableSignUp(true)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to enable the signup if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).enableSignUp(true)).to.be.reverted; // void signer
  });

  it('should be able to enable the sign up if signer is owner', async function () {
    await nftMinterContract.connect(owner).enableSignUp(true);
    const isSignUpEnabled: boolean = await nftMinterContract.connect(owner).isSignUpEnabled();

    expect(isSignUpEnabled).to.be.true;
  });

  // ============ isSignUpEnabled() ============
  it('should be able to check if the sign up is enabled if contract is calling', async function () {
    const isSignUpEnabled: boolean = await nftMinterContract
      .connect(contractAddress)
      .isSignUpEnabled();

    expect(isSignUpEnabled).to.be.true;
  });

  // ============ getUser() ============
  it('should be able get user info if signer is owner', async function () {
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(owner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 1,
      dateHash: user.dateHash,
      dateIndex: 1,
      userName: 'admin',
      avatarId: 1,
      userAddress: await owner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should be able get user info if signer is validator', async function () {
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 2,
      dateHash: user.dateHash,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should be able get user info if signer is approved user', async function () {
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(thirdSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 3,
      dateHash: user.dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should be able get user info if signer is not approved user', async function () {
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(forthSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 4,
      dateHash: user.dateHash,
      dateIndex: 4,
      userName: 'forth',
      avatarId: 2,
      userAddress: await forthSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should not be able to get user info if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).getUser()).to.be.revertedWith(
      'You are still not registered.',
    );
  });

  it('should not be able to get user info if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).getUser()).to.be.revertedWith(
      'You are still not registered.',
    );
  });

  // ============ getUserByName() ============
  it('should be able to get user by name if signer is owner', async function () {
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(owner).getUserByName(thirdSignerUsername),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 3,
      dateHash: user.dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should be able to get user by name if signer is validator', async function () {
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUserByName(thirdSignerUsername),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 3,
      dateHash: user.dateHash,
      dateIndex: 3,
      userName: 'third',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should not be able to get user by name if signer is approved user', async function () {
    await expect(
      nftMinterContract.connect(thirdSigner).getUserByName(thirdSignerUsername),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to get user by name if signer is not approved user', async function () {
    await expect(
      nftMinterContract.connect(forthSigner).getUserByName(thirdSignerUsername),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to get user by name if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).getUserByName(thirdSignerUsername),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to get user by name if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).getUserByName(thirdSignerUsername)).to
      .be.reverted; // void signer
  });

  // ============ isOwner() ============
  it('should return true if signer is owner', async function () {
    const isOwner: boolean = await nftMinterContract.connect(owner).isOwner();

    expect(isOwner).to.be.true;
  });

  it('should return false if signer is not owner', async function () {
    const isOwner: boolean = await nftMinterContract.connect(secondSigner).isOwner();

    expect(isOwner).to.be.false;
  });

  it('should return false if contract is calling', async function () {
    const isOwner: boolean = await nftMinterContract.connect(contractAddress).isOwner();

    expect(isOwner).to.be.false;
  });

  // ============ isUserNameExisting() ============
  it('should be able to check if user name exists if contract is calling', async function () {
    const isUserNameExisting: boolean = await nftMinterContract
      .connect(contractAddress)
      .isUserNameExisting(ownerUsername);

    expect(isUserNameExisting).to.be.true;
  });

  // ============ getMaxSupply() ============
  it('should be able to get the max token supply if contract is calling', async function () {
    const maxSupply: string = await nftMinterContract.connect(contractAddress).getMaxSupply();

    expect(maxSupply).to.be.equal(10000);
  });

  // ============ getMaxSupplyPerUser() ============
  it('should be able to get the max token supply per user if contract is calling', async function () {
    const maxSupplyPerUser: string = await nftMinterContract
      .connect(contractAddress)
      .getMaxSupplyPerUser();

    expect(maxSupplyPerUser).to.be.equal(100);
  });

  // ============ getCost() ============
  it('should be able to get the costs for minting if contract is calling', async function () {
    const cost: number = await nftMinterContract.connect(contractAddress).getCost();

    expect(Solidity.toEth(cost)).to.be.equal(0.5);
  });

  // ============ updateMaxSupply() ============
  it('should be able to update the max token supply if signer is owner', async function () {
    await nftMinterContract.connect(owner).updateMaxSupply(1000000);
    const maxSupply: string = await nftMinterContract.connect(owner).getMaxSupply();

    expect(maxSupply).to.be.equal(1000000);
  });

  it('should not be able to update the max supply if signer is validator', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).updateMaxSupply(1000000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply if signer is approved user', async function () {
    await expect(
      nftMinterContract.connect(thirdSigner).updateMaxSupply(1000000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply if signer is not approved user', async function () {
    await expect(
      nftMinterContract.connect(forthSigner).updateMaxSupply(1000000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).updateMaxSupply(1000000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).updateMaxSupply(1000000)).to.be
      .reverted; // void signer
  });

  // ============ updateMaxSupplyPerUser() ============
  it('should be able to update the max supply per user if signer is owner', async function () {
    await nftMinterContract.connect(owner).updateMaxSupplyPerUser(1000);
    const maxSupplyPerUser: string = await nftMinterContract.connect(owner).getMaxSupplyPerUser();

    expect(maxSupplyPerUser).to.be.equal(1000);
  });

  it('should not be able to update the max supply per user if signer is validator', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).updateMaxSupplyPerUser(1000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply per user if signer is approved user', async function () {
    await expect(
      nftMinterContract.connect(thirdSigner).updateMaxSupplyPerUser(1000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply per user if signer is not approved user', async function () {
    await expect(
      nftMinterContract.connect(forthSigner).updateMaxSupplyPerUser(1000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply per user if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).updateMaxSupplyPerUser(1000),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to update the max supply per user if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).updateMaxSupplyPerUser(1000)).to.be
      .reverted; // void signer
  });

  // ============ updateCost() ============
  it('should be able to update the costs for minting if signer is owner', async function () {
    await nftMinterContract.connect(owner).updateCost(ethers.utils.parseEther('1.1'));
    const cost: number = await nftMinterContract.connect(owner).getCost();

    expect(Solidity.toEth(cost)).to.be.equal(1.1);
  });

  it('should not be able to update the costs for minting if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).updateCost(2)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to update the costs for minting if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).updateCost(2)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to update the costs for minting if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).updateCost(2)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to update the costs for minting if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).updateCost(2)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to update the costs for minting if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).updateCost(2)).to.be.reverted; // void signer
  });

  // ============ mint() ============
  it('should be able to mint multiple tokens as owner without paying anything', async function () {
    const metadata_1 = 'https://opensea-creatures-api.herokuapp.com/api/creature/1';
    const metadata_2 = 'https://opensea-creatures-api.herokuapp.com/api/creature/2';
    const metadata_3 = 'https://opensea-creatures-api.herokuapp.com/api/creature/3';

    await expect(nftMinterContract.connect(owner).mint([metadata_1, metadata_2, metadata_3]))
      .to.emit(nftMinterContract, 'TokensMinted')
      .withArgs([metadata_1, metadata_2, metadata_3]);

    const userTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUserTokens(await owner.getAddress()),
    );
    const isTokenExisting1: boolean = await nftMinterContract
      .connect(owner)
      .isTokenExisting(metadata_1);
    const isTokenExisting2: boolean = await nftMinterContract
      .connect(owner)
      .isTokenExisting(metadata_2);
    const isTokenExisting3: boolean = await nftMinterContract
      .connect(owner)
      .isTokenExisting(metadata_3);
    const isTokenBurned1: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned(metadata_1);
    const isTokenBurned2: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned(metadata_2);
    const isTokenBurned3: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned(metadata_3);
    const expectedToken1: Token = {
      created: true,
      tokenId: 1,
      tokenURI: metadata_1,
      owner: await owner.getAddress(),
    };
    const expectedToken2: Token = {
      created: true,
      tokenId: 2,
      tokenURI: metadata_2,
      owner: await owner.getAddress(),
    };
    const expectedToken3: Token = {
      created: true,
      tokenId: 3,
      tokenURI: metadata_3,
      owner: await owner.getAddress(),
    };

    expect(userTokens[0]).to.be.deep.equal(expectedToken1);
    expect(userTokens[1]).to.be.deep.equal(expectedToken2);
    expect(userTokens[2]).to.be.deep.equal(expectedToken3);
    expect(isTokenExisting1).to.be.true;
    expect(isTokenExisting2).to.be.true;
    expect(isTokenExisting3).to.be.true;
    expect(isTokenBurned1).to.be.false;
    expect(isTokenBurned2).to.be.false;
    expect(isTokenBurned3).to.be.false;
  });

  it('should be able to mint tokens as owner even if the max supply per user is exceeded', async function () {
    const metadata_1 = 'https://opensea-creatures-api.herokuapp.com/api/creature/1';
    const metadata_2 = 'https://opensea-creatures-api.herokuapp.com/api/creature/2';

    const transaction = await nftMinterNoSupplyPerUserMockContract
      .connect(owner)
      .mint([metadata_1, metadata_2]);

    const tx = await transaction.wait();
    const event = tx.events[0];
    const to = event.args[1];

    const userTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyPerUserMockContract
        .connect(owner)
        .getUserTokens(await owner.getAddress()),
    );
    const isTokenExisting1: boolean = await nftMinterNoSupplyPerUserMockContract
      .connect(owner)
      .isTokenExisting(metadata_1);
    const isTokenExisting2: boolean = await nftMinterNoSupplyPerUserMockContract
      .connect(owner)
      .isTokenExisting(metadata_2);
    const isTokenBurned1: boolean = await nftMinterNoSupplyPerUserMockContract
      .connect(owner)
      .isTokenBurned(metadata_1);
    const isTokenBurned2: boolean = await nftMinterNoSupplyPerUserMockContract
      .connect(owner)
      .isTokenBurned(metadata_2);
    const expectedToken1: Token = {
      created: true,
      tokenId: 1,
      tokenURI: metadata_1,
      owner: await owner.getAddress(),
    };
    const expectedToken2: Token = {
      created: true,
      tokenId: 2,
      tokenURI: metadata_2,
      owner: await owner.getAddress(),
    };

    expect(to).to.be.equal(await owner.getAddress());
    expect(userTokens[0]).to.be.deep.equal(expectedToken1);
    expect(userTokens[1]).to.be.deep.equal(expectedToken2);
    expect(isTokenExisting1).to.be.true;
    expect(isTokenExisting2).to.be.true;
    expect(isTokenBurned1).to.be.false;
    expect(isTokenBurned2).to.be.false;
  });

  it('should still be able to mint tokens as owner even if minting is disabled', async function () {
    const metadata_1 = 'https://opensea-creatures-api.herokuapp.com/api/creature/1';

    const transaction = await nftMinterMintingDisabledMockContract
      .connect(owner)
      .mint([metadata_1]);

    const tx = await transaction.wait();
    const event = tx.events[0];
    const to = event.args[1];

    const userTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterMintingDisabledMockContract
        .connect(owner)
        .getUserTokens(await owner.getAddress()),
    );
    const isTokenExisting: boolean = await nftMinterMintingDisabledMockContract
      .connect(owner)
      .isTokenExisting(metadata_1);
    const isTokenBurned: boolean = await nftMinterMintingDisabledMockContract
      .connect(owner)
      .isTokenBurned(metadata_1);
    const expectedToken: Token = {
      created: true,
      tokenId: 1,
      tokenURI: metadata_1,
      owner: await owner.getAddress(),
    };

    expect(to).to.be.equal(await owner.getAddress());
    expect(userTokens[0]).to.be.deep.equal(expectedToken);
    expect(isTokenExisting).to.be.true;
    expect(isTokenBurned).to.be.false;
  });

  it('should not be able to mint when the minting is disabled', async function () {
    await expect(
      nftMinterMintingDisabledMockContract
        .connect(secondSigner)
        .mint(['https://opensea-creatures-api.herokuapp.com/api/creature/6']),
    ).to.be.revertedWith('Minting is disabled at this moment.');
  });

  it('should not be able to mint tokens as owner if all tokens are minted', async function () {
    const metadata_1 = 'https://opensea-creatures-api.herokuapp.com/api/creature/1';
    const metadata_2 = 'https://opensea-creatures-api.herokuapp.com/api/creature/2';
    const metadata_3 = 'https://opensea-creatures-api.herokuapp.com/api/creature/3';

    await expect(
      nftMinterNoSupplyMockContract.connect(owner).mint([metadata_1, metadata_2, metadata_3]),
    ).to.be.revertedWith('All NFTs are minted.');
  });

  it('should be able to mint multiple tokens as approved user if paid enough', async function () {
    const metadata_4 = 'https://opensea-creatures-api.herokuapp.com/api/creature/4';
    const metadata_5 = 'https://opensea-creatures-api.herokuapp.com/api/creature/5';
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';

    const transaction = await nftMinterContract
      .connect(secondSigner)
      .mint([metadata_4, metadata_5, metadata_6], {
        value: ethers.utils.parseEther('6'),
      });

    const tx = await transaction.wait();
    const event = tx.events[0];
    const to = event.args[1];

    const userTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUserTokens(await secondSigner.getAddress()),
    );
    const isTokenExisting4: boolean = await nftMinterContract
      .connect(secondSigner)
      .isTokenExisting(metadata_4);
    const isTokenExisting5: boolean = await nftMinterContract
      .connect(secondSigner)
      .isTokenExisting(metadata_5);
    const isTokenExisting6: boolean = await nftMinterContract
      .connect(secondSigner)
      .isTokenExisting(metadata_6);
    const isTokenBurned4: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned(metadata_4);
    const isTokenBurned5: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned(metadata_5);
    const isTokenBurned6: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned(metadata_6);
    const expectedToken4: Token = {
      created: true,
      tokenId: 4,
      tokenURI: metadata_4,
      owner: await secondSigner.getAddress(),
    };
    const expectedToken5: Token = {
      created: true,
      tokenId: 5,
      tokenURI: metadata_5,
      owner: await secondSigner.getAddress(),
    };
    const expectedToken6: Token = {
      created: true,
      tokenId: 6,
      tokenURI: metadata_6,
      owner: await secondSigner.getAddress(),
    };

    expect(to).to.be.equal(await secondSigner.getAddress());
    expect(userTokens[0]).to.be.deep.equal(expectedToken4);
    expect(userTokens[1]).to.be.deep.equal(expectedToken5);
    expect(userTokens[2]).to.be.deep.equal(expectedToken6);
    expect(isTokenExisting4).to.be.true;
    expect(isTokenExisting5).to.be.true;
    expect(isTokenExisting6).to.be.true;
    expect(isTokenBurned4).to.be.false;
    expect(isTokenBurned5).to.be.false;
    expect(isTokenBurned6).to.be.false;
  });

  it('should not be able to mint as approved user if not paid enough', async function () {
    const metadata_4 = 'https://opensea-creatures-api.herokuapp.com/api/creature/4';
    const metadata_5 = 'https://opensea-creatures-api.herokuapp.com/api/creature/5';
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';

    await expect(
      nftMinterContract.connect(secondSigner).mint([metadata_4, metadata_5, metadata_6], {
        value: ethers.utils.parseEther('1'),
      }),
    ).to.be.revertedWith('You paid less than the minimum price per NFT.');
  });

  it('should not be able to mint as approved user if at least one of the tokens is existing', async function () {
    const metadata_4 = 'https://opensea-creatures-api.herokuapp.com/api/creature/4';
    const metadata_5 = 'https://opensea-creatures-api.herokuapp.com/api/creature/5';
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';

    await expect(
      nftMinterContract.connect(secondSigner).mint([metadata_4, metadata_5, metadata_6], {
        value: ethers.utils.parseEther('6'),
      }),
    ).to.be.revertedWith('One of the NFTs is existing. You can only mint unique NFTs.');
  });

  it('should not be able to mint tokens as approved user if the max supply per user is exceeded', async function () {
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';
    const metadata_7 = 'https://opensea-creatures-api.herokuapp.com/api/creature/7';

    await expect(
      nftMinterNoSupplyPerUserMockContract.connect(secondSigner).mint([metadata_6, metadata_7]),
    ).to.be.revertedWith('Maximum minted NFTs per user exceeded.');
  });

  it('should not be able to mint tokens as approved user if all tokens are minted', async function () {
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';
    const metadata_7 = 'https://opensea-creatures-api.herokuapp.com/api/creature/7';

    await expect(
      nftMinterNoSupplyMockContract.connect(secondSigner).mint([metadata_6, metadata_7]),
    ).to.be.revertedWith('All NFTs are minted.');
  });

  it('should not be able to mint tokens if signer is not approved user', async function () {
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';
    const metadata_7 = 'https://opensea-creatures-api.herokuapp.com/api/creature/7';

    await expect(
      nftMinterContract.connect(forthSigner).mint([metadata_6, metadata_7]),
    ).to.be.revertedWith('You are still not approved.');
  });

  it('should not be able to mint tokens if signer is not registered user', async function () {
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';
    const metadata_7 = 'https://opensea-creatures-api.herokuapp.com/api/creature/7';

    await expect(
      nftMinterContract.connect(fifthSigner).mint([metadata_6, metadata_7]),
    ).to.be.revertedWith('You are still not registered.');
  });

  it('should not be able to mint tokens if contract is calling', async function () {
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';
    const metadata_7 = 'https://opensea-creatures-api.herokuapp.com/api/creature/7';

    await expect(nftMinterContract.connect(contractAddress).mint([metadata_6, metadata_7])).to.be
      .reverted; // void signer
  });

  // ============ enableMint() ============
  it('should be able to disable the minting if signer is owner', async function () {
    await nftMinterContract.connect(owner).enableMinting(false);
    const mintingEnabled: boolean = await nftMinterContract.connect(owner).isMintingEnabled();

    expect(mintingEnabled).to.be.false;
  });

  it('should not be able to disable the minting if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).enableMinting(false)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to disable the minting if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).enableMinting(false)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to disable the minting if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).enableMinting(false)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to disable the minting if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).enableMinting(false)).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to disable the minting if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).enableMinting(false)).to.be.reverted; // void signer
  });

  // ============ isMintingEnabled() ============
  it('should be able to check if minting is enabled if contract is calling', async function () {
    const isMintingEnabled: number = await nftMinterContract
      .connect(contractAddress)
      .isMintingEnabled();

    expect(isMintingEnabled).to.be.false;
  });

  // ============ totalSupply() ============
  it('should be able to return the total supply if contract is calling', async function () {
    const totalSupply: number = await nftMinterContract.connect(contractAddress).totalSupply();

    expect(totalSupply).to.be.equal(6);
  });

  // ============ burn() ============
  it('should not be able to burn token if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).burn(4)).to.be.reverted; // void signer
  });

  it('should not be able to burn token which is not his', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).burn(1), // owners token
    ).to.be.revertedWith('ERC721: caller is not token owner or approved');
  });

  it('should be able to burn his token if signer is user', async function () {
    const metadata_4 = 'https://opensea-creatures-api.herokuapp.com/api/creature/4';

    await expect(nftMinterContract.connect(secondSigner).burn(4))
      .to.emit(nftMinterContract, 'TokenBurned')
      .withArgs(metadata_4);

    const userTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUserTokens(await secondSigner.getAddress()),
    );
    const burnedTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getBurnedTokens(),
    );
    const isTokenBurned: boolean = await nftMinterContract.connect(owner).isTokenBurned(metadata_4);
    const isTokenExisting: boolean = await nftMinterContract
      .connect(secondSigner)
      .isTokenExisting(metadata_4);
    const totalSupply: number = await nftMinterContract.connect(secondSigner).totalSupply();
    const burnedToken: Token = {
      created: true,
      tokenId: 4,
      tokenURI: metadata_4,
      owner: await secondSigner.getAddress(),
    };

    expect(userTokens.length).to.be.deep.equal(2); // one of 3 is removed
    expect(burnedTokens[0]).to.be.deep.equal(burnedToken);
    expect(isTokenExisting).to.be.false;
    expect(isTokenBurned).to.be.true;
    expect(totalSupply).to.be.equal(5); // total supply decrease
  });

  it('should be able to burn tokens of any user if signer is owner', async function () {
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';

    await nftMinterContract.connect(owner).burn(6);

    const userTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUserTokens(await secondSigner.getAddress()),
    );
    const burnedTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getBurnedTokens(),
    );
    const isTokenBurned: boolean = await nftMinterContract.connect(owner).isTokenBurned(metadata_6);
    const isTokenExisting: boolean = await nftMinterContract
      .connect(owner)
      .isTokenExisting(metadata_6);
    const totalSupply: number = await nftMinterContract.connect(owner).totalSupply();
    const burnedToken: Token = {
      created: true,
      tokenId: 6,
      tokenURI: metadata_6,
      owner: await secondSigner.getAddress(),
    };

    expect(userTokens.length).to.be.deep.equal(1); // one more removed
    expect(burnedTokens[1]).to.be.deep.equal(burnedToken);
    expect(isTokenExisting).to.be.false;
    expect(isTokenBurned).to.be.true;
    expect(totalSupply).to.be.equal(4); // total supply decrease
  });

  // ============ isTokenBurned() ============
  it('should be able to see if token is burned if signer is owner', async function () {
    const isTokenBurned: boolean = await nftMinterContract
      .connect(owner)
      .isTokenBurned('https://opensea-creatures-api.herokuapp.com/api/creature/4');

    expect(isTokenBurned).to.be.true;
  });

  it('should not be able to see if token is burned if signer is validator', async function () {
    await expect(
      nftMinterContract
        .connect(secondSigner)
        .isTokenBurned('https://opensea-creatures-api.herokuapp.com/api/creature/4'),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see if token is burned if signer is approved user', async function () {
    await expect(
      nftMinterContract
        .connect(thirdSigner)
        .isTokenBurned('https://opensea-creatures-api.herokuapp.com/api/creature/4'),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see if token is burned if signer is not approved user', async function () {
    await expect(
      nftMinterContract
        .connect(forthSigner)
        .isTokenBurned('https://opensea-creatures-api.herokuapp.com/api/creature/4'),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see if token is burned if signer is not registered user', async function () {
    await expect(
      nftMinterContract
        .connect(fifthSigner)
        .isTokenBurned('https://opensea-creatures-api.herokuapp.com/api/creature/4'),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see if token is burned if contract is calling', async function () {
    await expect(
      nftMinterContract
        .connect(contractAddress)
        .isTokenBurned('https://opensea-creatures-api.herokuapp.com/api/creature/4'),
    ).to.be.revertedWith('You are not an owner.');
  });

  // ============ getBurnedTokens() ============
  it('should be able to get the burned tokens if signer is owner', async function () {
    const metadata_4 = 'https://opensea-creatures-api.herokuapp.com/api/creature/4';
    const metadata_6 = 'https://opensea-creatures-api.herokuapp.com/api/creature/6';

    const burnedTokens: Token[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getBurnedTokens(),
    );

    const burnedToken4: Token = {
      created: true,
      tokenId: 4,
      tokenURI: metadata_4,
      owner: await secondSigner.getAddress(),
    };
    const burnedToken6: Token = {
      created: true,
      tokenId: 6,
      tokenURI: metadata_6,
      owner: await secondSigner.getAddress(),
    };

    expect(burnedTokens.length).to.be.equal(2);
    expect(burnedTokens[0]).to.be.deep.equal(burnedToken4);
    expect(burnedTokens[1]).to.be.deep.equal(burnedToken6);
  });

  it('should not be able to get the burned tokens if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).getBurnedTokens()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the burned tokens if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).getBurnedTokens()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the burned tokens if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).getBurnedTokens()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the burned tokens if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).getBurnedTokens()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the burned tokens if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).getBurnedTokens()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  // ============ isTokenExisting() ============
  it('should be able to see if token is existing if contract is calling', async function () {
    const isTokenExisting: boolean = await nftMinterContract
      .connect(contractAddress)
      .isTokenExisting('https://opensea-creatures-api.herokuapp.com/api/creature/5');

    expect(isTokenExisting).to.be.true;
  });

  // ============ tokenURI() ============
  it('should be able to return the tokenUri if contract is calling', async function () {
    const totalURI: string = await nftMinterContract.connect(contractAddress).tokenURI(2);

    expect(totalURI).to.be.equal('https://opensea-creatures-api.herokuapp.com/api/creature/2');
  });

  // ============ getUserTokens() ============
  it('should be able to see user tokens if signer is owner', async function () {
    const userTokens: Token[] = await nftMinterContract
      .connect(owner)
      .getUserTokens(await secondSigner.getAddress());

    expect(userTokens.length).to.be.equal(1);
  });

  it('should not be able to see user tokens if signer is validator', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).getUserTokens(await secondSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see user tokens if signer is approved user', async function () {
    await expect(
      nftMinterContract.connect(thirdSigner).getUserTokens(await secondSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see user tokens if signer is not approved user', async function () {
    await expect(
      nftMinterContract.connect(forthSigner).getUserTokens(await secondSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see user tokens if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).getUserTokens(await secondSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  it('should not be able to see user tokens if contract is calling', async function () {
    await expect(
      nftMinterContract.connect(contractAddress).getUserTokens(await secondSigner.getAddress()),
    ).to.be.revertedWith('You are not an owner.');
  });

  // ============ getMyTokens() ============
  it('should be able to see my tokens if signer is validator', async function () {
    const myTokens: Token[] = await nftMinterContract.connect(secondSigner).getMyTokens();

    expect(myTokens.length).to.be.equal(1);
  });

  it('should be able to see my tokens if signer is approved user', async function () {
    const myTokens: Token[] = await nftMinterContract.connect(thirdSigner).getMyTokens();

    expect(myTokens.length).to.be.equal(0);
  });

  it('should not be able to see my tokens if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).getMyTokens()).to.be.revertedWith(
      'You are still not approved.',
    );
  });

  it('should not be able to see my tokens if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).getMyTokens()).to.be.revertedWith(
      'You are still not approved.',
    );
  });

  it('should not be able to see my tokens if signer is anonymous', async function () {
    await expect(nftMinterContract.connect(contractAddress).getMyTokens()).to.be.revertedWith(
      'You are still not approved.',
    );
  });

  // ============ getContractBalance() ============
  it('should be able to get the contract balance if signer is owner', async function () {
    const balance: number = await nftMinterContract.connect(owner).getContractBalance();

    expect(Solidity.toEth(balance)).to.be.equal(6);
  });

  it('should not be able to get the contract balance if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).getContractBalance()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the contract balance if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).getContractBalance()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the contract balance if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).getContractBalance()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the contract balance if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).getContractBalance()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to get the contract balance if contract is calling', async function () {
    await expect(
      nftMinterContract.connect(contractAddress).getContractBalance(),
    ).to.be.revertedWith('You are not an owner.');
  });

  // ============ withdraw() ============
  it('should be able to withdraw the money if signer is owner', async function () {
    const contractBalanceBeforeWithdraw: number = Solidity.toEth(
      await nftMinterContract.connect(owner).getContractBalance(),
    );
    await nftMinterContract.connect(owner).withdraw();
    const contractBalanceAfterWithdraw: number = Solidity.toEth(
      await nftMinterContract.connect(owner).getContractBalance(),
    );

    // we don't know the exact balance of the owner at this moment
    expect(contractBalanceBeforeWithdraw).to.be.equal(6);
    expect(contractBalanceAfterWithdraw).to.be.equal(0);
  });

  it('should not be able to withdraw the money if signer is validator', async function () {
    await expect(nftMinterContract.connect(secondSigner).withdraw()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to withdraw the money if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).withdraw()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to withdraw the money if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).withdraw()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to withdraw the money if signer is not registered user', async function () {
    await expect(nftMinterContract.connect(fifthSigner).withdraw()).to.be.revertedWith(
      'You are not an owner.',
    );
  });

  it('should not be able to withdraw the money if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).withdraw()).to.be.reverted; // void signer
  });

  // ============ updateUserName() ============
  it('should be able to update the user name if signer is owner but user should not be blocked', async function () {
    await expect(nftMinterContract.connect(owner).updateUserName(ownerUpdatedUsername))
      .to.emit(nftMinterContract, 'UserNameUpdated')
      .withArgs(ownerUsername, ownerUpdatedUsername);

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(owner).getUser(),
    );
    const userByOldName: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(owner).getUserByName(ownerUsername),
    );
    const userByNewName: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(owner).getUserByName(ownerUpdatedUsername),
    );
    const isOldUserNameExisting: string = await nftMinterContract
      .connect(owner)
      .isUserNameExisting(ownerUsername);
    const isNewUserNameExisting: string = await nftMinterContract
      .connect(owner)
      .isUserNameExisting(ownerUpdatedUsername);
    const expectedUser: User = {
      created: true,
      userIndex: 1,
      dateHash: user.dateHash,
      dateIndex: 1,
      userName: 'admin-updated',
      avatarId: 1,
      userAddress: await owner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };
    const nullUser: User = {
      created: false,
      userIndex: 0,
      dateHash: '0x0000000000000000000000000000000000000000000000000000000000000000',
      dateIndex: 0,
      userName: '',
      avatarId: 0,
      userAddress: '0x0000000000000000000000000000000000000000',
      validator: false,
      approved: false,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: 0,
    };

    expect(users.length).to.be.equal(4);
    expect(users[0]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
    expect(userByOldName).to.be.deep.equal(nullUser);
    expect(userByNewName).to.be.deep.equal(expectedUser);
    expect(isOldUserNameExisting).to.be.false;
    expect(isNewUserNameExisting).to.be.true;
  });

  it('should be able to update the user name if signer is validator', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).updateUserName(secondSignerUpdatedUsername),
    )
      .to.emit(nftMinterContract, 'UserNameUpdated')
      .withArgs(secondSignerUsername, secondSignerUpdatedUsername);

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUser(),
    );
    const isOldUserNameExisting: string = await nftMinterContract
      .connect(secondSigner)
      .isUserNameExisting(secondSignerUsername);
    const isNewUserNameExisting: string = await nftMinterContract
      .connect(secondSigner)
      .isUserNameExisting(secondSignerUpdatedUsername);
    const expectedUser: User = {
      created: true,
      userIndex: 2,
      dateHash: user.dateHash,
      dateIndex: 2,
      userName: 'second-updated',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: true,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[1]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
    expect(isOldUserNameExisting).to.be.false;
    expect(isNewUserNameExisting).to.be.true;

    // approve the user for the unit tests that follow
    await nftMinterContract.connect(owner).approveUser(await secondSigner.getAddress());
  });

  it('should be able to update the user name if signer is approved user', async function () {
    await expect(nftMinterContract.connect(thirdSigner).updateUserName(thirdSignerUpdatedUsername))
      .to.emit(nftMinterContract, 'UserNameUpdated')
      .withArgs(thirdSignerUsername, thirdSignerUpdatedUsername);

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(thirdSigner).getUser(),
    );
    const isOldUserNameExisting: string = await nftMinterContract
      .connect(thirdSigner)
      .isUserNameExisting(thirdSignerUsername);
    const isNewUserNameExisting: string = await nftMinterContract
      .connect(thirdSigner)
      .isUserNameExisting(thirdSignerUpdatedUsername);
    const expectedUser: User = {
      created: true,
      userIndex: 3,
      dateHash: user.dateHash,
      dateIndex: 3,
      userName: 'third-updated',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[2]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
    expect(isOldUserNameExisting).to.be.false;
    expect(isNewUserNameExisting).to.be.true;
  });

  it('should be able to update the user name if signer is not approved user', async function () {
    await expect(nftMinterContract.connect(forthSigner).updateUserName(forthSignerUpdatedUsername))
      .to.emit(nftMinterContract, 'UserNameUpdated')
      .withArgs(forthSignerUsername, forthSignerUpdatedUsername);

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(forthSigner).getUser(),
    );
    const isOldUserNameExisting: string = await nftMinterContract
      .connect(forthSigner)
      .isUserNameExisting(forthSignerUsername);
    const isNewUserNameExisting: string = await nftMinterContract
      .connect(forthSigner)
      .isUserNameExisting(forthSignerUpdatedUsername);
    const expectedUser: User = {
      created: true,
      userIndex: 4,
      dateHash: user.dateHash,
      dateIndex: 4,
      userName: 'forth-updated',
      avatarId: 2,
      userAddress: await forthSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[3]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
    expect(isOldUserNameExisting).to.be.false;
    expect(isNewUserNameExisting).to.be.true;
  });

  it('should not be able to update the user name if user name contains less than 5 characters', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).updateUserName(shortUsername),
    ).to.be.revertedWith('Username must contain at least 5 characters.');
  });

  it('should not be able to update the user name if user name already exists', async function () {
    await expect(
      nftMinterContract.connect(secondSigner).updateUserName(thirdSignerUpdatedUsername),
    ).to.be.revertedWith('Username must be unique.');
  });

  it('should not be able to update the user name if signer is not registered user', async function () {
    await expect(
      nftMinterContract.connect(fifthSigner).updateUserName(testSignerUsername),
    ).to.be.revertedWith('You are still not registered.');
  });

  it('should not be able to update the user name if contract is calling', async function () {
    await expect(nftMinterContract.connect(contractAddress).updateUserName(testSignerUsername)).to
      .be.reverted; // void signer
  });

  it('should not be able to update the user name if username is not bytes32', async function () {
    await expect(nftMinterContract.connect(secondSigner).updateUserName('test-signer')).to.be
      .reverted; // invalid arrayify value
  });

  // ============ blockUser() ============
  it('should be able to block the user if signer is validator', async function () {
    await nftMinterContract
      .connect(secondSigner)
      .blockUser(
        await forthSigner.getAddress(),
        ethers.utils.formatBytes32String('Inappropriate actions'),
      );

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(forthSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 4,
      dateHash: user.dateHash,
      dateIndex: 4,
      userName: 'forth-updated',
      avatarId: 2,
      userAddress: await forthSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Inappropriate actions',
      revokeValidatorReason: 'Inappropriate actions',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[3]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should be able to block the user if signer is owner', async function () {
    await nftMinterContract
      .connect(owner)
      .blockUser(
        await thirdSigner.getAddress(),
        ethers.utils.formatBytes32String('Inappropriate actions'),
      );

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(thirdSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 3,
      dateHash: user.dateHash,
      dateIndex: 3,
      userName: 'third-updated',
      avatarId: 3,
      userAddress: await thirdSigner.getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Inappropriate actions',
      revokeValidatorReason: 'Inappropriate actions',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[2]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
  });

  it('should not be able to block the user as validator if the reason has less than 10 characters', async function () {
    await expect(
      nftMinterContract
        .connect(secondSigner)
        .blockUser(await forthSigner.getAddress(), ethers.utils.formatBytes32String('123456789')),
    ).to.be.revertedWith('Reason must contain at least 10 characters.');
  });

  it('should not be able to block the user as validator if the user is owner', async function () {
    await expect(
      nftMinterContract
        .connect(secondSigner)
        .blockUser(await owner.getAddress(), ethers.utils.formatBytes32String('I have the power!')),
    ).to.be.revertedWith('You cannot perform this action.');
  });

  it('should not be able to block the user if signer is approved user', async function () {
    await expect(
      nftMinterContract
        .connect(thirdSigner)
        .blockUser(await forthSigner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to block the user if signer is not approved user', async function () {
    await expect(
      nftMinterContract
        .connect(forthSigner)
        .blockUser(await forthSigner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to block the user if signer is not registered user', async function () {
    await expect(
      nftMinterContract
        .connect(fifthSigner)
        .blockUser(await forthSigner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not a validator.');
  });

  it('should not be able to block the user if contract is calling', async function () {
    await expect(
      nftMinterContract
        .connect(contractAddress)
        .approveUser(await forthSigner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.reverted; // void signer
  });

  // ============ revokeValidatorAccess() ============
  it("should not be able to revoke the validator's access if signer is validator", async function () {
    await expect(
      nftMinterContract
        .connect(secondSigner)
        .revokeValidatorAccess(await owner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not an owner.');
  });

  it("should not be able to revoke the validator's access if signer is approved user", async function () {
    await expect(
      nftMinterContract
        .connect(thirdSigner)
        .revokeValidatorAccess(await owner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not an owner.');
  });

  it("should not be able to revoke the validator's access if signer is not approved user", async function () {
    await expect(
      nftMinterContract
        .connect(forthSigner)
        .revokeValidatorAccess(await owner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not an owner.');
  });

  it("should not be able to revoke the validator's access if signer is not registered user", async function () {
    await expect(
      nftMinterContract
        .connect(fifthSigner)
        .revokeValidatorAccess(await owner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.revertedWith('You are not an owner.');
  });

  it("should not be able to revoke the validator's access if contract is calling", async function () {
    await expect(
      nftMinterContract
        .connect(contractAddress)
        .revokeValidatorAccess(await owner.getAddress(), ethers.utils.formatBytes32String('Haha!')),
    ).to.be.reverted; // void signer
  });

  it("should be able to revoke the validator's access as owner if the reason has less than 10 characters", async function () {
    await expect(
      nftMinterContract
        .connect(owner)
        .revokeValidatorAccess(
          await secondSigner.getAddress(),
          ethers.utils.formatBytes32String('123456789'),
        ),
    ).to.be.revertedWith('Reason must contain at least 10 characters.');
  });

  it("should be able to revoke the validator's access if signer is owner", async function () {
    await nftMinterContract
      .connect(owner)
      .revokeValidatorAccess(
        await secondSigner.getAddress(),
        ethers.utils.formatBytes32String('Bad validator'),
      );

    const users: User[] = await Solidity.resolveStructsArray(
      await nftMinterContract.connect(owner).getUsers(1, 10),
    );
    const user: User = await Solidity.resolveStruct(
      await nftMinterContract.connect(secondSigner).getUser(),
    );
    const expectedUser: User = {
      created: true,
      userIndex: 2,
      dateHash: user.dateHash,
      dateIndex: 2,
      userName: 'second-updated',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: 'Bad validator',
      dateJoined: user.dateJoined,
    };

    expect(users.length).to.be.equal(4);
    expect(users[1]).to.be.deep.equal(expectedUser);
    expect(user).to.be.deep.equal(expectedUser);
  });

  // ============ STRESS TESTS ============
  it('should be able to stress test the users', async function () {
    await nftMinterNoSupplyMockContract
      .connect(signers[2])
      .signUp(ethers.utils.formatBytes32String('signer-user-3'), 3);
    await nftMinterNoSupplyMockContract
      .connect(signers[3])
      .signUp(ethers.utils.formatBytes32String('signer-user-4'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[4])
      .signUp(ethers.utils.formatBytes32String('signer-user-5'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[5])
      .signUp(ethers.utils.formatBytes32String('signer-user-6'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[6])
      .signUp(ethers.utils.formatBytes32String('signer-user-7'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[7])
      .signUp(ethers.utils.formatBytes32String('signer-user-8'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[8])
      .signUp(ethers.utils.formatBytes32String('signer-user-9'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[9])
      .signUp(ethers.utils.formatBytes32String('signer-user-10'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[10])
      .signUp(ethers.utils.formatBytes32String('signer-user-11'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[11])
      .signUp(ethers.utils.formatBytes32String('signer-user-12'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[12])
      .signUp(ethers.utils.formatBytes32String('signer-user-13'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[13])
      .signUp(ethers.utils.formatBytes32String('signer-user-14'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[14])
      .signUp(ethers.utils.formatBytes32String('signer-user-15'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[15])
      .signUp(ethers.utils.formatBytes32String('signer-user-16'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[16])
      .signUp(ethers.utils.formatBytes32String('signer-user-17'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[17])
      .signUp(ethers.utils.formatBytes32String('signer-user-18'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[18])
      .signUp(ethers.utils.formatBytes32String('signer-user-19'), 2);
    await nftMinterNoSupplyMockContract
      .connect(signers[19])
      .signUp(ethers.utils.formatBytes32String('signer-user-20'), 2);

    const users1: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyMockContract.connect(owner).getUsers(1, 10),
    );
    const users2: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyMockContract.connect(owner).getUsers(11, 10),
    );

    expect(users1.length).to.be.equal(10);
    expect(users2.length).to.be.equal(10);
    expect(users1[0].userName).to.be.deep.equal('admin');
    expect(users1[1].userName).to.be.deep.equal('second');
    expect(users1[2].userName).to.be.deep.equal('signer-user-3');
    expect(users1[3].userName).to.be.deep.equal('signer-user-4');
    expect(users1[4].userName).to.be.deep.equal('signer-user-5');
    expect(users1[5].userName).to.be.deep.equal('signer-user-6');
    expect(users1[6].userName).to.be.deep.equal('signer-user-7');
    expect(users1[7].userName).to.be.deep.equal('signer-user-8');
    expect(users1[8].userName).to.be.deep.equal('signer-user-9');
    expect(users1[9].userName).to.be.deep.equal('signer-user-10');
    expect(users2[0].userName).to.be.deep.equal('signer-user-11');
    expect(users2[1].userName).to.be.deep.equal('signer-user-12');
    expect(users2[2].userName).to.be.deep.equal('signer-user-13');
    expect(users2[3].userName).to.be.deep.equal('signer-user-14');
    expect(users2[4].userName).to.be.deep.equal('signer-user-15');
    expect(users2[5].userName).to.be.deep.equal('signer-user-16');
    expect(users2[6].userName).to.be.deep.equal('signer-user-17');
    expect(users2[7].userName).to.be.deep.equal('signer-user-18');
    expect(users2[8].userName).to.be.deep.equal('signer-user-19');
    expect(users2[9].userName).to.be.deep.equal('signer-user-20');

    expect(users1[0].userIndex).to.be.deep.equal(1);
    expect(users1[1].userIndex).to.be.deep.equal(2);
    expect(users1[2].userIndex).to.be.deep.equal(3);
    expect(users1[3].userIndex).to.be.deep.equal(4);
    expect(users1[4].userIndex).to.be.deep.equal(5);
    expect(users1[5].userIndex).to.be.deep.equal(6);
    expect(users1[6].userIndex).to.be.deep.equal(7);
    expect(users1[7].userIndex).to.be.deep.equal(8);
    expect(users1[8].userIndex).to.be.deep.equal(9);
    expect(users1[9].userIndex).to.be.deep.equal(10);
    expect(users2[0].userIndex).to.be.deep.equal(11);
    expect(users2[1].userIndex).to.be.deep.equal(12);
    expect(users2[2].userIndex).to.be.deep.equal(13);
    expect(users2[3].userIndex).to.be.deep.equal(14);
    expect(users2[4].userIndex).to.be.deep.equal(15);
    expect(users2[5].userIndex).to.be.deep.equal(16);
    expect(users2[6].userIndex).to.be.deep.equal(17);
    expect(users2[7].userIndex).to.be.deep.equal(18);
    expect(users2[8].userIndex).to.be.deep.equal(19);
    expect(users2[9].userIndex).to.be.deep.equal(20);
  });

  it('should be able to create multiple batches of users per date', async function () {
    const dateHash0 = Solidity.utToDateHash(timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[2])
      .register(ethers.utils.formatBytes32String('signer-user-3'), 3, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[3])
      .register(ethers.utils.formatBytes32String('signer-user-4'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[4])
      .register(ethers.utils.formatBytes32String('signer-user-5'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[5])
      .register(ethers.utils.formatBytes32String('signer-user-6'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[6])
      .register(ethers.utils.formatBytes32String('signer-user-7'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[7])
      .register(ethers.utils.formatBytes32String('signer-user-8'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[8])
      .register(ethers.utils.formatBytes32String('signer-user-9'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[9])
      .register(ethers.utils.formatBytes32String('signer-user-10'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[10])
      .register(ethers.utils.formatBytes32String('signer-user-11'), 2, timestampNow);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[11])
      .register(ethers.utils.formatBytes32String('signer-user-12'), 2, timestampNow);

    const timestamp1 = timestampNow + A_DAY * 5;
    const dateHash1 = Solidity.utToDateHash(timestamp1);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[12])
      .register(ethers.utils.formatBytes32String('signer-user-13'), 2, timestamp1);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[13])
      .register(ethers.utils.formatBytes32String('signer-user-14'), 2, timestamp1);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[14])
      .register(ethers.utils.formatBytes32String('signer-user-15'), 2, timestamp1);

    const timestamp2 = timestampNow + A_DAY * 12;
    const dateHash2 = Solidity.utToDateHash(timestamp2);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[15])
      .register(ethers.utils.formatBytes32String('signer-user-16'), 2, timestamp2);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[16])
      .register(ethers.utils.formatBytes32String('signer-user-17'), 2, timestamp2);

    const timestamp3 = timestampNow + A_DAY * 35;
    const dateHash3 = Solidity.utToDateHash(timestamp3);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[17])
      .register(ethers.utils.formatBytes32String('signer-user-18'), 2, timestamp3);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[18])
      .register(ethers.utils.formatBytes32String('signer-user-19'), 2, timestamp3);
    await nftMinterNoSupplyPerUserMockContract
      .connect(signers[19])
      .register(ethers.utils.formatBytes32String('signer-user-20'), 2, timestamp3);

    const users1_1: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyPerUserMockContract.connect(owner).getUsersByDate(dateHash0, 1, 10),
    );
    const users1_2: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyPerUserMockContract.connect(owner).getUsersByDate(dateHash0, 11, 10),
    );
    const users2: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyPerUserMockContract.connect(owner).getUsersByDate(dateHash1, 1, 10),
    );
    const users3: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyPerUserMockContract.connect(owner).getUsersByDate(dateHash2, 1, 10),
    );
    const users4: User[] = await Solidity.resolveStructsArray(
      await nftMinterNoSupplyPerUserMockContract.connect(owner).getUsersByDate(dateHash3, 1, 10),
    );

    const timestamps: number[] = Solidity.toTimestamps(
      await nftMinterNoSupplyPerUserMockContract.connect(contractAddress).getDateHashes(),
    );

    const userCount: number = Solidity.toNumber(
      await nftMinterNoSupplyPerUserMockContract.connect(contractAddress).getUsersCount(),
    );

    const usersByDateCount_1: number = Solidity.toNumber(
      await nftMinterNoSupplyPerUserMockContract
        .connect(contractAddress)
        .getUsersByDateCount(dateHash0),
    );

    const usersByDateCount_2: number = Solidity.toNumber(
      await nftMinterNoSupplyPerUserMockContract
        .connect(contractAddress)
        .getUsersByDateCount(dateHash1),
    );

    const usersByDateCount_3: number = Solidity.toNumber(
      await nftMinterNoSupplyPerUserMockContract
        .connect(contractAddress)
        .getUsersByDateCount(dateHash2),
    );

    const usersByDateCount_4: number = Solidity.toNumber(
      await nftMinterNoSupplyPerUserMockContract
        .connect(contractAddress)
        .getUsersByDateCount(dateHash3),
    );

    const ownerUser: User = {
      created: true,
      userIndex: 1,
      dateHash: dateHash0,
      dateIndex: 1,
      userName: 'admin',
      avatarId: 1,
      userAddress: await owner.getAddress(),
      validator: true,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users1_1[0].dateJoined,
    };

    const secondUser: User = {
      created: true,
      userIndex: 2,
      dateHash: dateHash0,
      dateIndex: 2,
      userName: 'second',
      avatarId: 2,
      userAddress: await secondSigner.getAddress(),
      validator: false,
      approved: true,
      blockReason: '',
      revokeValidatorReason: '',
      dateJoined: users1_1[1].dateJoined,
    };

    const signerUser3: User = {
      created: true,
      userIndex: 3,
      dateHash: dateHash0,
      dateIndex: 3,
      userName: 'signer-user-3',
      avatarId: 3,
      userAddress: await signers[2].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[2].dateJoined,
    };

    const signerUser4: User = {
      created: true,
      userIndex: 4,
      dateHash: dateHash0,
      dateIndex: 4,
      userName: 'signer-user-4',
      avatarId: 2,
      userAddress: await signers[3].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[3].dateJoined,
    };

    const signerUser5: User = {
      created: true,
      userIndex: 5,
      dateHash: dateHash0,
      dateIndex: 5,
      userName: 'signer-user-5',
      avatarId: 2,
      userAddress: await signers[4].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[4].dateJoined,
    };

    const signerUser6: User = {
      created: true,
      userIndex: 6,
      dateHash: dateHash0,
      dateIndex: 6,
      userName: 'signer-user-6',
      avatarId: 2,
      userAddress: await signers[5].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[5].dateJoined,
    };

    const signerUser7: User = {
      created: true,
      userIndex: 7,
      dateHash: dateHash0,
      dateIndex: 7,
      userName: 'signer-user-7',
      avatarId: 2,
      userAddress: await signers[6].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[6].dateJoined,
    };

    const signerUser8: User = {
      created: true,
      userIndex: 8,
      dateHash: dateHash0,
      dateIndex: 8,
      userName: 'signer-user-8',
      avatarId: 2,
      userAddress: await signers[7].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[7].dateJoined,
    };

    const signerUser9: User = {
      created: true,
      userIndex: 9,
      dateHash: dateHash0,
      dateIndex: 9,
      userName: 'signer-user-9',
      avatarId: 2,
      userAddress: await signers[8].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[8].dateJoined,
    };

    const signerUser10: User = {
      created: true,
      userIndex: 10,
      dateHash: dateHash0,
      dateIndex: 10,
      userName: 'signer-user-10',
      avatarId: 2,
      userAddress: await signers[9].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_1[9].dateJoined,
    };

    const signerUser11: User = {
      created: true,
      userIndex: 11,
      dateHash: dateHash0,
      dateIndex: 11,
      userName: 'signer-user-11',
      avatarId: 2,
      userAddress: await signers[10].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_2[0].dateJoined,
    };

    const signerUser12: User = {
      created: true,
      userIndex: 12,
      dateHash: dateHash0,
      dateIndex: 12,
      userName: 'signer-user-12',
      avatarId: 2,
      userAddress: await signers[11].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users1_2[1].dateJoined,
    };

    const signerUser13: User = {
      created: true,
      userIndex: 13,
      dateHash: dateHash1,
      dateIndex: 1,
      userName: 'signer-user-13',
      avatarId: 2,
      userAddress: await signers[12].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users2[0].dateJoined,
    };

    const signerUser14: User = {
      created: true,
      userIndex: 14,
      dateHash: dateHash1,
      dateIndex: 2,
      userName: 'signer-user-14',
      avatarId: 2,
      userAddress: await signers[13].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users2[1].dateJoined,
    };

    const signerUser15: User = {
      created: true,
      userIndex: 15,
      dateHash: dateHash1,
      dateIndex: 3,
      userName: 'signer-user-15',
      avatarId: 2,
      userAddress: await signers[14].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users2[2].dateJoined,
    };

    const signerUser16: User = {
      created: true,
      userIndex: 16,
      dateHash: dateHash2,
      dateIndex: 1,
      userName: 'signer-user-16',
      avatarId: 2,
      userAddress: await signers[15].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users3[0].dateJoined,
    };

    const signerUser17: User = {
      created: true,
      userIndex: 17,
      dateHash: dateHash2,
      dateIndex: 2,
      userName: 'signer-user-17',
      avatarId: 2,
      userAddress: await signers[16].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users3[1].dateJoined,
    };

    const signerUser18: User = {
      created: true,
      userIndex: 18,
      dateHash: dateHash3,
      dateIndex: 1,
      userName: 'signer-user-18',
      avatarId: 2,
      userAddress: await signers[17].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users4[0].dateJoined,
    };

    const signerUser19: User = {
      created: true,
      userIndex: 19,
      dateHash: dateHash3,
      dateIndex: 2,
      userName: 'signer-user-19',
      avatarId: 2,
      userAddress: await signers[18].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users4[1].dateJoined,
    };

    const signerUser20: User = {
      created: true,
      userIndex: 20,
      dateHash: dateHash3,
      dateIndex: 3,
      userName: 'signer-user-20',
      avatarId: 2,
      userAddress: await signers[19].getAddress(),
      validator: false,
      approved: false,
      blockReason: 'Username under review.',
      revokeValidatorReason: '',
      dateJoined: users4[2].dateJoined,
    };

    expect(users1_1[0]).to.be.deep.equal(ownerUser);
    expect(users1_1[1]).to.be.deep.equal(secondUser);
    expect(users1_1[2]).to.be.deep.equal(signerUser3);
    expect(users1_1[3]).to.be.deep.equal(signerUser4);
    expect(users1_1[4]).to.be.deep.equal(signerUser5);
    expect(users1_1[5]).to.be.deep.equal(signerUser6);
    expect(users1_1[6]).to.be.deep.equal(signerUser7);
    expect(users1_1[7]).to.be.deep.equal(signerUser8);
    expect(users1_1[8]).to.be.deep.equal(signerUser9);
    expect(users1_1[9]).to.be.deep.equal(signerUser10);

    expect(users1_2[0]).to.be.deep.equal(signerUser11);
    expect(users1_2[1]).to.be.deep.equal(signerUser12);

    expect(users2[0]).to.be.deep.equal(signerUser13);
    expect(users2[1]).to.be.deep.equal(signerUser14);
    expect(users2[2]).to.be.deep.equal(signerUser15);

    expect(users3[0]).to.be.deep.equal(signerUser16);
    expect(users3[1]).to.be.deep.equal(signerUser17);

    expect(users4[0]).to.be.deep.equal(signerUser18);
    expect(users4[1]).to.be.deep.equal(signerUser19);
    expect(users4[2]).to.be.deep.equal(signerUser20);

    expect(timestamps).to.be.eql(
      Solidity.toTimestamps([dateHash0, dateHash1, dateHash2, dateHash3]),
    );

    expect(userCount).to.be.equal(20);
    expect(usersByDateCount_1).to.be.equal(12);
    expect(usersByDateCount_2).to.be.equal(3);
    expect(usersByDateCount_3).to.be.equal(2);
    expect(usersByDateCount_4).to.be.equal(3);
  });
});
