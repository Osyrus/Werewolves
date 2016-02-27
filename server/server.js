Meteor.startup(function () {
  // Create the fake players for testing
  Players.remove({});

  addTestPlayer("Fred", 1);
  addTestPlayer("Steve", 1);
  addTestPlayer("Bob", 2);
  addTestPlayer("Gary", 0);

  // Create the roles
  Roles.remove({});

  addRole("Villager", true, false);
  addRole("Werewolf", true, true);
  addRole("Doctor", false, false);
  addRole("Witch", false, true);
  addRole("Seer", false, false);
  addRole("Knight", false, false);
  addRole("Saint", false, true);

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
  GameVariables.insert({_id: "voteTally", name: "The votes for and against are stored here", value: {for: 0, against: 0}, enabled: false});
  GameVariables.insert({_id: "timeToVoteExecution", name: "Seconds until the vote result is executed", value: 0, enabled: false});
  GameVariables.insert({_id: "timeToVoteTimeout", name: "Seconds until the vote times out and the lynch fails", value: 0, enabled: false});
  GameVariables.insert({_id: "voteDirection", name: "The direction the vote should be executed. value: for/against (true/false)", value: false, enabled: false});
  GameVariables.insert({_id: "lastGameResult", name: "The last games result", value: {villagersWon: false}, enabled: false});
  GameVariables.insert({_id: "timeToKill", name: "Seconds until the werewolves make the kill", value: 0, enabled: false});

  // These server check things may be rubbish that should not exist

  ServerChecks.remove({});

  ServerChecks.insert({_id: "allReady", value: false});

  // The default game settings
  // Eventually make it so that these don't get reset each time
  // These will be modifiable via a settings menu

  GameSettings.remove({});

  GameSettings.insert({_id: "doubleJeopardy", enabled: false});
  GameSettings.insert({_id: "revealRole", day: true, night: true});
  GameSettings.insert({_id: "timeDelays", timeout: 60100, countdown: 5100});
});

// Note: The order that the roles are added will determine their tiebreaker order (when counting votes)
function addRole(name, critical, aggressive) {
  var description = "";

  // This is a short description used for giving the gist of the role
  switch(name) {
    case "Villager":
      description = "The Villager is the basic role that has no active abilities.";
      break;
    case "Werewolf":
      description = "The Werewolf is the role that is against the villagers, and can kill people at night.";
      break;
    case "Doctor":
      description = "The Doctor is a active villager role that can save people at night from Werewolves.";
      break;
    case "Seer":
      description = "The Seer is an active villager role that can check for werewolves at night.";
      break;
    case "Knight":
      description = "The Knight is a passive villager role that cannot be killed by werewolves at night";
      break;
    case "Saint":
      description = "The Saint is a passive villager role that, if lynched, takes the nominator with them.";
      break;
    default:
      description = "This role does not have a description written for it yet.";
  }

  Roles.insert({
    name: name,
    votes: 0,
    enabled: critical,
    critical: critical,
    aggressive: aggressive,
    target: 0,
    shortDescription: description
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
    doNothing: true,
    seenNewEvents: false,
    seenNightResults: true,
    nightActionDone: true,
    effect: "none",
    bot: true,
    target: 0
  });
}