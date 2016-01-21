// These are the dependency trackers to make sure things are reactive
var votesDep = new Tracker.Dependency;
var startDep = new Tracker.Dependency;

nightViewDep = new Tracker.Dependency;

Template.body.helpers({
  players: function() {
    return Players.find({joined: true});
  },

  roles: function() {
    return Roles.find({critical: false});
  },

  playerCounter: function() {
    var playersTotal = Players.find({joined: true}).count();
    var playersReady = Players.find({ready: true}).count();

    return String(playersReady) + "/" + String(playersTotal);
  },

  joined: function() {
    var player = Players.findOne({userId: Meteor.user()._id});
    return player != undefined ? player.joined : false;
  },

  ready: function() {
    var player = Players.findOne({userId: Meteor.user()._id});

    return player.ready;
  },

  allReady: function() {
    return allReady();
  },

  counting: function() {
    startDep.depend();

    if (TimeSync.serverTime() <= GameVariables.findOne("timeToStart").value) {
      return true;
    }

    if (GameVariables.findOne("timeToStart").enabled) {
      console.log("Calling start game method");
      Meteor.call("startGame");
    }

    return false;
  },
  countdown: function() {
    startDep.depend();

    var timeToStart = GameVariables.findOne("timeToStart").value;

    if (TimeSync.serverTime() <= timeToStart) {
      return Math.floor((timeToStart - TimeSync.serverTime())/1000);// Convert to seconds from ms
    }

    return 0;
  },

  // These are the helpers that tell the html which screen to show
  lobby: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    if (Meteor.user() != null) {
      var player = Players.findOne({userId: Meteor.user()._id});

      if (player == undefined) {
        return true;
      } else if (!player.joined) {
        return true;
      } else {
        return currentGameMode == "lobby";
      }
    } else {
      return true;
    }
  },
  inGame: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    return currentGameMode == "inGame";
  },
  whoAmIScreen: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    if (currentGameMode == "inGame") {
      return !Session.get("seenRole");
    }

    return false;
  }
});

Template.body.events({
  "click .join-game": function() {
    if (GameVariables.findOne("gameMode").value == "lobby") {
      var player = getPlayer();

      if (player) {
        Players.update(player._id, {$set: {joined: true}});
      } else {
        Meteor.call("addPlayer", Meteor.user());
      }

      // Reset the start game countdown
      GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
      Session.set("seenRole", false);

      // As the enabled roles vote count is dependant on the number of people, we need to do a recount.
      countVotes();
    }
  },
  "click .leave-game": function() {
    var player = getPlayer();
    Players.update(player._id, {$set: {joined: false}});
    Players.update(player._id, {$set: {ready: false}});

    // Reset the start game countdown
    GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});

    // Number of people in the game changed, so need a recount
    countVotes();
  },

  "click .set-ready": function() {
    var player = getPlayer();
    Players.update(player._id, {$set: {ready: true}});
  },
  "click .set-nready": function() {
    var player = getPlayer();
    Players.update(player._id, {$set: {ready: false}});

    // Reset the start game countdown
    GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
  },

  "click .start-game": function() {
    if (allReady()) {
      if (TimeSync.isSynced()) {
        // Check to see if there is already a countdown
        if (TimeSync.serverTime() < GameVariables.findOne("timeToStart").value) {
          GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
        } else {
          // If there is no countdown, start one
          var date = new Date();
          var startTime = date.valueOf() + 5100; // start 5 seconds from now (magic number, I know...)

          GameVariables.update("timeToStart", {$set: {value: TimeSync.serverTime(startTime, 500), enabled: true}}); // Update every half second
        }

        startDep.changed();
      } else {
        TimeSync.resync();
      }
    }
  },

  "click .whoami": function() {
    Session.set("seenRole", false);
  }
});

Template.registerHelper("equals", function (a, b) {
  return (a == b);
});

Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});

