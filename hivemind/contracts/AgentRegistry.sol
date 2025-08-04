// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title AgentRegistry
 * @dev A simple registry for HiveMind agents
 */
contract AgentRegistry {
    struct Agent {
        string name;
        string description;
        string[] capabilities;
        address owner;
        uint256 fee;
        bool active;
    }

    mapping(string => Agent) public agents;
    string[] public agentIds;

    event AgentRegistered(string agentId, string name, address owner);
    event AgentUpdated(string agentId, string name, address owner);
    event AgentDeactivated(string agentId);

    /**
     * @dev Register a new agent
     * @param agentId Unique identifier for the agent
     * @param name Name of the agent
     * @param description Description of the agent
     * @param capabilities List of agent capabilities
     * @param fee Fee charged by the agent (in tinybar)
     */
    function registerAgent(
        string memory agentId,
        string memory name,
        string memory description,
        string[] memory capabilities,
        uint256 fee
    ) public {
        require(bytes(agentId).length > 0, "Agent ID cannot be empty");
        require(agents[agentId].owner == address(0), "Agent ID already registered");

        agents[agentId] = Agent({
            name: name,
            description: description,
            capabilities: capabilities,
            owner: msg.sender,
            fee: fee,
            active: true
        });

        agentIds.push(agentId);
        
        emit AgentRegistered(agentId, name, msg.sender);
    }

    /**
     * @dev Update an existing agent
     * @param agentId Unique identifier for the agent
     * @param name Name of the agent
     * @param description Description of the agent
     * @param capabilities List of agent capabilities
     * @param fee Fee charged by the agent (in tinybar)
     */
    function updateAgent(
        string memory agentId,
        string memory name,
        string memory description,
        string[] memory capabilities,
        uint256 fee
    ) public {
        require(bytes(agentId).length > 0, "Agent ID cannot be empty");
        require(agents[agentId].owner == msg.sender, "Only owner can update agent");

        agents[agentId].name = name;
        agents[agentId].description = description;
        agents[agentId].capabilities = capabilities;
        agents[agentId].fee = fee;
        
        emit AgentUpdated(agentId, name, msg.sender);
    }

    /**
     * @dev Deactivate an agent
     * @param agentId Unique identifier for the agent
     */
    function deactivateAgent(string memory agentId) public {
        require(agents[agentId].owner == msg.sender, "Only owner can deactivate agent");
        require(agents[agentId].active, "Agent already deactivated");
        
        agents[agentId].active = false;
        
        emit AgentDeactivated(agentId);
    }

    /**
     * @dev Get all agent IDs
     * @return Array of agent IDs
     */
    function getAllAgentIds() public view returns (string[] memory) {
        return agentIds;
    }

    /**
     * @dev Get agent details
     * @param agentId Unique identifier for the agent
     * @return name Name of the agent
     * @return description Description of the agent
     * @return capabilities List of agent capabilities
     * @return owner Address of the agent owner
     * @return fee Fee charged by the agent (in tinybar)
     * @return active Whether the agent is active
     */
    function getAgentDetails(string memory agentId) public view returns (
        string memory name,
        string memory description,
        string[] memory capabilities,
        address owner,
        uint256 fee,
        bool active
    ) {
        Agent storage agent = agents[agentId];
        return (
            agent.name,
            agent.description,
            agent.capabilities,
            agent.owner,
            agent.fee,
            agent.active
        );
    }
}
