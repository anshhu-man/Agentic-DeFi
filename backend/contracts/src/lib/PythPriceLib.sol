// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@pythnetwork/pyth-sdk-solidity/PythStructs.sol";

/**
 * @title PythPriceLib
 * @dev Library for handling Pyth price data scaling and validation
 */
library PythPriceLib {
    error PythPriceLib__NonPositivePrice();
    error PythPriceLib__HighUncertainty();

    /**
     * @dev Scale Pyth price and confidence to 18 decimals
     * @param price The price from Pyth (int64)
     * @param conf The confidence from Pyth (uint64)
     * @param expo The exponent from Pyth (int32)
     * @return price18 Price scaled to 18 decimals
     * @return conf18 Confidence scaled to 18 decimals
     */
    function scaleTo1e18(int64 price, uint64 conf, int32 expo) 
        internal 
        pure 
        returns (uint256 price18, uint256 conf18) 
    {
        int256 p = int256(price);
        int256 e = int256(18) + int256(expo); // expo typically negative, e.g., -8
        
        if (p <= 0) {
            revert PythPriceLib__NonPositivePrice();
        }
        
        if (e >= 0) {
            uint256 mul = 10 ** uint256(e);
            price18 = uint256(p) * mul;
            conf18 = uint256(conf) * mul;
        } else {
            uint256 div = 10 ** uint256(-e);
            price18 = uint256(p) / div;
            conf18 = uint256(conf) / div;
        }
    }

    /**
     * @dev Assert that price is fresh and has acceptable confidence
     * @param p The Pyth price struct
     * @param maxConfBps Maximum confidence in basis points (e.g., 50 = 0.5%)
     */
    function assertFreshAndCertain(
        PythStructs.Price memory p,
        uint256 maxConfBps
    ) internal pure {
        (uint256 price18, uint256 conf18) = scaleTo1e18(p.price, p.conf, p.expo);
        
        // Check confidence threshold: conf/price <= maxConfBps/10000
        if (conf18 * 10000 > price18 * maxConfBps) {
            revert PythPriceLib__HighUncertainty();
        }
    }

    /**
     * @dev Get scaled price and confidence with validation
     * @param p The Pyth price struct
     * @param maxConfBps Maximum confidence in basis points
     * @return price18 Price scaled to 18 decimals
     * @return conf18 Confidence scaled to 18 decimals
     */
    function getValidatedPrice(
        PythStructs.Price memory p,
        uint256 maxConfBps
    ) internal pure returns (uint256 price18, uint256 conf18) {
        (price18, conf18) = scaleTo1e18(p.price, p.conf, p.expo);
        
        // Validate confidence
        if (conf18 * 10000 > price18 * maxConfBps) {
            revert PythPriceLib__HighUncertainty();
        }
    }
}