Template.role.events({
  "click .vote-up": function() {
    if (getVote(this._id) != 1 && !getPlayer().ready) {
      console.log("Voted up: " + Roles.findOne(this._id).name);
      changeVote(this._id, 1);
    }
  },
  "click .vote-neutral": function() {
    if (getVote(this._id) != 0 && !getPlayer().ready) {
      console.log("Voted neutral: " + Roles.findOne(this._id).name);
      changeVote(this._id, 0);
    }
  },
  "click .vote-down": function() {
    if (getVote(this._id) != -1 && !getPlayer().ready) {
      console.log("Voted down: " + Roles.findOne(this._id).name);
      changeVote(this._id, -1);
    }
  }
});

Template.role.helpers({
  "vote": function() {
    var player = getPlayer()._id;
    var vote = RoleVotes.findOne({playerId: player, roleId: this._id});

    return vote ? vote.vote : 0;
  },
  "roleEnabled": function() {
    votesDep.depend();

    var role = Roles.findOne(this._id);

    return role.enabled;
  },
  "cantVote": function() {
    return getPlayer().ready;
  }
});

Template.whoAmI.helpers({
  "playerName": function() {
    return Meteor.user().username;
  },
  "roleName": function() {
    if (GameVariables.findOne("gameMode").value == "inGame") {
      Meteor.call("getRoleId", Meteor.user(), function (error, result) {
        if (error) {
          console.log(error);
        } else {
          Session.set("roleGiven", result);
        }
      });

      return Roles.findOne(Session.get("roleGiven")).name;
    } else {
      return "";
    }
  },
  "roleIsWW": function() {
    return Roles.findOne(Session.get("roleGiven")).name == "Werewolf";
  },
  "roleRevealed": function() {
    return Session.get("revealPressed");
  }
});

Template.whoAmI.events({
  "mousedown .revealRole": function(event) {
    event.preventDefault();
    Session.set("revealPressed", true);
    console.log("Reveal pressed");
  },
  "mouseup .revealRole": function(event) {
    event.preventDefault();
    Session.set("revealPressed", false);
  },
  "click .seen-role": function() {
    Session.set("seenRole", true);
  }
});

Template.dayNightCycle.helpers({
  "dayCycle": function() {
    getCurrentCycle();

    var cycleNum = Session.get("cycleNumber");

    return (!(cycleNum % 2 == 0));
  },
  "nominating": function() {
    // Get the list of people looking at the selection screen
    var playersNominating = GameVariables.findOne("playersNominating").value;
    // If the clients player is in the list, the index will be 0 onwards, else it will be -1
    return playersNominating.indexOf(getPlayer()._id) >= 0;
  },
  "doingNothing": function() {
    return getPlayer().doNothing;
  },
  "targets": function() {
    return Players.find({joined: true, alive: true});
  },
  "voting": function() {
    return GameVariables.findOne("lynchVote").enabled;
  },
  "lynchTarget": function() {
    return Players.findOne(GameVariables.findOne("lynchVote").value).name;
  },
  "playersVotingFor": function() {
    return generateVoteString(1);
  },
  "playersVotingAgainst": function() {
    return generateVoteString(2);
  },
  "votingFor": function() {
    return (Players.findOne(getPlayer()._id).voteChoice == 1);
  },
  "votingAgainst": function() {
    return (Players.findOne(getPlayer()._id).voteChoice == 2);
  },
  "abstaining": function() {
    return (Players.findOne(getPlayer()._id).voteChoice == 0);
  },
  "nominator": function() {
    return Players.findOne(GameVariables.findOne("lynchVote").value[1]).name;
  },
  "majorityReached": function() {
    votesDep.depend();

    return GameVariables.findOne("timeToVoteExecution").enabled;
  },
  "majorityText": function() {
    votesDep.depend();

    var timeToExecute = GameVariables.findOne("timeToVoteExecution").value;
    var voteDirection = GameVariables.findOne("voteDirection").value;
    var target = Players.findOne(GameVariables.findOne("lynchVote").value[0]);

    var majorityText = "Majority reached ";
    majorityText += voteDirection ? "to lynch " : "not to lynch ";
    majorityText += target.name + "!";

    if (TimeSync.serverTime() <= timeToExecute) {
      majorityText += " In: " + Math.floor((timeToExecute - TimeSync.serverTime())/1000);// Convert to seconds from ms
    } else if (GameVariables.findOne("timeToVoteExecution").enabled) {
      Meteor.call("executeVote");
    }

    return majorityText;
  },
  "showNightResults": function() {
    nightViewDep.depend();

    var player = getPlayer();

    // Also need to show this if everyone hasn't finished seeing their results
    //getCurrentCycle();

    var cycleNum = GameVariables.findOne("cycleNumber").value;
    var nightTime = cycleNum % 2 == 0;

    if (!player.seenNightResults) {
      return true;
    }

    return (nightTime && player.nightActionDone);
  },
  "showEvents": function() {
    var currentCycle = GameVariables.findOne("cycleNumber").value;

    var events = EventList.find({cycleNumber: (currentCycle - 1)});

    return (events.count() > 0 && !getPlayer().seenNewEvents);
  },
  "events": function() {
    var currentCycle = GameVariables.findOne("cycleNumber").value;
    return EventList.find({cycleNumber: (currentCycle - 1)});
  }
});

