// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "../NFTMinter.sol";

contract NFTMinterMintingDisabled is NFTMinter {
    function isMintingEnabled() public pure override(NFTMinter) returns (bool) {
        return false;
    }
}