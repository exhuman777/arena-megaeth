// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Arena Survival Leaderboard V3
/// @notice On-chain leaderboard with daily prize pools
/// @dev Entry fee: 0.001 ETH, daily rewards to top player
///      Optimized for MegaETH: fixed-size array, block.timestamp at end
contract ArenaLeaderboardV3 {

    uint256 public constant MAX_ENTRIES = 100;
    uint256 public constant ENTRY_FEE = 0.001 ether;
    uint256 public constant EPOCH_DURATION = 24 hours;
    uint256 public constant HOUSE_FEE_BPS = 500; // 5% house fee

    struct Entry {
        address player;
        uint32 score;
        uint32 wave;
        uint32 kills;
        uint32 timestamp;
        bytes16 name;
    }

    struct Epoch {
        uint256 startTime;
        uint256 endTime;
        uint256 prizePool;
        address winner;
        uint32 winningScore;
        bool claimed;
    }

    // Current epoch leaderboard - fixed-size for gas efficiency
    Entry[100] public leaderboard;
    uint256 public entryCount;
    uint256 public minScoreOnBoard;

    // Epoch tracking
    uint256 public currentEpochId;
    mapping(uint256 => Epoch) public epochs;
    uint256 public currentEpochPrizePool;
    uint256 public currentEpochStart;

    // Stats
    uint256 public totalGamesPlayed;
    uint256 public totalPrizesPaid;
    mapping(address => uint256) public playerGamesPlayed;
    mapping(address => uint256) public playerTotalEarnings;

    // House
    address public house;
    uint256 public houseFees;

    // Events
    event GamePlayed(address indexed player, uint32 score, uint32 wave, uint32 kills, uint256 rank, uint256 epochId);
    event EpochEnded(uint256 indexed epochId, address winner, uint32 winningScore, uint256 prize);
    event PrizeClaimed(uint256 indexed epochId, address indexed winner, uint256 amount);
    event HouseFeesWithdrawn(address indexed house, uint256 amount);

    constructor() {
        house = msg.sender;
        _startNewEpoch();
    }

    /// @notice Play a game and submit score (costs 0.001 ETH)
    /// @param score The player's score
    /// @param wave The wave reached
    /// @param kills Total kills
    /// @param name Player name (max 16 chars)
    function playGame(
        uint32 score,
        uint32 wave,
        uint32 kills,
        bytes16 name
    ) external payable {
        require(msg.value >= ENTRY_FEE, "Pay 0.001 ETH to play");

        // Check if epoch has ended
        if (block.timestamp >= currentEpochStart + EPOCH_DURATION) {
            _endCurrentEpoch();
            _startNewEpoch();
        }

        // Calculate fees
        uint256 houseCut = (msg.value * HOUSE_FEE_BPS) / 10000;
        uint256 prizeContribution = msg.value - houseCut;

        houseFees += houseCut;
        currentEpochPrizePool += prizeContribution;

        // Update stats
        totalGamesPlayed++;
        playerGamesPlayed[msg.sender]++;

        // Update leaderboard
        uint256 rank = _updateLeaderboard(score, wave, kills, name);

        emit GamePlayed(msg.sender, score, wave, kills, rank, currentEpochId);
    }

    /// @notice Claim prize for a completed epoch (only winner can claim)
    function claimPrize(uint256 epochId) external {
        Epoch storage epoch = epochs[epochId];
        require(epoch.endTime > 0, "Epoch does not exist");
        require(!epoch.claimed, "Already claimed");
        require(epoch.winner == msg.sender, "Not the winner");
        require(epoch.prizePool > 0, "No prize");

        epoch.claimed = true;
        uint256 prize = epoch.prizePool;

        playerTotalEarnings[msg.sender] += prize;
        totalPrizesPaid += prize;

        (bool success, ) = msg.sender.call{value: prize}("");
        require(success, "Transfer failed");

        emit PrizeClaimed(epochId, msg.sender, prize);
    }

    /// @notice End current epoch and distribute prizes
    function endEpoch() external {
        require(block.timestamp >= currentEpochStart + EPOCH_DURATION, "Epoch not ended");
        _endCurrentEpoch();
        _startNewEpoch();
    }

    /// @notice Withdraw accumulated house fees
    function withdrawHouseFees() external {
        require(msg.sender == house, "Not house");
        uint256 amount = houseFees;
        houseFees = 0;

        (bool success, ) = house.call{value: amount}("");
        require(success, "Transfer failed");

        emit HouseFeesWithdrawn(house, amount);
    }

    /// @notice Get top N entries from current epoch leaderboard
    function getTopScores(uint256 count) external view returns (Entry[] memory) {
        uint256 returnCount = count > entryCount ? entryCount : count;
        Entry[] memory result = new Entry[](returnCount);

        for (uint256 i = 0; i < returnCount; i++) {
            result[i] = leaderboard[i];
        }

        return result;
    }

    /// @notice Get current epoch info
    function getCurrentEpoch() external view returns (
        uint256 epochId,
        uint256 startTime,
        uint256 timeRemaining,
        uint256 prizePool,
        address currentLeader,
        uint32 topScore
    ) {
        epochId = currentEpochId;
        startTime = currentEpochStart;

        uint256 endTime = currentEpochStart + EPOCH_DURATION;
        timeRemaining = block.timestamp >= endTime ? 0 : endTime - block.timestamp;

        prizePool = currentEpochPrizePool;

        if (entryCount > 0) {
            currentLeader = leaderboard[0].player;
            topScore = leaderboard[0].score;
        }
    }

    /// @notice Get epoch history
    function getEpoch(uint256 epochId) external view returns (Epoch memory) {
        return epochs[epochId];
    }

    /// @notice Get player stats
    function getPlayerStats(address player) external view returns (
        uint256 gamesPlayed,
        uint256 totalEarnings,
        uint256 bestScoreRank
    ) {
        gamesPlayed = playerGamesPlayed[player];
        totalEarnings = playerTotalEarnings[player];

        // Find best rank on current board
        bestScoreRank = 0;
        for (uint256 i = 0; i < entryCount; i++) {
            if (leaderboard[i].player == player) {
                bestScoreRank = i + 1;
                break;
            }
        }
    }

    /// @notice Check if score would make leaderboard
    function wouldMakeLeaderboard(uint32 score) external view returns (bool) {
        return entryCount < MAX_ENTRIES || score > minScoreOnBoard;
    }

    /// @notice Get entry fee
    function getEntryFee() external pure returns (uint256) {
        return ENTRY_FEE;
    }

    /// @notice Get game stats
    function getStats() external view returns (
        uint256 prizePool,
        uint256 totalGames,
        uint256 entries,
        uint256 entryFee
    ) {
        return (currentEpochPrizePool, totalGamesPlayed, entryCount, ENTRY_FEE);
    }

    // ============ Internal Functions ============

    function _updateLeaderboard(
        uint32 score,
        uint32 wave,
        uint32 kills,
        bytes16 name
    ) internal returns (uint256 rank) {
        // Quick rejection if board is full and score is too low
        if (entryCount >= MAX_ENTRIES && score <= minScoreOnBoard) {
            return 0; // Didn't make the board
        }

        uint256 insertIndex;

        if (entryCount < MAX_ENTRIES) {
            insertIndex = _findInsertPosition(score);
            for (uint256 i = entryCount; i > insertIndex; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
            unchecked { entryCount++; }
        } else {
            insertIndex = _findInsertPosition(score);
            for (uint256 i = MAX_ENTRIES - 1; i > insertIndex; i--) {
                leaderboard[i] = leaderboard[i - 1];
            }
        }

        // Access block.timestamp at END (MegaETH optimization)
        uint32 ts = uint32(block.timestamp);

        leaderboard[insertIndex] = Entry({
            player: msg.sender,
            score: score,
            wave: wave,
            kills: kills,
            timestamp: ts,
            name: name
        });

        if (entryCount >= MAX_ENTRIES) {
            minScoreOnBoard = leaderboard[MAX_ENTRIES - 1].score;
        }

        return insertIndex + 1;
    }

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

    function _endCurrentEpoch() internal {
        Epoch storage epoch = epochs[currentEpochId];
        epoch.endTime = block.timestamp;
        epoch.prizePool = currentEpochPrizePool;

        if (entryCount > 0) {
            epoch.winner = leaderboard[0].player;
            epoch.winningScore = leaderboard[0].score;
        }

        emit EpochEnded(currentEpochId, epoch.winner, epoch.winningScore, epoch.prizePool);
    }

    function _startNewEpoch() internal {
        currentEpochId++;
        currentEpochStart = block.timestamp;
        currentEpochPrizePool = 0;

        // Reset leaderboard
        entryCount = 0;
        minScoreOnBoard = 0;

        epochs[currentEpochId].startTime = block.timestamp;
    }

    // Allow contract to receive ETH
    receive() external payable {
        currentEpochPrizePool += msg.value;
    }
}