Template.dayNightCycle.events({
  "click .lynch.nominate": function(event) {
    // Get the list of people looking at the selection screen
    var playersNominating = GameVariables.findOne("playersNominating").value;
    // Add the current player (who pushed the button) to this list
    playersNominating.push(getPlayer()._id);
    // Update the list back to global space
    GameVariables.update("playersNominating", {$set: {value: playersNominating}});
    Players.update(getPlayer()._id, {$set: {doNothing: false}});
  },
  "click .lynch.do-nothing": function(event) {
    Players.update(getPlayer()._id, {$set: {doNothing: true}});

    if (allPlayersDoingNothing()) {
      Meteor.call("doingNothingToday");
    }
  },
  "click .events.ok": function(event) {
    // Update that the player has seen the events
    Players.update(getPlayer()._id, {$set: {seenNewEvents: true}});
  },
  "click .cancel": function(event) {
    // Get the list of people looking at the selection screen
    var playersNominating = GameVariables.findOne("playersNominating").value;
    // Remove the current player from this list
    var playerIndex = playersNominating.indexOf(getPlayer()._id);
    playersNominating.splice(playerIndex, 1);
    // Update the list back to global space
    GameVariables.update("playersNominating", {$set: {value: playersNominating}});
  },
  "click .vote.do-lynch": function(event) {
    Players.update(getPlayer()._id, {$set: {voteChoice: 1}});
    checkLynchVotes();
  },
  "click .vote.dont-lynch": function(event) {
    Players.update(getPlayer()._id, {$set: {voteChoice: 2}});
    checkLynchVotes();
  },
  "click .vote.abstain": function(event) {
    Players.update(getPlayer()._id, {$set: {voteChoice: 0}});
    checkLynchVotes();
  }
});

Template.nominateTarget.events({
  "click .nominatePlayer": function(event) {
    // Get the lynch target player
    var nominatedPlayer = Players.findOne(this._id);
    var nominator = getPlayer();
    // Kill the array holding the number of players looking at the nominate selection screen
    GameVariables.update("playersNominating", {$set: {value: []}});
    // Set all the players votes back to zero for the impending vote
    var players = getAlivePlayers();
    players.forEach(function(player) {
      // Don't do this yet, for testing purposes (the bots can have set votes
      //Players.update(player._id, {$set: {voteChoice: 2}});
    });
    // Set the variable to move to the yes/no vote
    GameVariables.update("lynchVote", {$set: {value: [nominatedPlayer._id, nominator._id], enabled: true}});
    // The nominator starts voting to lynch the target
    Players.update(nominator._id, {$set: {voteChoice: 1}});
  }
});

