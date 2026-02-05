// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {ArenaLeaderboardV4} from "../src/ArenaLeaderboardV4.sol";

contract DeployV4 is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        ArenaLeaderboardV4 leaderboard = new ArenaLeaderboardV4();

        console.log("ArenaLeaderboardV4 deployed to:", address(leaderboard));

        vm.stopBroadcast();
    }
}
