// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.26;
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EventCreator is ReentrancyGuard{

    error TooLow(uint sent, uint required);
    error TooMuch(uint sent, uint required);
    error AlreadyRegistered(address participant);

    struct Event {
        string name;
        uint256 registrationFee;
        uint256 maxParticipants;
        uint256 deadline;
        address payable organizer;
        bool isOpen;
        address[] participants;
        mapping(address => bool) hasRegistered;
    }

    mapping(uint256 => Event) public events;
    uint256 public eventCount;

    uint256 public immutable defaultMaxParticipants;
    uint256 public immutable defaultRegistrationFee;

    constructor() {

        defaultMaxParticipants = 10;
        defaultRegistrationFee = 0.05 ether;
    }

    modifier  onlyOrganizer(uint256 _eventId) {
        require(events[_eventId].organizer == msg.sender, "Only the organizer can perform this action");
        _;
    } 

     modifier eventIsOpen(uint256 _eventId) {
        require(events[_eventId].isOpen, "Registration is closed.");
        require(block.timestamp < events[_eventId].deadline, "Registration deadline has passed.");
        require(events[_eventId].participants.length < events[_eventId].maxParticipants, "Max participants reached.");
        _;
    }

    event eventCreated(uint256 eventId, address organizer);
    event participantRegistered(uint256 eventId, address participant);
    event FallbackTriggered(address from, uint256 amount, bytes data);

    function createEvent(
        string memory _name,
        uint256 _deadline
    ) public {
        require(_deadline > block.timestamp, "Deadline must be in the future.");

        Event storage newEvent = events[eventCount];
        newEvent.name = _name;
        newEvent.registrationFee = defaultRegistrationFee;
        newEvent.maxParticipants = defaultMaxParticipants;
        newEvent.deadline = _deadline;
        newEvent.organizer = payable(msg.sender);
        newEvent.isOpen = true;

        emit eventCreated(eventCount, msg.sender);

        eventCount++;
    }

    function openRegistration(uint256 _eventId) public onlyOrganizer(_eventId) {
        require(!events[_eventId].isOpen, "Registration is already open.");
        require(block.timestamp < events[_eventId].deadline, "Cannot reopen: Deadline has passed.");
        require(events[_eventId].participants.length < events[_eventId].maxParticipants, "Cannot reopen: Max participants reached.");
        events[_eventId].isOpen = true;
    }

    function closeRegistration(uint256 _eventId) public onlyOrganizer(_eventId) {
        require(events[_eventId].isOpen, "Registration is already closed.");
        events[_eventId].isOpen = false;
    }

    function register(uint256 _eventId) public payable eventIsOpen(_eventId) {
        Event storage _event = events[_eventId];

        require(msg.sender != _event.organizer, "Organizer cannot register for their own event.");
         require(!_event.hasRegistered[msg.sender], "Address has already registered for this event.");
     
        if (msg.value > _event.registrationFee) {
            revert TooMuch(msg.value, _event.registrationFee);
        }

          if (msg.value < _event.registrationFee) {
            revert TooLow(msg.value, _event.registrationFee);
        }

        assert(_event.participants.length <= _event.maxParticipants);

        emit participantRegistered(_eventId, msg.sender);

        _event.hasRegistered[msg.sender] = true;
        _event.participants.push(msg.sender);

        if (_event.participants.length >= _event.maxParticipants) {
            _event.isOpen = false;
        }
    }

    function getParticipants(uint256 _eventId) public view returns (address[] memory) {
        return events[_eventId].participants;
    }

    function withdraw(uint256 _eventId) public onlyOrganizer(_eventId) nonReentrant {
        Event storage _event = events[_eventId];
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds available to withdraw.");
        require(!events[_eventId].isOpen, "Event is still open.");


        _event.organizer.transfer(balance);
    }

        receive() external payable {
    revert("This contract does not accept Ether");
}

    fallback() external payable {
        emit FallbackTriggered(msg.sender, msg.value, msg.data);
        revert("Fallback Function");
    }

}
