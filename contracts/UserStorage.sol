// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./Utils.sol";
// import "hardhat/console.sol";

contract UserStorage {

    event SignUpCompleted(bytes32 _userName);
    event UserNameUpdated(bytes32 _oldUserName, bytes32 _newUserName);

    address internal owner;
    bool private signUpEnabled = false;

    struct User {
        bool created;
        uint256 userIndex;
        bytes32 dateHash;
        uint256 dateIndex;
        bytes32 userName;
        uint256 avatarId;
        address userAddress;
        bool validator;
        bool approved;
        bytes32 blockReason;
        bytes32 revokeValidatorReason;
        uint256 dateJoined;
    }

    uint256 private lastUserIndex = 0;
    bytes32[] private dateHashes;

    // key -> user index
    mapping(uint256 => User) private usersById;
    // key -> user name
    mapping(bytes32 => User) private usersByName;
    // key -> user address
    mapping(address => User) private usersByAddress;
    // key -> username
    mapping(bytes32 => bool) private userNameExists;
    // key1 -> dateHash(DD.MM.YYYY), key2 -> user index
    mapping(bytes32 => mapping(uint256 => User)) private usersByDate;
    // key -> dateHash(DD.MM.YYYY)
    mapping(bytes32 => bool) private dateHashExists;
    // key -> dateHash(DD.MM.YYYY)
    mapping(bytes32 => uint256) private lastDateIndex;

    constructor() {
        owner = msg.sender;
        createUser('admin', 1, true, true, block.timestamp);
    }

    modifier userIsOwner {
        require(msg.sender == owner, 'You are not an owner.');
        _;
    }

    modifier userIsValidator {
        require(usersByAddress[msg.sender].validator == true, 'You are not a validator.');
        _;
    }

    modifier userIsApproved {
        require(usersByAddress[msg.sender].approved == true, 'You are still not approved.');
        _;
    }

    modifier userIsRegistered {
        require(usersByAddress[msg.sender].created,
            'You are still not registered.');
        _;
    }

    modifier userIsNotRegistered {
        require(!usersByAddress[msg.sender].created,
            'You are already registered.');
        _;
    }

    modifier addressIsNotOwner(address _userAddress) {
        require(_userAddress != owner, 'You cannot perform this action.');
        _;
    }

    modifier userNameIsUnique(bytes32 _userName) {
        require(userNameExists[_userName] == false, 'Username must be unique.');
        _;
    }

    modifier userNameIsMin5Chars(bytes32 _userName) {
        require(_userName[4] != 0x00, 'Username must contain at least 5 characters.');
        _;
    }

    modifier reasonIsMin10Chars(bytes32 reason) {
        require(reason[9] != 0x00, 'Reason must contain at least 10 characters.');
        _;
    }

    modifier signUpIsEnabled {
        require(signUpEnabled == true, 'Sign Up is disabled at this moment.');
        _;
    }

    // ========================== Free ========================== //

    function isOwner() external view returns (bool) {
        return msg.sender == owner;
    }

    function isUserNameExisting(bytes32 _userName) external view returns (bool) {
        return userNameExists[_userName];
    }

    function getUser() external userIsRegistered view returns (User memory) {
        return usersByAddress[msg.sender];
    }

    function getUserByName(bytes32 _userName) external userIsValidator view returns (User memory) {
        return usersByName[_userName];
    }

    function getUsers(uint256 _fromIndex, uint256 _offset)
        external
        view
        userIsOwner
        returns (User[] memory)
    {
        User[] memory users = new User[](_offset);

        for (uint256 i = 0; i < _offset;) {
            users[i] = usersById[_fromIndex + i];
            unchecked { i++; }
        }

        return users;
    }

    function getUsersByDate(bytes32 _dateHash, uint256 _fromIndex, uint256 _offset)
        external
        view
        userIsOwner
        returns (User[] memory)
    {
        User[] memory users = new User[](_offset);

        for (uint256 i = 0; i < _offset;) {
            users[i] = usersByDate[_dateHash][_fromIndex + i];
            unchecked { i++; }
        }

        return users;
    }

    function getUsersCount() external view returns (uint256) {
        return lastUserIndex;
    }

    function getUsersByDateCount(bytes32 _dateHash) external view returns (uint256) {
        return lastDateIndex[_dateHash];
    }

    function isSignUpEnabled() external view returns (bool) {
        return signUpEnabled;
    }

    function getDateHashes() external view returns (bytes32[] memory) {
        return dateHashes;
    }

    // ========================== Paid / Transaction ========================== //

    function enableSignUp(bool _enabled) external userIsOwner {
        signUpEnabled = _enabled;
    }

    function register(bytes32 _userName, uint256 _avatarId, uint256 _timestamp)
        external
        signUpIsEnabled
        userIsNotRegistered
        userNameIsMin5Chars(_userName)
        userNameIsUnique(_userName)
    {
        // send timestamp instead
        createUser(_userName, _avatarId, false, false, _timestamp);
        emit SignUpCompleted(_userName);
    }

    function signUp(bytes32 _userName, uint256 _avatarId)
        external
        signUpIsEnabled
        userIsNotRegistered
        userNameIsMin5Chars(_userName)
        userNameIsUnique(_userName)
    {
        createUser(_userName, _avatarId, false, false, block.timestamp);
        emit SignUpCompleted(_userName);
    }

    function createUser(
        bytes32 _userName,
        uint256 _avatarId,
        bool _approved,
        bool _validator,
        uint256 _timestamp
    ) private {
        bytes32 dateHash = Utils.createDateHash(_timestamp);

        if (dateHashExists[dateHash] != true) {
            dateHashes.push(dateHash);
            dateHashExists[dateHash] = true;
        }

        unchecked { lastUserIndex++; } // start from 1
        unchecked { lastDateIndex[dateHash]++; } // start from 1

        bytes32 blockReason = '';
        if (msg.sender != owner) {
            blockReason = 'Username under review.';
        }

        User memory _newUser = User(
            true,
            lastUserIndex,
            dateHash,
            lastDateIndex[dateHash],
            _userName,
            _avatarId,
            msg.sender,
            _approved,
            _validator,
            blockReason,
            '',
            _timestamp
        );

        usersById[lastUserIndex] = _newUser;
        usersByName[_userName] = _newUser;
        usersByDate[dateHash][lastDateIndex[dateHash]] = _newUser;

        usersByAddress[msg.sender] = _newUser;
        userNameExists[_userName] = true;
    }

    function addUserAsValidator(address _userAddress) external userIsOwner {
        usersByAddress[_userAddress].validator = true;
        usersByAddress[_userAddress].revokeValidatorReason = '';
        usersByAddress[_userAddress].approved = true;
        usersByAddress[_userAddress].blockReason = '';

        User memory user = usersByAddress[_userAddress];

        usersById[user.userIndex].validator = true;
        usersById[user.userIndex].revokeValidatorReason = '';
        usersById[user.userIndex].approved = true;
        usersById[user.userIndex].blockReason = '';

        usersByName[user.userName].validator = true;
        usersByName[user.userName].revokeValidatorReason = '';
        usersByName[user.userName].approved = true;
        usersByName[user.userName].blockReason = '';

        usersByDate[user.dateHash][user.dateIndex].validator = true;
        usersByDate[user.dateHash][user.dateIndex].revokeValidatorReason = '';
        usersByDate[user.dateHash][user.dateIndex].approved = true;
        usersByDate[user.dateHash][user.dateIndex].blockReason = '';
    }

    function revokeValidatorAccess(address _userAddress, bytes32 _reason)
        external
        userIsOwner
        reasonIsMin10Chars(_reason)
    {
        usersByAddress[_userAddress].validator = false;
        usersByAddress[_userAddress].revokeValidatorReason = _reason;

        User memory user = usersByAddress[_userAddress];

        usersById[user.userIndex].validator = false;
        usersById[user.userIndex].revokeValidatorReason = _reason;

        usersByName[user.userName].validator = false;
        usersByName[user.userName].revokeValidatorReason = _reason;

        usersByDate[user.dateHash][user.dateIndex].validator = false;
        usersByDate[user.dateHash][user.dateIndex].revokeValidatorReason = _reason;
    }

    function approveUser(address _userAddress) external userIsValidator {
        usersByAddress[_userAddress].approved = true;
        usersByAddress[_userAddress].blockReason = '';

        User memory user = usersByAddress[_userAddress];

        usersById[user.userIndex].approved = true;
        usersById[user.userIndex].blockReason = '';

        usersByName[user.userName].approved = true;
        usersByName[user.userName].blockReason = '';

        usersByDate[user.dateHash][user.dateIndex].approved = true;
        usersByDate[user.dateHash][user.dateIndex].blockReason = '';
    }

    function blockUser(address _userAddress, bytes32 _reason)
        external
        addressIsNotOwner(_userAddress)
        userIsValidator
        reasonIsMin10Chars(_reason)
    {
        usersByAddress[_userAddress].approved = false;
        usersByAddress[_userAddress].blockReason = _reason;
        usersByAddress[_userAddress].validator = false;
        usersByAddress[_userAddress].revokeValidatorReason = _reason;

        User memory user = usersByAddress[_userAddress];

        usersById[user.userIndex].approved = false;
        usersById[user.userIndex].blockReason = _reason;
        usersById[user.userIndex].validator = false;
        usersById[user.userIndex].revokeValidatorReason = _reason;

        usersByName[user.userName].approved = false;
        usersByName[user.userName].blockReason = _reason;
        usersByName[user.userName].validator = false;
        usersByName[user.userName].revokeValidatorReason = _reason;

        usersByDate[user.dateHash][user.dateIndex].approved = false;
        usersByDate[user.dateHash][user.dateIndex].blockReason = _reason;
        usersByDate[user.dateHash][user.dateIndex].validator = false;
        usersByDate[user.dateHash][user.dateIndex].revokeValidatorReason = _reason;
    }

    function updateUserName(bytes32 _newUserName)
        external
        userIsRegistered
        userNameIsMin5Chars(_newUserName)
        userNameIsUnique(_newUserName)
    {
        bytes32 oldUserName = usersByAddress[msg.sender].userName;
        User memory user = usersByAddress[msg.sender];

        usersByName[_newUserName] = usersByName[oldUserName];
        delete usersByName[oldUserName];

        usersByAddress[msg.sender].userName = _newUserName;
        usersById[user.userIndex].userName = _newUserName;
        usersByName[_newUserName].userName = _newUserName;
        usersByDate[user.dateHash][user.dateIndex].userName = _newUserName;

        if (msg.sender != owner) {
            usersByAddress[msg.sender].blockReason = 'Username under review.';
            usersById[user.userIndex].blockReason = 'Username under review.';
            usersByName[_newUserName].blockReason = 'Username under review.';
            usersByDate[user.dateHash][user.dateIndex].blockReason = 'Username under review.';

            usersByAddress[msg.sender].approved = false;
            usersById[user.userIndex].approved = false;
            usersByName[user.userName].approved = false;
            usersByDate[user.dateHash][user.dateIndex].approved = false;
        }

        userNameExists[oldUserName] = false;
        userNameExists[_newUserName] = true;

        emit UserNameUpdated(oldUserName, _newUserName);
    }
}