// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";




contract GasTravel is NonblockingLzApp {

    uint public _baseFee;

    

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
        _baseFee = 200000;
    }

    function setBaseFee(uint _newBaseFee) external onlyOwner {
        _baseFee = _newBaseFee;
    }

    function estimateTravelCost(uint16 _dstChainId, uint _amount) public view virtual returns (uint nativeFee, uint zroFee) {
        return lzEndpoint.estimateFees(_dstChainId, address(this), abi.encode(0), false, _getAdapterParams(_amount));
    }

    function travelWithGas(uint16 _dstChainId, uint _amount) public payable virtual {
        (uint nativeFee,) = estimateTravelCost(_dstChainId, _amount);
        require(msg.value >= nativeFee, "Given gas is not enough to send");
        
        _lzSend(_dstChainId, abi.encode(0), payable(owner()), address(0x0), _getAdapterParams(_amount), nativeFee);
    }

    function quit() external payable onlyOwner {
        require(address(this).balance > 0, "Balance is empty");
        (bool done, ) = payable(owner()).call{value: address(this).balance}("");
        require(done, "Failed to withdraw!");
    }

    function _getAdapterParams(uint _amount) internal view returns(bytes memory) {
        return abi.encodePacked(uint16(2), _baseFee, _amount, msg.sender);
    }
    
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal virtual override {}

}

