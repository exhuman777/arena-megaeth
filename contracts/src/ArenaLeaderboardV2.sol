// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Arena Survival Leaderboard V2 - King of the Hill
/// @notice Pay to play, top player earns from challengers
/// @dev Entry fee splits: 70% prize pool, 20% to king, 10% to house
contract ArenaLeaderboardV2 {

    uint256 public constant MAX_ENTRIES = 100;
    uint256 public constant ENTRY_FEE = 0.0001 ether;
    uint256 public constant KING_CUT = 20;  // 20% to current #1
    uint256 public constant HOUSE_CUT = 10; // 10% to deployer
    uint256 public constant POOL_CUT = 70;  // 70% to prize pool

    address public immutable house; // deployer gets 10%

    struct Entry {
        address player;
        uint32 score;
        uint32 wave;
        uint32 kills;
        uint32 timestamp;
        bytes16 name;
    }

    // Leaderboard storage
    Entry[100] public leaderboard;
    uint256 public entryCount;
    uint256 public minScoreOnBoard;

    // Prize pool
    uint256 public prizePool;
    uint256 public totalGamesPlayed;

    // Earnings tracking
    mapping(address => uint256) public pendingWithdrawals;
    mapping(address => uint256) public totalEarned;

    // Current king (rank #1)
    address public currentKing;
    uint256 public kingEarnings;

    // Events
    event ScoreSubmitted(address indexed player, uint256 score, uint256 wave, uint256 rank, uint256 feePaid);
    event NewKing(address indexed player, uint256 score);
    event KingPaid(address indexed king, uint256 amount);
    event HousePaid(address indexed house, uint256 amount);
    event Withdrawal(address indexed player, uint256 amount);
    event PrizePoolUpdated(uint256 newTotal);

    constructor() {
        house = msg.sender;
    }

    /// @notice Submit a score - costs ENTRY_FEE
    function submitScore(
        uint32 score,
        uint32 wave,
        uint32 kills,
        bytes16 name
    ) external payable {
        require(msg.value >= ENTRY_FEE, "Pay entry fee");

        // Refund excess
        if (msg.value > ENTRY_FEE) {
            payable(msg.sender).transfer(msg.value - ENTRY_FEE);
        }

        totalGamesPlayed++;

        // Split the fee: 70% pool, 20% king, 10% house
        uint256 kingShare = (ENTRY_FEE * KING_CUT) / 100;
        uint256 houseShare = (ENTRY_FEE * HOUSE_CUT) / 100;
        uint256 poolShare = ENTRY_FEE - kingShare - houseShare;

        // Pay house (deployer)
        pendingWithdrawals[house] += houseShare;
        totalEarned[house] += houseShare;
        emit HousePaid(house, houseShare);

        // Pay current king (if exists and not self)
        if (currentKing != address(0) && currentKing != msg.sender) {
            pendingWithdrawals[currentKing] += kingShare;
            totalEarned[currentKing] += kingShare;
            kingEarnings += kingShare;
            emit KingPaid(currentKing, kingShare);
        } else {
            // No king or king is player - add to pool
            poolShare += kingShare;
        }

        prizePool += poolShare;
        emit PrizePoolUpdated(prizePool);

        // Check if score qualifies
        if (entryCount >= MAX_ENTRIES && score <= minScoreOnBoard) {
            // Score too low but fee already paid - that's the game!
            emit ScoreSubmitted(msg.sender, score, wave, 0, ENTRY_FEE);
            return;
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

        // Access timestamp at END (MegaETH volatile data optimization)
        uint32 ts = uint32(block.timestamp);

        leaderboard[insertIndex] = Entry({
            player: msg.sender,
            score: score,
            wave: wave,
            kills: kills,
            timestamp: ts,
            name: name
        });

        // Update min score
        if (entryCount >= MAX_ENTRIES) {
            minScoreOnBoard = leaderboard[MAX_ENTRIES - 1].score;
        }

        // Check if new king
        if (insertIndex == 0) {
            currentKing = msg.sender;
            emit NewKing(msg.sender, score);
        }

        emit ScoreSubmitted(msg.sender, score, wave, insertIndex + 1, ENTRY_FEE);
    }

    /// @notice Withdraw earnings
    function withdraw() external {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit Withdrawal(msg.sender, amount);
    }

    /// @notice Get top N entries
    function getTopScores(uint256 count) external view returns (Entry[] memory) {
        uint256 returnCount = count > entryCount ? entryCount : count;
        Entry[] memory result = new Entry[](returnCount);
        for (uint256 i = 0; i < returnCount; i++) {
            result[i] = leaderboard[i];
        }
        return result;
    }

    /// @notice Get player's pending earnings
    function getEarnings(address player) external view returns (uint256 pending, uint256 total) {
        return (pendingWithdrawals[player], totalEarned[player]);
    }

    /// @notice Get current king info
    function getKingInfo() external view returns (address king, uint256 score, uint256 earnings) {
        if (entryCount == 0) return (address(0), 0, 0);
        return (currentKing, leaderboard[0].score, kingEarnings);
    }

    /// @notice Get game stats
    function getStats() external view returns (
        uint256 _prizePool,
        uint256 _totalGames,
        uint256 _entryCount,
        uint256 _entryFee
    ) {
        return (prizePool, totalGamesPlayed, entryCount, ENTRY_FEE);
    }

    /// @notice Check if score would make leaderboard
    function wouldMakeLeaderboard(uint32 score) external view returns (bool) {
        return entryCount < MAX_ENTRIES || score > minScoreOnBoard;
    }

    /// @notice Get entry fee
    function getEntryFee() external pure returns (uint256) {
        return ENTRY_FEE;
    }

    // Internal: binary search for insert position
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
