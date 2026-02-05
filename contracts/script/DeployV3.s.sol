// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArenaLeaderboardV3.sol";

contract DeployV3 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ArenaLeaderboardV3 leaderboard = new ArenaLeaderboardV3();

        console.log("ArenaLeaderboardV3 deployed to:", address(leaderboard));
        console.log("Entry fee: 0.001 ETH");
        console.log("Epoch duration: 24 hours");
        console.log("House fee: 5%");

        vm.stopBroadcast();
    }
}
