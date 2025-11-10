// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract VotingSystem {
    struct Candidate {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    // State variables
    address public owner;
    address public admin;
    address public constant CANDIDATE_MANAGER = 0xe80b4B815428f337d8713da553FA183e4704012A;
    uint256 public candidateCounter;
    uint256 public votingStartTime;
    uint256 public votingEndTime;
    bool public votingPeriodSet;

    // Mappings
    mapping(uint256 => Candidate) public candidates;
    mapping(address => bool) public hasVotedMapping;
    mapping(uint256 => bool) public candidateExists;

    // Arrays
    uint256[] public candidateIds;

    // Events
    event CandidateAdded(uint256 indexed candidateId, string name);
    event VoteCast(address indexed voter, uint256 indexed candidateId);
    event VotingPeriodSet(uint256 startTime, uint256 endTime);
    event CandidateRemoved(uint256 indexed candidateId);
    event VotingPeriodCleared();

    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can perform this action");
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner || msg.sender == admin, "Only owner or admin can perform this action");
        _;
    }

    modifier onlyCandidateManager() {
        require(msg.sender == CANDIDATE_MANAGER, "Not authorized to add candidates");
        _;
    }

    modifier votingPeriodActive() {
        require(votingPeriodSet, "Voting period not set");
        require(block.timestamp >= votingStartTime, "Voting has not started yet");
        require(block.timestamp <= votingEndTime, "Voting has ended");
        _;
    }

    modifier candidateExistsCheck(uint256 candidateId) {
        require(candidateExists[candidateId], "Candidate does not exist");
        _;
    }

    modifier hasNotVoted() {
        require(!hasVotedMapping[msg.sender], "You have already voted");
        _;
    }

    constructor() {
        owner = msg.sender;
        admin = address(0);
        candidateCounter = 0;
        votingStartTime = 0;
        votingEndTime = 0;
        votingPeriodSet = false;
    }

    // Admin functions
    function setAdmin(address _admin) public onlyOwner {
        admin = _admin;
    }

    function addCandidate(string memory _name) public onlyCandidateManager {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        candidateCounter++;
        candidates[candidateCounter] = Candidate({
            id: candidateCounter,
            name: _name,
            voteCount: 0
        });
        candidateExists[candidateCounter] = true;
        candidateIds.push(candidateCounter);
        emit CandidateAdded(candidateCounter, _name);
    }

    function removeCandidate(uint256 _candidateId) public onlyOwner candidateExistsCheck(_candidateId) {
        require(!votingPeriodSet || block.timestamp < votingStartTime || block.timestamp > votingEndTime, "Cannot remove candidate during voting period");
        // Remove from candidateIds array
        for (uint256 i = 0; i < candidateIds.length; i++) {
            if (candidateIds[i] == _candidateId) {
                candidateIds[i] = candidateIds[candidateIds.length - 1];
                candidateIds.pop();
                break;
            }
        }

        candidateExists[_candidateId] = false;
        delete candidates[_candidateId];
        emit CandidateRemoved(_candidateId);
    }

    function setVotingPeriod(uint256 _startTime, uint256 _endTime) public onlyOwner {
        require(_startTime > block.timestamp, "Start time must be in the future");
        require(_endTime > _startTime, "End time must be after start time");
        require(_endTime - _startTime >= 60, "Voting period must be at least 60 seconds");

        votingStartTime = _startTime;
        votingEndTime = _endTime;
        votingPeriodSet = true;
        emit VotingPeriodSet(_startTime, _endTime);
    }

    function clearVotingPeriod() public onlyOwnerOrAdmin {
        votingStartTime = 0;
        votingEndTime = 0;
        votingPeriodSet = false;
        emit VotingPeriodCleared();
    }

    // Voter functions
    function vote(uint256 _candidateId)
        public
        votingPeriodActive
        candidateExistsCheck(_candidateId)
        hasNotVoted
    {
        require(msg.sender != CANDIDATE_MANAGER, "Manager cannot vote");
        candidates[_candidateId].voteCount++;
        hasVotedMapping[msg.sender] = true;
        emit VoteCast(msg.sender, _candidateId);
    }

    // View functions
    function getCandidates() public view returns (uint256[] memory, string[] memory) {
        uint256[] memory ids = new uint256[](candidateIds.length);
        string[] memory names = new string[](candidateIds.length);

        for (uint256 i = 0; i < candidateIds.length; i++) {
            ids[i] = candidateIds[i];
            names[i] = candidates[candidateIds[i]].name;
        }

        return (ids, names);
    }

    function getResults() public view onlyOwner returns (uint256[] memory, string[] memory, uint256[] memory) {
        uint256[] memory ids = new uint256[](candidateIds.length);
        string[] memory names = new string[](candidateIds.length);
        uint256[] memory votes = new uint256[](candidateIds.length);

        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            ids[i] = candidateId;
            names[i] = candidates[candidateId].name;
            votes[i] = candidates[candidateId].voteCount;
        }

        return (ids, names, votes);
    }

    function getWinner() public view returns (string memory winnerName) {
        require(block.timestamp > votingEndTime || !votingPeriodSet, "Voting has not ended yet");

        if (candidateIds.length == 0) {
            return "No candidates";
        }

        uint256 maxVotes = 0;
        uint256 winnerId = 0;

        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 candidateId = candidateIds[i];
            if (candidates[candidateId].voteCount > maxVotes) {
                maxVotes = candidates[candidateId].voteCount;
                winnerId = candidateId;
            }
        }

        if (winnerId == 0) {
            return "No winner";
        }

        return candidates[winnerId].name;
    }

    function hasVoted(address _voter) public view returns (bool) {
        return hasVotedMapping[_voter];
    }

    function isVotingPeriodActive() public view returns (bool) {
        if (!votingPeriodSet) return false;
        return block.timestamp >= votingStartTime && block.timestamp <= votingEndTime;
    }

    function getVotingPeriod() public view returns (uint256 startTime, uint256 endTime, bool isActive) {
        return (votingStartTime, votingEndTime, isVotingPeriodActive());
    }

    function getCandidateCount() public view returns (uint256) {
        return candidateIds.length;
    }
}