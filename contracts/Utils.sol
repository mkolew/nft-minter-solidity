// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

library Utils {
    bytes16 private constant _SYMBOLS = "0123456789abcdef";
    uint256 private constant SECONDS_PER_DAY = 24 * 60 * 60;
    uint256 private constant OFFSET19700101 = 2440588;

    function createDateHash(uint256 _timestamp) internal pure returns (bytes32) {
        unchecked {
            uint256 _days = uint256(_timestamp / SECONDS_PER_DAY);

            uint256 L = _days + 68569 + OFFSET19700101;
            uint256 N = 4 * L / 146097;
            L = L - (146097 * N + 3) / 4;
            uint256 _year = 4000 * (L + 1) / 1461001;
            L = L - 1461 * _year / 4 + 31;
            uint256 _month = 80 * L / 2447;
            uint256 _day = L - 2447 * _month / 80;
            L = _month / 11;
            _month = _month + 2 - 12 * L;
            _year = 100 * (N - 49) + _year + L;

            return bytes32(abi.encodePacked(toString(_day), '.', toString(_month), '.', toString(_year)));
        }
    }

    function toString(uint256 value) internal pure returns (string memory) {
        unchecked {
            uint256 length = log10(value) + 1;
            string memory buffer = new string(length);
            uint256 ptr;
            /// @solidity memory-safe-assembly
            assembly {
                ptr := add(buffer, add(32, length))
            }
            while (true) {
                ptr--;
                /// @solidity memory-safe-assembly
                assembly {
                    mstore8(ptr, byte(mod(value, 10), _SYMBOLS))
                }
                value /= 10;
                if (value == 0) break;
            }
            return buffer;
        }
    }

    /**
     * @dev Return the log in base 10, rounded down, of a positive value.
     * Returns 0 if given 0.
     */
    function log10(uint256 value) internal pure returns (uint256) {
        uint256 result = 0;
        unchecked {
            if (value >= 10**64) {
                value /= 10**64;
                result += 64;
            }
            if (value >= 10**32) {
                value /= 10**32;
                result += 32;
            }
            if (value >= 10**16) {
                value /= 10**16;
                result += 16;
            }
            if (value >= 10**8) {
                value /= 10**8;
                result += 8;
            }
            if (value >= 10**4) {
                value /= 10**4;
                result += 4;
            }
            if (value >= 10**2) {
                value /= 10**2;
                result += 2;
            }
            if (value >= 10**1) {
                result += 1;
            }
        }
        return result;
    }
}