function checkLynchVotes() {
  // This is the function that will check to see if a majority has been reached yet
  var players = getAlivePlayers();

  // The number of voters is all the alive players, minus the target
  var numVoters = players.count() -1;
  var voteTally = 0;

  players.forEach(function(player) {
    if (player.voteChoice == 1) {
      voteTally++;
    } else if (player.voteChoice == 2) {
      voteTally--;
    }
  });

  console.log("Vote Tally: " + voteTally);
  console.log("Num voters: " + numVoters);

  // Has a majority been reached?
  if (Math.abs(voteTally) > Math.floor(numVoters/2)) {
    // Which direction are we going to execute this vote?
    var votingFor = voteTally > 0;

    console.log("Majority reached");
    console.log(votingFor);

    if (TimeSync.isSynced()) {
      var date = new Date();
      var startTime = date.valueOf() + 5100; // start 5 seconds from now (magic number, I know...)

      GameVariables.update("timeToVoteExecution", {$set: {value: TimeSync.serverTime(startTime, 500), enabled: true}}); // Update every half second

      GameVariables.update("voteDirection", {$set: {value: votingFor, enabled: true}});
      //startDep.changed();
    } else {
      TimeSync.resync();
    }
  } else {
    GameVariables.update("timeToVoteExecution", {$set: {value: 0, enabled: false}});
  }

  votesDep.changed();
}

function allPlayersDoingNothing() {
  var players = getAlivePlayers();

  var doingNothingToday = true;

  players.forEach(function(player) {
    if (!player.doNothing)
      doingNothingToday = false;
  });

  return doingNothingToday;
}

function generateVoteString(voteType) {
  var players = getAlivePlayers();

  var voteList = "";

  players.forEach(function(player) {
    if (player.voteChoice == voteType) {
      voteList += ", " + Players.findOne(player._id).name;
    }
  });

  voteList = voteList.substr(2);

  return voteList;
}

function changeVote(roleId, newVote) {
  var player = getPlayer()._id;
  var vote = RoleVotes.findOne({playerId: player, roleId: roleId});

  // Check to see if an entry for this players vote exists, if so update it, else make one.
  if (vote) {
    RoleVotes.update(vote._id, {$set: {vote: newVote}});
  } else {
    RoleVotes.insert({
      roleId: roleId,
      playerId: player,
      vote: newVote
    });
  }

  // As the vote count for this role has now changed, recount the vote for this role
  var votes = RoleVotes.find({roleId: roleId});
  var tally = 0;

  votes.forEach(function (vote) {
    tally += vote.vote;
  });

  // Update the vote count to the role
  Roles.update(roleId, {$set: {votes: tally}});

  // Some debug console logs
  console.log("Processing role votes for " + Roles.findOne(roleId).name);
  console.log("Adding votes, tally: " + tally);

  countVotes();

  votesDep.changed();
}

function countVotes() {
  // We only want to do this for non critical roles.
  var talliedRoles = Roles.find({critical: false}, {sort: {votes: -1}});

  var count = 1;
  talliedRoles.forEach(function(role) {
    Roles.update(role._id, {$set: {order: count}});
    count += 1;
    //console.log(role.name + " got " + role.votes + " votes.");
  });

  // This is the calculation that determines is the role is enabled or not.
  var numVillagers = Players.find({joined: true}).count() - numWerewolves();

  console.log("Number of villagers that can take on a role = " + numVillagers);

  Roles.find({critical: false}).forEach(function(role) {
    console.log(role.name + "'s order is " + role.order);

    var enabled = false;
    // To be enabled, the role must have a positive vote score, and have a high enough order
    if (role.votes > 0) {
      if (role.order <= numVillagers) {
        enabled = true;
      }
    }

    Roles.update(role._id, {$set: {enabled: enabled}});
  });
}

function numWerewolves() {
  // Get the number of players that have joined in the lobby
  var numPlayers = Players.find({joined: true}).count();

  return Math.floor(numPlayers / 3);
}

function getVote(roleId) {
  var player = getPlayer()._id;
  var vote = RoleVotes.findOne({playerId: player, roleId: roleId});

  return vote ? vote.vote : 2;
}

function allReady() {
  var playersTotal = Players.find({joined: true}).count();
  var playersReady = Players.find({ready: true}).count();

  return playersReady == playersTotal;
}

function getCurrentCycle() {
  Meteor.call("currentCycle", function (error, result) {
    if (error) {
      console.log(error);
    } else {
      Session.set("cycleNumber", result);
    }
  });
}