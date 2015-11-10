Meteor.startup(function () {
  // Create the fake players for testing
  Players.remove({});

  addTestPlayer("Fred");
  addTestPlayer("Steve");
  addTestPlayer("Bob");

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

function addTestPlayer(name) {
  Players.insert({
    userId: 7,
    name: name,
    role: 0,
    status: 0,
    alive: true,
    joined: true,
    ready: true
  });
}