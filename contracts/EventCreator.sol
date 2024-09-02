// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.26;

contract EventRegistration {

    struct Event {
        string name;
        uint256 registrationFee;
        uint256 maxParticipants;
        uint256 deadline;
        address payable organizer;
        bool isOpen;
        address[] participants;
    }
}