// These are the dependency trackers to make sure things are reactive
var votesDep = new Tracker.Dependency;
var startDep = new Tracker.Dependency;

nightViewDep = new Tracker.Dependency;

Template.navbar.helpers({
  inGame: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    return currentGameMode == "inGame";
  }
});

Template.body.helpers({
  // These are the helpers that tell the html which screen to show
  lobby: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    if (Meteor.user() != null) {
      var player = Players.findOne({userId: Meteor.userId()});

      if (player == undefined) {
        return true;
      } else if (!player.joined) {
        return true;
      } else if (!player.seenEndgame) {
        return false;
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
  gameOver: function() {
    var player = getPlayer();

    return !player.seenEndgame;
  },
  whoAmIScreen: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    if (currentGameMode == "inGame") {
      return !Session.get("seenRole");
    }

    return false;
  },
  alive: function() {
    var player = getPlayer();

    return !player.seenNightResults ? true : player.alive;
  },
  seenDeath: function() {
    var player = getPlayer();

    return player.joined ? player.seenDeath : true;
  }
});

Template.body.events({
  "click .join-game": function() {
    if (GameVariables.findOne("gameMode").value == "lobby") {
      var player = getPlayer();

      if (player) {
        Players.update(player._id, {$set: {joined: true, seenEndgame: true}});
      } else {
        Meteor.call("addPlayer", Meteor.user());
      }

      // Reset the start game countdown
      Meteor.call("stopStartCountdown");
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
    Meteor.call("stopStartCountdown");

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
    Meteor.call("stopStartCountdown");
  },

  "click .start-game": function() {
    if (allReady()) {
      Meteor.call("startStopGame");

      startDep.changed();
    }
  },

  "click .whoami": function() {
    Session.set("seenRole", false);
  }
});

Template.lobbyScreen.helpers({
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

    // Testing this
    //return ServerChecks.findOne("allReady");
  },

  counting: function() {
    startDep.depend();

    if (TimeSync.serverTime() <= GameVariables.findOne("timeToStart").value) {
      return true;
    }

    if (GameVariables.findOne("timeToStart").enabled) {
      console.log("Calling start game method from client.");
      //Meteor.call("startGame");
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
  inGame: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    return currentGameMode == "inGame";
  }
});

Template.registerHelper("equals", function (a, b) {
  return (a == b);
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

      if (Roles.findOne(Session.get("roleGiven")))
        return Roles.findOne(Session.get("roleGiven")).name;

      return "";
    } else {
      return "";
    }
  },
  "roleText": function() {
    if (true || Session.get("revealPressed")) {
      var roleString = "";
      switch(Session.get("roleGiven").name) {
        case "Werewolf":
          var wolfId = Roles.findOne({name: "Werewolf"})._id;
          var theWolves = Players.find({role: wolfId});

          if (theWolves.count() > 1) {
            var wolfArray = [];
            theWolves.forEach(function (wolf) {
              wolfArray.push(wolf.name);
            });

            roleString += "The other werewolves are " + wolfArray.join(", ") + ".";
          }

          roleString += werewolfDescription;
          break;
        case "Villager":
          roleString += villagerDescription;
          break;
        case "Doctor":
          roleString += doctorDescription;
          break;
        case "Witch":
          roleString += witchDescription;
          break;
        case "Seer":
          roleString += seerDescription;
          break;
        case "Knight":
          roleString += knightDescription;
          break;
        case "Saint":
          roleString += saintDescription;
          break;
      }

      return roleString;
    } else {
      return "Hold the button below to reveal your role.";
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

Template.eventList.helpers({
  "events": function() {
    var player = getPlayer();

    // TODO This needs some work here to make it more clear what to show on game end, rather than spectating
    // Perhaps add a "spectating" variable to the players
    if (player.alive && player.joined) {
      // This should show on the game end screen
      var currentCycle = GameVariables.findOne("cycleNumber").value;
      return EventList.find({cycleNumber: (currentCycle - 1)});
    } else {
      // This should only show when spectating
      return EventList.find({}, {sort: {timeAdded: -1}});
    }
  }
});

Template.eventsDisplay.events({
  "click .ok": function(event) {
    // Update that the player has seen the events
    Players.update(getPlayer()._id, {$set: {seenNewEvents: true}});
  }
});

Template.eventDisplay.helpers({
  revealRole: function() {
    var cycle = this.cycleNumber;

    if (cycle % 2 == 0) {
      return GameVariables.findOne("revealRole").value.night;
    } else {
      return GameVariables.findOne("revealRole").value.day;
    }
  },
  revealTag: function() {
    // This requires the events list to be boostrapped first

    // The idea here would be to pass a tag that would set the colour based on what the event information is.

    // For example, if reveal role was disabled for this cycle, then just pass back the "info" tag.
    // If the role is to be revealed on death, then pass the warning tag for a villager, and the danger tag for a werewolf.
    // If the event is not to do with death, then send something to emphasise that (for example, the witch hexxing someone).

    var tag = "";
    var reveal = false;

    var cycle = this.cycleNumber;

    if (cycle % 2 == 0) {
      reveal = GameVariables.findOne("revealRole").value.night;
    } else {
      reveal = GameVariables.findOne("revealRole").value.day;
    }

    if (reveal) {
      var eventType = this.type;

      switch (eventType) {
        case "vDeath":
          tag = "inverted red";
          break;
        case "wwDeath":
          tag = "inverted green";
          break;
        case "warning":
          tag = "inverted orange";
          break;
      }
    }

    return tag;
  }
});

Template.dayNightCycle.helpers({
  "dayCycle": function() {
    var currentCycle = GameVariables.findOne("cycleNumber").value

    return (!(currentCycle % 2 == 0));
  },
  "nominating": function() {
    // Get the list of people looking at the selection screen
    var playersNominating = GameVariables.findOne("playersNominating").value;
    // If the clients player is in the list, the index will be 0 onwards, else it will be -1
    return playersNominating.indexOf(getPlayer()._id) >= 0;
  },
  "voting": function() {
    return GameVariables.findOne("lynchVote").enabled;
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
  }
});

Template.dayView.helpers({
  "doingNothing": function() {
    return getPlayer().doNothing;
  }
});

Template.dayView.events({
  "click .nominate": function(event) {
    // Get the list of people looking at the selection screen
    var playersNominating = GameVariables.findOne("playersNominating").value;
    // Add the current player (who pushed the button) to this list
    playersNominating.push(getPlayer()._id);
    // Update the list back to global space
    GameVariables.update("playersNominating", {$set: {value: playersNominating}});
    Players.update(getPlayer()._id, {$set: {doNothing: false}});
  },
  "click .do-nothing": function(event) {
    Players.update(getPlayer()._id, {$set: {doNothing: true}});

    if (allPlayersDoingNothing()) {
      Meteor.call("doingNothingToday");
    }
  }
});

Template.nominateTarget.events({
  "click .nominatePlayer": function(event) {
    if (!Session.get("nominationTarget")) {
      // Get the lynch target player and the nominator
      var target = Players.findOne(this._id);

      //console.log("Clicked nominate on " + target.name);

      Session.set("nominationTarget", target);

      // TODO is the Sessions reactivity causing this to fire multiple times?
      // Perhaps a "hide others" behaviour will patch this (not fix it though...)
      $('.ui.modal.nominateCheck')
        .modal({
          closable: false,
          onApprove: function() {
            //console.log("Clicked sure in nominate");
            // Kill the array holding the number of players looking at the nominate selection screen
            GameVariables.update("playersNominating", {$set: {value: []}});
            // Set all the players votes back to abstain for the impending vote
            var players = getAlivePlayers();
            players.forEach(function (player) {
              // Don't do this yet, for testing purposes (otherwise the bots votes get reset)
              // TODO Remember this is here!!!
              //Players.update(player._id, {$set: {voteChoice: 0}});
            });
            // Get the nominator and nominee
            var target = Session.get("nominationTarget");
            Session.set("nominationTarget", null);
            var nominator = getPlayer();
            // Set the variable to move to the yes/no vote
            GameVariables.update("lynchVote", {$set: {value: [target._id, nominator._id], enabled: true}});
            // The nominator starts voting to lynch the target
            Players.update(nominator._id, {$set: {voteChoice: 1}});
            // Let the server know that the lynch vote has started
            Meteor.call("beginLynchVote");
          },
          onDeny: function() {
            Session.set("nominationTarget", null);
          }
        })
        .modal("show")
        .modal('hide others', true)
        .modal('refresh', true);
    }
  }
});

Template.nominationView.helpers({
  "targets": function() {
    return Players.find({joined: true, alive: true});
  },
  "target": function() {
    return Session.get("nominationTarget").name;
  }
});

Template.nominationVoteView.helpers({
  "majority": function() {
    votesDep.depend();

    var timeToExecute = GameVariables.findOne("timeToVoteExecution");
    var voteDirection = GameVariables.findOne("voteDirection").value;
    var target = Players.findOne(GameVariables.findOne("lynchVote").value[0]);

    var majorityText = "Majority reached ";
    majorityText += voteDirection ? "to lynch " : "not to lynch ";
    majorityText += target.name + "!";

    var majorityTag = "orange";

    if (timeToExecute.enabled) {
      majorityTag = voteDirection ? "red" : "blue";

      if (TimeSync.serverTime() <= timeToExecute.value) {
        majorityText += " In: " + Math.floor((timeToExecute.value - TimeSync.serverTime()) / 1000);// Convert to seconds from ms
      }
    } else {
      var timeToTimeout = GameVariables.findOne("timeToVoteTimeout").value;

      majorityText = "Voting time left: " + Math.floor((timeToTimeout - TimeSync.serverTime())/1000);
    }

    return {
      text: majorityText,
      tag: majorityTag
    };
  },
  votingTitle: function() {
    var voteDetails = GameVariables.findOne("lynchVote");

    if (voteDetails.enabled) {
      var target = Players.findOne(voteDetails.value[0]);
      var nominator = Players.findOne(voteDetails.value[1]);

      return target.name + " has been nominated by " + nominator.name + ". Please cast your vote!";
    } else {
      return "Not voting yet..."
    }
  },
  "lynchTarget": function() {
    return Players.findOne(GameVariables.findOne("lynchVote").value[0]).name;
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

    return (GameVariables.findOne("timeToVoteExecution").enabled);
  }
});

Template.nominationVoteView.events({
  "click .do-lynch": function(event) {
    Meteor.call("changeLynchVote", getPlayer()._id, 1);

    //Players.update(getPlayer()._id, {$set: {voteChoice: 1}});
    //checkLynchVotes();
  },
  "click .dont-lynch": function(event) {
    Meteor.call("changeLynchVote", getPlayer()._id, 2);

    //Players.update(getPlayer()._id, {$set: {voteChoice: 2}});
    //checkLynchVotes();
  },
  "click .abstain": function(event) {
    Meteor.call("changeLynchVote", getPlayer()._id, 0);

    //Players.update(getPlayer()._id, {$set: {voteChoice: 0}});
    //checkLynchVotes();
  }
});

Template.dayNightCycle.events({
  "click .cancel": function(event) {
    // Get the list of people looking at the selection screen
    var playersNominating = GameVariables.findOne("playersNominating").value;
    // Remove the current player from this list
    var playerIndex = playersNominating.indexOf(getPlayer()._id);
    playersNominating.splice(playerIndex, 1);
    // Update the list back to global space
    GameVariables.update("playersNominating", {$set: {value: playersNominating}});
  }
});

Template.youDiedScreen.helpers({
  deathCause: function() {
    var player = getPlayer();
    var deathType = player.deathDetails.type;

    if (deathType == "lynch") {
      return "lynched";
    }

    if (deathType == "werewolf") {
      return "killed";
    }

    if (deathType == "saint") {
      return "smitten";
    }
  },
  deathCycle: function() {
    var player = getPlayer();
    var deathCycle = player.deathDetails.cycle;

    return !(deathCycle % 2 == 0) ? "day" : "night";
  }
});

Template.youDiedScreen.events({
  "click .js-seen-death": function() {
    var player = getPlayer();

    Players.update(player._id, {$set: {seenDeath: true}});
  }
});

Template.endGameScreen.helpers({
  result: function() {
    var title = "This is the end game title";
    var tag = "panel-default";
    var text = "This is the text that possibly describes the way the game ended or whatnot...";

    var villagersWon = GameVariables.findOne("lastGameResult").value;
    var vWin = false;

    if (villagersWon) {
      tag = "green";
      title = "The Villagers have won!!";
      vWin = true;
    } else {
      tag = "red";
      title = "The Werewolves have won!!";
    }

    var cycleNumber = GameVariables.findOne("cycleNumber").value - 1;

    text = "The game took " + cycleNumber + " cycles to complete.";
    // TODO Think of more info to include here?

    return {
      title: title,
      tag: tag,
      text: text,
      vWin: vWin
    }
  },
  roleList: function() {
    // This is where an array of text needs to be generated, where each entry has a text field and a tag field
    var players = Players.find({joined: true}, {sort: {alive: -1}});

    var list = [];
    var villager = Roles.findOne({name: "Villager"});

    players.forEach(function(player) {
      // Find the players role
      var role = Roles.findOne(player.role);

      // Generate the text and tag for the list
      var text = player.name + " was a " + role.name;
      var tag = "";

      // Change the tag to suit the role
      if (role._id != villager._id) {
        if (role.name == "Werewolf") {
          tag = "inverted red";
        } else if (role.aggressive) {
          // This includes roles like the Witch and the Saint
          tag = "inverted orange";
        } else {
          // This includes roles like the Seer and Doctor
          tag = "inverted green";
        }
      }

      var icon = "black crosshairs"; // This looks like death, kinda...
      if (player.alive) {
        if (tag == "inverted red") {
          icon = "heart"; // Otherwise the werewolf role display will be a red heart on a red background!
        } else {
          icon = "red heart"; // This looks a lot like alive, so cool!
        }
      }

      // Now add this entry to the list
      list.push({text: text, tag: tag, icon: icon});
    });

    return list;
  }
});

Template.endGameScreen.events({
  "click .js-seenEndGame": function() {
    var player = getPlayer();

    Players.update(player._id, {$set: {seenEndgame: true}});
  }
});

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
  var lynchTarget = Players.findOne(GameVariables.findOne("lynchVote").value[0]);
  var players = Players.find({alive: true, _id: {$ne: lynchTarget._id}});

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

// TODO this should be done server side!
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

  //console.log("Number of villagers that can take on a role = " + numVillagers);

  Roles.find({critical: false}).forEach(function(role) {
    //console.log(role.name + "'s order is " + role.order);

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

  // There must be a minimum of 3 joined players to start the game
  return (playersReady == playersTotal) && (playersTotal > 2);
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

Accounts.ui.config({
  passwordSignupFields: "USERNAME_ONLY"
});