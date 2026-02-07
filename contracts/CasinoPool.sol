// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract CasinoPool {

    IERC20 public token;
    address public owner;

    /* ================= TOKEN SETTINGS ================= */
    uint public rate = 2000; // 1 ETH = 2000 ROYAL
    uint public constant TOKEN_DECIMALS = 1e18; // 18 decimals

    /* ================= EVENTS ================= */

    event RoyalBought(address indexed user, uint ethAmount, uint royalAmount);

    event CoinFlipPlayed(
        address indexed player,
        uint256 amount,
        bool side,
        bool result,
        bool win
    );

    event RoulettePlayed(
        address indexed player,
        uint256 amount,
        uint8 betType,
        uint8 chosen,
        uint8 result,
        bool win
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor(address _token) {
        require(_token != address(0), "Zero token");
        token = IERC20(_token);
        owner = msg.sender;
    }

    /* ================= BUY ROYAL ================= */

    function buyRoyal() external payable {
        require(msg.value > 0, "Send ETH");

        // msg.value в wei → переводим в ETH и умножаем на rate и decimals токена
        uint royalAmount = (msg.value * rate * TOKEN_DECIMALS) / 1 ether;

        require(royalAmount > 0, "Too small ETH");
        require(token.balanceOf(address(this)) >= royalAmount, "Pool empty");
        require(token.transfer(msg.sender, royalAmount), "Transfer failed");

        emit RoyalBought(msg.sender, msg.value, royalAmount);
    }

    /* ================= WITHDRAW ETH ================= */

    function withdrawETH() external onlyOwner {
        uint bal = address(this).balance;
        require(bal > 0, "No ETH");
        payable(owner).transfer(bal);
    }

    /* ================= RANDOM ================= */
    // Только для тестнета!
    function _random(uint mod) internal view returns (uint) {
        return uint(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    block.prevrandao,
                    msg.sender,
                    address(this)
                )
            )
        ) % mod;
    }

    /* ================= COIN FLIP ================= */

    function placeBet(uint amount, bool side) external {
        require(amount > 0, "Bet > 0");

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        bool result = _random(2) == 0;
        bool win = (result == side);

        if (win) {
            uint reward = amount * 2;

            require(token.balanceOf(address(this)) >= reward, "Pool empty");
            require(token.transfer(msg.sender, reward), "Reward failed");
        }

        emit CoinFlipPlayed(msg.sender, amount, side, result, win);
    }

    /* ================= ROULETTE ================= */

    function placeRoulette(
        uint amount,
        uint8 betType,
        uint8 chosen
    ) external {

        require(amount > 0, "Bet > 0");
        require(betType <= 4, "Invalid bet");

        if (betType == 0) {
            require(chosen <= 36, "0-36 only");
        }

        require(
            token.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        uint8 result = uint8(_random(37));
        bool win = false;
        uint reward = 0;

        if (betType == 0) {
            win = (result == chosen);
            reward = amount * 36;
        } 
        else if (betType == 1) {
            win = _isRed(result);
            reward = amount * 2;
        } 
        else if (betType == 2) {
            win = _isBlack(result);
            reward = amount * 2;
        } 
        else if (betType == 3) {
            win = result != 0 && result % 2 == 0;
            reward = amount * 2;
        } 
        else if (betType == 4) {
            win = result != 0 && result % 2 == 1;
            reward = amount * 2;
        }

        if (win) {
            require(token.balanceOf(address(this)) >= reward, "Pool empty");
            require(token.transfer(msg.sender, reward), "Reward failed");
        }

        emit RoulettePlayed(
            msg.sender,
            amount,
            betType,
            chosen,
            result,
            win
        );
    }

    /* ================= COLORS ================= */

    function _isRed(uint8 n) internal pure returns (bool) {
        return (
            n==1||n==3||n==5||n==7||n==9||
            n==12||n==14||n==16||n==18||
            n==19||n==21||n==23||n==25||
            n==27||n==30||n==32||n==34||n==36
        );
    }

    function _isBlack(uint8 n) internal pure returns (bool) {
        return (
            n==2||n==4||n==6||n==8||n==10||
            n==11||n==13||n==15||n==17||
            n==20||n==22||n==24||n==26||
            n==28||n==29||n==31||n==33||n==35
        );
    }
}