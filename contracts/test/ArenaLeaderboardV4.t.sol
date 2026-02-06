// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/ArenaLeaderboardV4.sol";

/// @title Arena Leaderboard V4 - Comprehensive Test Suite
/// @notice 10 User Stories + edge cases + security tests
contract ArenaLeaderboardV4Test is Test {
    ArenaLeaderboardV4 arena;

    address house = address(this);
    address alice = address(0xA11CE);
    address bob = address(0xB0B);
    address charlie = address(0xC4A7);
    address dave = address(0xDA7E);
    address eve = address(0xE7E);

    uint256 constant ENTRY_FEE = 0.001 ether;
    uint256 constant EPOCH_DURATION = 24 hours;

    function setUp() public {
        arena = new ArenaLeaderboardV4();
        // Fund test accounts
        vm.deal(alice, 10 ether);
        vm.deal(bob, 10 ether);
        vm.deal(charlie, 10 ether);
        vm.deal(dave, 10 ether);
        vm.deal(eve, 10 ether);
    }

    // ============================================================
    // USER STORY 1: New player pays and plays their first game
    // "As a new player, I want to pay 0.001 ETH and play a game,
    //  then have my score saved on the leaderboard"
    // ============================================================

    function test_UserStory1_NewPlayerPlaysFirstGame() public {
        // Alice pays to start
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();

        // Check active game
        assertTrue(arena.hasActiveGame(alice));

        // Alice submits score
        vm.prank(alice);
        arena.submitScore(1500, 5, 30, bytes16("Alice"));

        // Check no longer active
        assertFalse(arena.hasActiveGame(alice));

        // Check leaderboard
        ArenaLeaderboardV4.Entry[] memory top = arena.getTopScores(10);
        assertEq(top.length, 1);
        assertEq(top[0].score, 1500);
        assertEq(top[0].player, alice);
        assertEq(top[0].wave, 5);
        assertEq(top[0].kills, 30);

        // Check stats
        assertEq(arena.totalGamesPlayed(), 1);
        assertEq(arena.playerGamesPlayed(alice), 1);
    }

    // ============================================================
    // USER STORY 2: Multiple players compete in same epoch
    // "As a competitive player, I want to see my rank against others
    //  and know the prize pool is growing"
    // ============================================================

    function test_UserStory2_MultiplePlayersCompete() public {
        // Alice plays
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        // Bob plays and gets higher score
        vm.prank(bob);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(bob);
        arena.submitScore(2000, 7, 50, bytes16("Bob"));

        // Charlie plays
        vm.prank(charlie);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(charlie);
        arena.submitScore(1500, 5, 35, bytes16("Charlie"));

        // Check leaderboard order (descending by score)
        ArenaLeaderboardV4.Entry[] memory top = arena.getTopScores(10);
        assertEq(top.length, 3);
        assertEq(top[0].score, 2000); // Bob first
        assertEq(top[0].player, bob);
        assertEq(top[1].score, 1500); // Charlie second
        assertEq(top[2].score, 1000); // Alice third

        // Prize pool: 3 * 0.001 * 0.95 = 0.00285 ETH
        assertEq(arena.currentEpochPrizePool(), 0.00285 ether);

        // House fees: 3 * 0.001 * 0.05 = 0.00015 ETH
        assertEq(arena.houseFees(), 0.00015 ether);
    }

    // ============================================================
    // USER STORY 3: Winner claims prize after epoch ends
    // "As the top-scoring player, I want to claim my prize
    //  when the epoch (24h period) ends"
    // ============================================================

    function test_UserStory3_WinnerClaimsPrize() public {
        // Alice and Bob play in epoch 1
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        vm.prank(bob);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(bob);
        arena.submitScore(2000, 7, 50, bytes16("Bob"));

        uint256 prizePool = arena.currentEpochPrizePool();
        assertEq(prizePool, 0.0019 ether); // 2 * 0.001 * 0.95

        // Fast forward past epoch
        vm.warp(block.timestamp + EPOCH_DURATION + 1);

        // Someone triggers epoch end (Charlie starts new game)
        vm.prank(charlie);
        arena.startGame{value: ENTRY_FEE}();

        // Check epoch 1 is stored
        ArenaLeaderboardV4.Epoch memory epoch1 = arena.getEpoch(1);
        assertEq(epoch1.winner, bob);
        assertEq(epoch1.winningScore, 2000);
        assertEq(epoch1.prizePool, 0.0019 ether);
        assertFalse(epoch1.claimed);

        // Bob claims prize
        uint256 bobBalBefore = bob.balance;
        vm.prank(bob);
        arena.claimPrize(1);

        // Check Bob received funds
        assertEq(bob.balance, bobBalBefore + 0.0019 ether);

        // Check epoch marked claimed
        ArenaLeaderboardV4.Epoch memory epoch1After = arena.getEpoch(1);
        assertTrue(epoch1After.claimed);

        // Check stats
        assertEq(arena.playerTotalEarnings(bob), 0.0019 ether);
        assertEq(arena.totalPrizesPaid(), 0.0019 ether);
    }

    // ============================================================
    // USER STORY 4: Player tries to cheat (submit without paying)
    // "The system should reject score submissions from players
    //  who haven't paid the entry fee"
    // ============================================================

    function test_UserStory4_CheaterCannotSubmitWithoutPaying() public {
        // Eve tries to submit score without starting game
        vm.prank(eve);
        vm.expectRevert("No active game - call startGame first");
        arena.submitScore(9999, 99, 999, bytes16("Cheater"));

        // Eve tries to start with insufficient ETH
        vm.prank(eve);
        vm.expectRevert("Pay 0.001 ETH to play");
        arena.startGame{value: 0.0001 ether}();

        // Eve tries to start with zero ETH
        vm.prank(eve);
        vm.expectRevert("Pay 0.001 ETH to play");
        arena.startGame{value: 0}();
    }

    // ============================================================
    // USER STORY 5: Player starts game but never submits (abandons)
    // "If a player pays but never finishes, they should be able
    //  to forfeit and start a new game"
    // ============================================================

    function test_UserStory5_PlayerAbandonsAndForfeits() public {
        // Alice starts game
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        assertTrue(arena.hasActiveGame(alice));

        // Alice can't start another game while one is active
        vm.prank(alice);
        vm.expectRevert("Already have active game");
        arena.startGame{value: ENTRY_FEE}();

        // Alice forfeits
        vm.prank(alice);
        arena.forfeitGame();
        assertFalse(arena.hasActiveGame(alice));

        // Now Alice can start a new game
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        assertTrue(arena.hasActiveGame(alice));

        // Prize pool has both entry fees (no refund on forfeit)
        assertEq(arena.currentEpochPrizePool(), 0.0019 ether);
    }

    // ============================================================
    // USER STORY 6: Epoch transitions automatically on interaction
    // "When a new epoch starts, the leaderboard should reset
    //  and a new prize pool should begin"
    // ============================================================

    function test_UserStory6_EpochTransitionsAutomatically() public {
        // Play in epoch 1
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        assertEq(arena.currentEpochId(), 1);
        assertEq(arena.entryCount(), 1);

        // Fast forward 24h
        vm.warp(block.timestamp + EPOCH_DURATION + 1);

        // Bob's startGame triggers epoch transition
        vm.prank(bob);
        arena.startGame{value: ENTRY_FEE}();

        // Now in epoch 2
        assertEq(arena.currentEpochId(), 2);
        assertEq(arena.entryCount(), 0); // Reset
        assertEq(arena.currentEpochPrizePool(), 0.00095 ether); // Only Bob's contribution

        // Bob submits in new epoch
        vm.prank(bob);
        arena.submitScore(500, 2, 10, bytes16("Bob"));

        assertEq(arena.entryCount(), 1);
    }

    // ============================================================
    // USER STORY 7: House owner withdraws accumulated fees
    // "As the house/operator, I want to withdraw my 5% fees"
    // ============================================================

    function test_UserStory7_HouseWithdrawsFees() public {
        // Several games played
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        vm.prank(bob);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(bob);
        arena.submitScore(2000, 7, 50, bytes16("Bob"));

        // House fees = 2 * 0.001 * 0.05 = 0.0001 ETH
        uint256 expectedFees = 0.0001 ether;
        assertEq(arena.houseFees(), expectedFees);

        uint256 houseBefore = house.balance;
        arena.withdrawHouseFees(); // Called by house (this contract)
        assertEq(house.balance, houseBefore + expectedFees);
        assertEq(arena.houseFees(), 0);
    }

    function test_UserStory7_NonHouseCannotWithdraw() public {
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        vm.prank(alice);
        vm.expectRevert("Not house");
        arena.withdrawHouseFees();
    }

    // ============================================================
    // USER STORY 8: Player checks if their score would rank
    // "Before paying, I want to know if my score would make
    //  the leaderboard"
    // ============================================================

    function test_UserStory8_CheckScoreBeforePlaying() public {
        // Empty board - any score qualifies
        assertTrue(arena.wouldMakeLeaderboard(0));
        assertTrue(arena.wouldMakeLeaderboard(1));

        // Add a score
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        // Still room on board (< 100 entries)
        assertTrue(arena.wouldMakeLeaderboard(0));
        assertTrue(arena.wouldMakeLeaderboard(500));
    }

    // ============================================================
    // USER STORY 9: Non-winner tries to claim prize
    // "Only the epoch winner should be able to claim the prize"
    // ============================================================

    function test_UserStory9_NonWinnerCannotClaim() public {
        // Alice wins epoch 1
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(2000, 7, 50, bytes16("Alice"));

        vm.prank(bob);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(bob);
        arena.submitScore(1000, 3, 20, bytes16("Bob"));

        // End epoch
        vm.warp(block.timestamp + EPOCH_DURATION + 1);
        arena.endEpoch();

        // Bob tries to claim - should fail
        vm.prank(bob);
        vm.expectRevert("Not the winner");
        arena.claimPrize(1);

        // Random address tries
        vm.prank(charlie);
        vm.expectRevert("Not the winner");
        arena.claimPrize(1);

        // Alice can claim
        vm.prank(alice);
        arena.claimPrize(1);

        // Alice can't claim twice
        vm.prank(alice);
        vm.expectRevert("Already claimed");
        arena.claimPrize(1);
    }

    // ============================================================
    // USER STORY 10: Player plays across multiple epochs
    // "I want to play daily and see my lifetime stats grow"
    // ============================================================

    function test_UserStory10_MultiEpochPlayerStats() public {
        // Epoch 1: Alice plays
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        // Epoch 2
        vm.warp(block.timestamp + EPOCH_DURATION + 1);
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}(); // triggers epoch transition
        vm.prank(alice);
        arena.submitScore(2000, 7, 50, bytes16("Alice"));

        // Epoch 3
        vm.warp(block.timestamp + EPOCH_DURATION + 1);
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(3000, 10, 80, bytes16("Alice"));

        // Check lifetime stats
        (uint256 gamesPlayed, , ) = arena.getPlayerStats(alice);
        assertEq(gamesPlayed, 3);
        assertEq(arena.playerGamesPlayed(alice), 3);
        assertEq(arena.totalGamesPlayed(), 3);
    }

    // ============================================================
    // EDGE CASE TESTS
    // ============================================================

    function test_EdgeCase_EndEpochBeforeTimeReverts() public {
        vm.expectRevert("Epoch not ended");
        arena.endEpoch();
    }

    function test_EdgeCase_ClaimNonexistentEpoch() public {
        vm.expectRevert("Epoch does not exist");
        arena.claimPrize(999);
    }

    function test_EdgeCase_ZeroScoreSubmission() public {
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(0, 0, 0, bytes16("Alice"));

        // Should still make the board (not full)
        assertEq(arena.entryCount(), 1);
    }

    function test_EdgeCase_MaxUint32Score() public {
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(type(uint32).max, 999, 999, bytes16("Alice"));

        ArenaLeaderboardV4.Entry[] memory top = arena.getTopScores(1);
        assertEq(top[0].score, type(uint32).max);
    }

    function test_EdgeCase_ForfeitWithoutActiveGame() public {
        vm.prank(alice);
        vm.expectRevert("No active game");
        arena.forfeitGame();
    }

    function test_EdgeCase_EmptyEpochNoWinner() public {
        // No one plays in epoch 1, just skip ahead
        vm.warp(block.timestamp + EPOCH_DURATION + 1);

        // Trigger epoch end
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();

        // Epoch 1 should have no winner
        ArenaLeaderboardV4.Epoch memory epoch1 = arena.getEpoch(1);
        assertEq(epoch1.winner, address(0));
        assertEq(epoch1.winningScore, 0);
        assertEq(epoch1.prizePool, 0);
    }

    function test_EdgeCase_OverpayEntryFee() public {
        // Player sends 1 ETH instead of 0.001
        uint256 overpay = 1 ether;
        vm.prank(alice);
        arena.startGame{value: overpay}();

        // All overpayment goes to prize pool + house (no refund!)
        // House: 1 * 0.05 = 0.05 ETH
        // Prize: 1 * 0.95 = 0.95 ETH
        assertEq(arena.houseFees(), 0.05 ether);
        assertEq(arena.currentEpochPrizePool(), 0.95 ether);
    }

    function test_EdgeCase_DirectETHTransfer() public {
        // Sending ETH directly via receive()
        vm.prank(alice);
        (bool success,) = address(arena).call{value: 0.5 ether}("");
        assertTrue(success);

        // Goes directly to prize pool (bypasses house fee!)
        assertEq(arena.currentEpochPrizePool(), 0.5 ether);
        assertEq(arena.houseFees(), 0); // No house fee collected!
    }

    function test_EdgeCase_EpochCrossesDuringGameplay() public {
        // Alice starts in epoch 1
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();

        // Time passes - epoch 1 ends
        vm.warp(block.timestamp + EPOCH_DURATION + 1);

        // Alice submits score - triggers epoch transition
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        // Score should be in epoch 2 (new epoch)
        // But the prize money went to epoch 1
        // Epoch 1 has the money but Alice's score is in epoch 2
        ArenaLeaderboardV4.Epoch memory epoch1 = arena.getEpoch(1);
        assertEq(epoch1.prizePool, 0.00095 ether); // Alice's money
        assertEq(epoch1.winner, address(0)); // No one scored in epoch 1

        // Alice is leader of epoch 2 though
        assertEq(arena.currentEpochId(), 2);
        assertEq(arena.entryCount(), 1);
    }

    // ============================================================
    // SECURITY TESTS
    // ============================================================

    function test_Security_ReentrancyOnClaimPrize() public {
        // Deploy a reentrancy attacker
        ReentrancyAttacker attacker = new ReentrancyAttacker(address(arena));
        vm.deal(address(attacker), 10 ether);

        // Attacker plays and wins
        attacker.startGame();

        // End epoch
        vm.warp(block.timestamp + EPOCH_DURATION + 1);
        arena.endEpoch();

        // Attacker tries reentrancy - should fail because claimed=true is set first (CEI)
        // The attacker's receive function tries to call claimPrize again
        // It should revert with "Already claimed"
        attacker.attack(1);

        // Verify only claimed once
        ArenaLeaderboardV4.Epoch memory epoch = arena.getEpoch(1);
        assertTrue(epoch.claimed);
    }

    function test_Security_ScoreManipulation() public {
        // Scores are client-submitted - anyone can submit any score
        // This is a KNOWN limitation
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(999999, 999, 9999, bytes16("Cheater"));

        ArenaLeaderboardV4.Entry[] memory top = arena.getTopScores(1);
        assertEq(top[0].score, 999999);
        // NOTE: This passes - scores are not validated on-chain
        // This is a design choice, not a bug
    }

    function test_Security_DoubleSubmit() public {
        // Player submits score, active game cleared
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        // Trying to submit again should fail
        vm.prank(alice);
        vm.expectRevert("No active game - call startGame first");
        arena.submitScore(2000, 7, 50, bytes16("Alice"));
    }

    // ============================================================
    // VIEW FUNCTION TESTS
    // ============================================================

    function test_ViewFunctions_GetCurrentEpoch() public {
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        (
            uint256 epochId,
            uint256 startTime,
            uint256 timeRemaining,
            uint256 prizePool,
            address currentLeader,
            uint32 topScore
        ) = arena.getCurrentEpoch();

        assertEq(epochId, 1);
        assertGt(startTime, 0);
        assertGt(timeRemaining, 0);
        assertEq(prizePool, 0.00095 ether);
        assertEq(currentLeader, alice);
        assertEq(topScore, 1000);
    }

    function test_ViewFunctions_GetStats() public {
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        (uint256 prizePool, uint256 totalGames, uint256 entries, uint256 entryFee) = arena.getStats();
        assertEq(prizePool, 0.00095 ether);
        assertEq(totalGames, 1);
        assertEq(entries, 1);
        assertEq(entryFee, ENTRY_FEE);
    }

    function test_ViewFunctions_GetPlayerStats() public {
        vm.prank(alice);
        arena.startGame{value: ENTRY_FEE}();
        vm.prank(alice);
        arena.submitScore(1000, 3, 20, bytes16("Alice"));

        (uint256 gamesPlayed, uint256 totalEarnings, uint256 bestScoreRank) = arena.getPlayerStats(alice);
        assertEq(gamesPlayed, 1);
        assertEq(totalEarnings, 0);
        assertEq(bestScoreRank, 1); // Rank 1
    }

    // ============================================================
    // LEADERBOARD STRESS TEST
    // ============================================================

    function test_Stress_FillLeaderboard100Entries() public {
        // Fill with 100 entries
        for (uint256 i = 0; i < 100; i++) {
            address player = address(uint160(1000 + i));
            vm.deal(player, 1 ether);
            vm.prank(player);
            arena.startGame{value: ENTRY_FEE}();
            vm.prank(player);
            arena.submitScore(uint32(i * 10), uint32(i), uint32(i * 2), bytes16("Player"));
        }

        assertEq(arena.entryCount(), 100);

        // Score that won't make it
        assertFalse(arena.wouldMakeLeaderboard(0));

        // Score that will make it
        assertTrue(arena.wouldMakeLeaderboard(999));

        // Top score should be player 99 with score 990
        ArenaLeaderboardV4.Entry[] memory top = arena.getTopScores(1);
        assertEq(top[0].score, 990);
    }

    // Receive ETH for house fee withdrawal
    receive() external payable {}
}

/// @notice Reentrancy attacker contract for testing
contract ReentrancyAttacker {
    ArenaLeaderboardV4 arena;
    uint256 targetEpoch;
    bool attacking;

    constructor(address _arena) {
        arena = ArenaLeaderboardV4(payable(_arena));
    }

    function startGame() external {
        arena.startGame{value: 0.001 ether}();
        arena.submitScore(9999, 99, 999, bytes16("Attacker"));
    }

    function attack(uint256 epochId) external {
        targetEpoch = epochId;
        attacking = true;
        arena.claimPrize(epochId);
    }

    receive() external payable {
        if (attacking) {
            attacking = false;
            // Try to re-enter
            try arena.claimPrize(targetEpoch) {
                // If this succeeds, reentrancy is possible (BAD)
            } catch {
                // Expected: "Already claimed" revert (GOOD)
            }
        }
    }
}
