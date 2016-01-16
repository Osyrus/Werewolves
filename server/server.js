Meteor.startup(function () {
  // Create the fake players for testing
  Players.remove({});

  addTestPlayer("Fred", 1);
  addTestPlayer("Steve", 1);
  addTestPlayer("Bob", 0);

  // Create the roles
  Roles.remove({});

  addRole("Villager", true);
  addRole("Werewolf", true);
  addRole("Doctor", false);
  addRole("Witch", false);
  addRole("Seer", false);
  addRole("Knight", false);
  addRole("Saint", false);

  // Clear the votes upon server restart
  RoleVotes.remove({});

  // The reactive and synced game variables
  GameVariables.remove({});

  GameVariables.insert({_id: "timeToStart", name: "Seconds until game start", value: 0, enabled: false});
  GameVariables.insert({_id: "gameMode", name: "The current game mode", value: "lobby", enabled: true});
  GameVariables.insert({_id: "rolesAssigned", name: "Have the roles been assigned to players?", value: false, enabled: true});
  GameVariables.insert({_id: "cycleNumber", name: "The current cycle number (day/night combined)", value: 0, enabled: true});
  GameVariables.insert({_id: "playersNominating", name: "An array of the players looking at the nomination selection screen", value: [], enabled: true});
  GameVariables.insert({_id: "lynchVote", name: "This is the information needed for the lynch vote, value is [target._id, nominator._id], enabled is if the vote is happening", value: [0, 0], enabled: false});
  GameVariables.insert({_id: "timeToVoteExecution", name: "Seconds until the vote result is executed", value: 0, enabled: false});
  GameVariables.insert({_id: "voteDirection", name: "The direction the vote should be executed. value: for/against (true/false)", value: false, enabled: false});
});

// Note: The order that the roles are added will determine their tiebreaker order (when counting votes)
function addRole(name, critical) {
  Roles.insert({
    name: name,
    votes: 0,
    enabled: critical,
    critical: critical
  });
}

function addTestPlayer(name, vote) {
  Players.insert({
    userId: 7,
    name: name,
    role: 0,
    status: 0,
    alive: true,
    joined: true,
    ready: true,
    voteChoice: vote,
    doNothing: false
  });
}