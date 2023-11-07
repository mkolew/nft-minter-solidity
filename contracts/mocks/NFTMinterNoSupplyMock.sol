// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../NFTMinter.sol";

contract NFTMinterNoSupplyMock is NFTMinter {
    function getMaxSupply() public pure override(NFTMinter) returns (uint256) {
        return 1;
    }
}