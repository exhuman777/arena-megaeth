// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ArenaLeaderboard.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ArenaLeaderboard leaderboard = new ArenaLeaderboard();

        console.log("ArenaLeaderboard deployed at:", address(leaderboard));

        vm.stopBroadcast();
    }
}
