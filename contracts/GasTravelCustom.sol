// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@layerzerolabs/solidity-examples/contracts/lzApp/NonblockingLzApp.sol";




contract GasTravelCustom is NonblockingLzApp {

    uint public _baseFee;
    

    constructor(address _lzEndpoint) NonblockingLzApp(_lzEndpoint) {
        _baseFee = 200000;
    }

    function setBaseFee(uint _newBaseFee) external onlyOwner {
        _baseFee = _newBaseFee;
    }


    function estimateTravelCost(uint16 _dstChainId, uint _amount, address _customReceiver) public view virtual returns (uint nativeFee, uint zroFee) {
        return lzEndpoint.estimateFees(_dstChainId, address(this), abi.encode(0), false, _getAdapterParams(_amount, _customReceiver));
    }

    function travelWithGas(uint16 _dstChainId, uint _amount, address _customReceiver) public payable virtual {
        (uint nativeFee,) = estimateTravelCost(_dstChainId, _amount, _customReceiver);
        require(msg.value >= nativeFee, "Not enough gas to send");
        
        _lzSend(_dstChainId, abi.encode(0), payable(owner()), address(0x0), _getAdapterParams(_amount, _customReceiver), nativeFee);
    }

    function quit() external payable onlyOwner {
        require(address(this).balance > 0, "No balance to withdraw");
        (bool done, ) = payable(owner()).call{value: address(this).balance}("");
        require(done, "Cannot withdraw!");
    }

    function _getAdapterParams(uint _amount, address _customReceiver) internal view returns(bytes memory) {
        return abi.encodePacked(uint16(2), _baseFee, _amount, _customReceiver);
    }
    
    function _nonblockingLzReceive(uint16 _srcChainId, bytes memory _srcAddress, uint64 _nonce, bytes memory _payload) internal virtual override {}

}

