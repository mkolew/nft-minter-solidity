// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./UserStorage.sol";

/*
** - Saving and loading variables from memory costs way less then saving and loading variables from storage
** - safeMint is there to prevent someone minting ERC721 to a contract that does not support ERC721 transfer
** - Unchecked blocks avoid compiler to include additional opcodes to check for underflow/overflow.
** - Access modifiers: external, public, internal and private therefor don't use public if external will do
** - Don't read from the same storage variable twice in one transaction. Cache it in a local variable.
** - Using other than uint256 will save gas costs on deploying the contract but users will pay extra.
** - Using for loops in solidity is a bad practice. Transaction can run out of gas if the array is too big. Use mappings instead
** - safeMint is there to prevent someone minting ERC721 to a contract which does not support ERC721 transfer
*/
contract NFTMinter is ERC721, ERC721Enumerable, ERC721URIStorage, ERC721Burnable, UserStorage {

    event TokensMinted(string[] _tokenURIs);
    event TokenBurned(string _tokenURI);

    uint256 private maxSupply = 10000;
    uint256 private maxSupplyPerUser = 100;
    uint256 private cost = 0.5 ether; // MATIC
    bool private mintingEnabled = false;

    struct Token {
        bool created;
        uint256 tokenId;
        string tokenURI;
        address owner;
    }

    // using Counters can skip the SafeMath overflow check, thereby saving gas
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    // key -> user address
    mapping(address => Token[]) private userTokens;
    // key -> token uri
    mapping(string => bool) private tokenExists;
    // key -> token uri
    mapping(string => bool) private tokenIsBurned;

    constructor() ERC721("NFTToken", "NFT") {}

    modifier mintingIsEnabled {
        require(isMintingEnabled() == true || msg.sender == owner, 'Minting is disabled at this moment.');
        _;
    }

    modifier maxSupplyNotExceeded(uint256 _tokenURIsLength) {
        require(totalSupply() + _tokenURIsLength <= getMaxSupply(), 'All NFTs are minted.');
        _;
    }

    modifier maxSupplyPerUserNotExceeded(uint256 _tokenURIsLength) {
        require(userTokens[msg.sender].length + _tokenURIsLength <= getMaxSupplyPerUser() || msg.sender == owner,
            'Maximum minted NFTs per user exceeded.');
        _;
    }

    modifier paidEnough(uint256 _tokenURIsLength) {
        require(msg.value >= cost * _tokenURIsLength || msg.sender == owner,
            'You paid less than the minimum price per NFT.');
        _;
    }

    modifier tokenIsUnique(string memory _tokenURI) {
        require(!tokenExists[_tokenURI],
            'One of the NFTs is existing. You can only mint unique NFTs.');
        _;
    }

    // ========================== Free ========================== //

    function totalSupply() public view override(ERC721Enumerable) returns (uint256) {
        return super.totalSupply();
    }

    function getMaxSupply() public virtual view returns (uint256) {
        return maxSupply;
    }

    function getMaxSupplyPerUser() public virtual view returns (uint256) {
        return maxSupplyPerUser;
    }

    function getCost() external view returns (uint256) {
        return cost;
    }

    function isMintingEnabled() public virtual view returns (bool) {
        return mintingEnabled;
    }

    function isTokenBurned(string memory _tokenURI) external userIsOwner view returns (bool) {
        return tokenIsBurned[_tokenURI];
    }

    function isTokenExisting(string memory _tokenURI) external view returns (bool) {
        return tokenExists[_tokenURI];
    }

    function tokenURI(uint256 _tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(_tokenId);
    }

    function getUserTokens(address _userAddress) external userIsOwner view returns (Token[] memory) {
        return userTokens[_userAddress];
    }

    function getMyTokens() external userIsApproved view returns (Token[] memory) {
        return userTokens[msg.sender];
    }

    function getBurnedTokens() external userIsOwner view returns (Token[] memory) {
        return userTokens[address(0)];
    }

    function getContractBalance() external userIsOwner view returns (uint256) {
        return address(this).balance;
    }

    function supportsInterface(bytes4 _interfaceId) public view override(ERC721, ERC721Enumerable, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }

    // ========================== Paid / Transaction ========================== //

    // This will decrease the value of the token
    function updateMaxSupply(uint256 _newMaxSupply) external userIsOwner {
        maxSupply = _newMaxSupply;
    }

    function updateMaxSupplyPerUser(uint256 _newMaxSupplyPerUser) external userIsOwner {
        maxSupplyPerUser = _newMaxSupplyPerUser;
    }

    function updateCost(uint _newCost) external userIsOwner {
        cost = _newCost;
    }

    function enableMinting(bool _enabled) external userIsOwner {
        mintingEnabled = _enabled;
    }

    function mint(string[] memory _tokenURIs)
        external
        payable
        mintingIsEnabled
        userIsRegistered
        userIsApproved
        maxSupplyNotExceeded(_tokenURIs.length)
        maxSupplyPerUserNotExceeded(_tokenURIs.length)
        paidEnough(_tokenURIs.length)
    {
        uint256 tokenURIsLength = _tokenURIs.length;
        for (uint256 i = 0; i < tokenURIsLength;) {
            mintToken(_tokenURIs[i]);
            unchecked { i++; }
        }
        emit TokensMinted(_tokenURIs);
    }

    function mintToken(string memory _tokenURI) private tokenIsUnique(_tokenURI) {
        _tokenIds.increment(); // start from 1
        uint256 newTokenId = _tokenIds.current();

        if (msg.sender == owner) {
            _mint(msg.sender, newTokenId);
        } else {
            _safeMint(msg.sender, newTokenId);
        }

        // Set the URI including the metadata
        _setTokenURI(newTokenId, _tokenURI);
        // Approve owner to operate on newTokenId
        _approve(owner, newTokenId);

        Token memory token = Token(true, newTokenId, _tokenURI, msg.sender);

        // map Token to a owner
        userTokens[msg.sender].push(token);
        // set this token as existing
        tokenExists[_tokenURI] = true;
    }

    function _burn(uint256 _tokenId) internal override(ERC721, ERC721URIStorage) {
        address tokenOwner = ownerOf(_tokenId);
        super._burn(_tokenId);
        string memory burnedTokenURI = burnToken(_tokenId, tokenOwner);
        emit TokenBurned(burnedTokenURI);
    }

    function burn(uint256 _tokenId) public override(ERC721Burnable) {
        super.burn(_tokenId);
    }

    function burnToken(uint256 _tokenId, address _tokenOwner) private returns (string memory) {
        string memory burnedTokenURI;

        uint256 userTokensLength = userTokens[_tokenOwner].length;
        for (uint256 i = 0; i < userTokensLength;) {
            if (userTokens[_tokenOwner][i].tokenId == _tokenId) {
                burnedTokenURI = userTokens[_tokenOwner][i].tokenURI;
                tokenIsBurned[userTokens[_tokenOwner][i].tokenURI] = true;
                tokenExists[userTokens[_tokenOwner][i].tokenURI] = false;

                userTokens[address(0)].push(userTokens[_tokenOwner][i]);

                delete userTokens[_tokenOwner][i];
                userTokens[_tokenOwner][i] = userTokens[_tokenOwner][--userTokensLength];
                userTokens[_tokenOwner].pop();
            }
            unchecked { i++; }
        }

        return burnedTokenURI;
    }

    function withdraw() public payable userIsOwner {
        (bool os, ) = payable(owner).call{value: address(this).balance}("");
        require(os);
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _batchSize
    ) internal override(ERC721, ERC721Enumerable) {
        super._beforeTokenTransfer(_from, _to, _tokenId, _batchSize);
    }
}