// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Arena Survival Leaderboard
/// @notice On-chain leaderboard for Arena Survival roguelike game
/// @dev Optimized for MegaETH: fixed-size array (no SSTORE for new slots),
///      block.timestamp accessed at end to avoid volatile data limits
contract ArenaLeaderboard {

    uint256 public constant MAX_ENTRIES = 100;

    struct Entry {
        address player;
        uint32 score;
        uint32 wave;
        uint32 kills;
        uint32 timestamp;
        bytes16 name; // packed player name (16 chars max)
    }

    // Fixed-size array - all slots pre-allocated, avoids expensive SSTORE 0→non-zero
    Entry[100] public leaderboard;
    uint256 public entryCount;

    // Track minimum score on board for quick rejection
    uint256 public minScoreOnBoard;
    uint256 public minScoreIndex;

    // Events
    event ScoreSubmitted(address indexed player, uint256 score, uint256 wave, uint256 kills, uint256 rank);
    event LeaderboardUpdated(uint256 newMinScore);

    /// @notice Submit a score to the leaderboard
    /// @param score The player's score
    /// @param wave The wave reached
    /// @param kills Total kills
    /// @param name Player name (max 16 chars, packed as bytes16)
    function submitScore(
        uint32 score,
        uint32 wave,
        uint32 kills,
        bytes16 name
    ) external {
        // Quick rejection if board is full and score is too low
        if (entryCount >= MAX_ENTRIES && score <= minScoreOnBoard) {
            revert("Score too low");
        }

        uint256 insertIndex;

        if (entryCount < MAX_ENTRIES) {
            // Board not full, find position by score (descending)
            insertIndex = _findInsertPosition(score);

            // Shift entries down
            for (uint256 i = entryCount; i > insertIndex; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }

            unchecked { entryCount++; }
        } else {
            // Board full, replace lowest score
            insertIndex = _findInsertPosition(score);

            // Shift entries down, dropping the last one
            for (uint256 i = MAX_ENTRIES - 1; i > insertIndex; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
        }

        // Access block.timestamp at the END to maximize gas budget before volatile data limit
        // MegaETH: after accessing block.timestamp, only 20M gas allowed for remaining computation
        uint32 ts = uint32(block.timestamp);

        // Insert new entry
        leaderboard[insertIndex] = Entry({
            player: msg.sender,
            score: score,
            wave: wave,
            kills: kills,
            timestamp: ts,
            name: name
        });

        // Update minimum score tracking
        if (entryCount >= MAX_ENTRIES) {
            minScoreOnBoard = leaderboard[MAX_ENTRIES - 1].score;
            minScoreIndex = MAX_ENTRIES - 1;
        }

        emit ScoreSubmitted(msg.sender, score, wave, kills, insertIndex + 1);
    }

    /// @notice Get top N entries from leaderboard
    /// @param count Number of entries to return (max 100)
    function getTopScores(uint256 count) external view returns (Entry[] memory) {
        uint256 returnCount = count > entryCount ? entryCount : count;
        Entry[] memory result = new Entry[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            result[i] = leaderboard[i];
        }

        return result;
    }

    /// @notice Get a player's best entry
    function getPlayerBest(address player) external view returns (Entry memory, uint256 rank) {
        for (uint256 i = 0; i < entryCount; i++) {
            if (leaderboard[i].player == player) {
                return (leaderboard[i], i + 1);
            }
        }
        return (Entry(address(0), 0, 0, 0, 0, bytes16(0)), 0);
    }

    /// @notice Check if a score would make the leaderboard
    function wouldMakeLeaderboard(uint32 score) external view returns (bool) {
        return entryCount < MAX_ENTRIES || score > minScoreOnBoard;
    }

    /// @notice Get current entry count
    function getEntryCount() external view returns (uint256) {
        return entryCount;
    }

    // Internal: find position for insertion (binary search for efficiency)
    function _findInsertPosition(uint32 score) internal view returns (uint256) {
        if (entryCount == 0) return 0;

        uint256 low = 0;
        uint256 high = entryCount;

        while (low < high) {
            uint256 mid = (low + high) / 2;
            if (leaderboard[mid].score >= score) {
                low = mid + 1;
            } else {
                high = mid;
            }
        }

        return low;
    }
}
