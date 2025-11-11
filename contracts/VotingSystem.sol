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

    // Runoff & rounds
    uint256 public electionRound; // increments when a runoff starts
    mapping(address => uint256) public lastVotedRound; // round in which an address last voted

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
    event RunoffStarted(uint256[] ids, uint256 startTime, uint256 endTime, uint256 round);

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
        require(lastVotedRound[msg.sender] != electionRound, "You have already voted");
        _;
    }

    constructor() {
        owner = msg.sender;
        admin = address(0);
        candidateCounter = 0;
        votingStartTime = 0;
        votingEndTime = 0;
        votingPeriodSet = false;
        electionRound = 0;
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
        uint256 duration = _endTime - _startTime;
        require(duration >= 60, "Voting period must be at least 60 seconds");
        require(duration <= 30 days, "Voting period must be 30 days or less");

        votingStartTime = _startTime;
        votingEndTime = _endTime;
        votingPeriodSet = true;
        emit VotingPeriodSet(_startTime, _endTime);
    }

    function clearVotingPeriod() public onlyOwnerOrAdmin {
        // Reset vote counts for all currently tracked candidates
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 cid = candidateIds[i];
            if (candidateExists[cid]) {
                candidates[cid].voteCount = 0;
            }
        }
        votingStartTime = 0;
        votingEndTime = 0;
        votingPeriodSet = false;
        // Advance round so wallets become eligible to vote again in the next scheduled period
        electionRound += 1;
        emit VotingPeriodCleared();
    }

    function startRunoff(uint256[] memory idsForRunoff, uint256 _startTime, uint256 _endTime) public onlyOwnerOrAdmin {
        // Must not overlap with current active period; allow after end or when not set
        require(!votingPeriodSet || block.timestamp > votingEndTime, "Runoff can start only after the current round ends");
        require(idsForRunoff.length >= 2, "Need at least 2 candidates for runoff");
        require(_endTime > _startTime && _endTime - _startTime >= 60, "Invalid runoff window");
        // Reset candidate set to provided ids, keep their names, reset votes
        // First, mark all as not exists
        for (uint256 i = 0; i < candidateIds.length; i++) {
            candidateExists[candidateIds[i]] = false;
        }
        // Build new candidateIds
        delete candidateIds;
        for (uint256 j = 0; j < idsForRunoff.length; j++) {
            uint256 cid = idsForRunoff[j];
            require(bytes(candidates[cid].name).length > 0, "Invalid candidate id");
            candidateExists[cid] = true;
            candidates[cid].voteCount = 0;
            candidateIds.push(cid);
        }
        // Advance round so everyone can vote again
        electionRound += 1;
        votingStartTime = _startTime;
        votingEndTime = _endTime;
        votingPeriodSet = true;
        emit RunoffStarted(idsForRunoff, _startTime, _endTime, electionRound);
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
        lastVotedRound[msg.sender] = electionRound;
        hasVotedMapping[msg.sender] = true; // legacy flag
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

    function getWinners() public view returns (uint256[] memory ids, string[] memory names) {
        require(block.timestamp > votingEndTime || !votingPeriodSet, "Voting has not ended yet");
        if (candidateIds.length == 0) {
            return (new uint256[](0), new string[](0));
        }
        uint256 maxVotes = 0;
        for (uint256 i = 0; i < candidateIds.length; i++) {
            uint256 cid = candidateIds[i];
            uint256 v = candidates[cid].voteCount;
            if (v > maxVotes) maxVotes = v;
        }
        if (maxVotes == 0) {
            return (new uint256[](0), new string[](0));
        }
        // count ties
        uint256 count = 0;
        for (uint256 i2 = 0; i2 < candidateIds.length; i2++) {
            if (candidates[candidateIds[i2]].voteCount == maxVotes) count++;
        }
        ids = new uint256[](count);
        names = new string[](count);
        uint256 idx = 0;
        for (uint256 j = 0; j < candidateIds.length; j++) {
            uint256 idj = candidateIds[j];
            if (candidates[idj].voteCount == maxVotes) {
                ids[idx] = idj;
                names[idx] = candidates[idj].name;
                idx++;
            }
        }
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