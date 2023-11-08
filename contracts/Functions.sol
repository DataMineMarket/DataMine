pragma solidity 0.8.19;

contract Functions {
    address payable private immutable i_owner;

    constructor() {
        i_owner = payable(tx.origin);
    }

    function getOwner() public view returns (address) {
        return i_owner;
    }
}
