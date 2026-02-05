// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArenaLeaderboardV2.sol";

contract DeployV2Script is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ArenaLeaderboardV2 leaderboard = new ArenaLeaderboardV2();

        console.log("ArenaLeaderboardV2 deployed at:", address(leaderboard));

        vm.stopBroadcast();
    }
}
