var startGameCounter = null;
var executeVoteCounter = null;
var voteTimeout = null;
var killCounter = null;

Meteor.methods({
  addPlayer: function() {
    var user = Meteor.user();

    var facebook = user.services.facebook ? true : false;

    Players.insert({
      userId: user._id,
      facebookLogin: facebook,
      name:   facebook ? user.profile.name : user.username,
      avatar: facebook ? "http://graph.facebook.com/" + user.services.facebook.id + "/picture/?type=large" : "",
      role:   0,
      status: 0,
      alive: true,
      joined: true,
      ready:  false,
      voteChoice: 0,
      doNothing: false,
      seenNewEvents: false,
      seenNightResults: true,
      nightActionDone: false,
      effect: "none",
      bot: false,
      seenDeath: false,
      deathDetails: {cycle: 0, type: "none"},
      target: 0,
      seenEndgame: true
    });
  },
  // This is called when one of the clients wants to start/stop the game
  startStopGame: function() {
    //if ((new Date()).valueOf() < GameVariables.findOne("timeToStart").value) {
    //  // If there is a countdown in progress, stop it
    //  stopGameCountdown();
    //} else {
    //  // If there is no countdown, start one
    //  startGameCountdown();
    //}

    if (startGameCounter) {
      stopGameCountdown();
    } else {
      startGameCountdown();
    }
  },
  stopStartCountdown: function() {
    stopGameCountdown();
  },
  "getRoleId": function(user) {
    return Roles.findOne(Players.findOne({userId: user._id}).role);
  },
  "getRoleFromId": function(playerId) {
    return Roles.findOne(Players.findOne(playerId).role);
  },
  "currentCycle": function() {
    return GameVariables.findOne("cycleNumber").value;
  },
  "changeLynchVote": function(playerId, vote) {
    // A client has called that it would likes it's players vote to be changed

    // First, we update the vote for that player
    Players.update(playerId, {$set: {voteChoice: vote}});

    // Now we need to get a hold of all the alive players excluding the target
    var lynchTarget = Players.findOne(GameVariables.findOne("lynchVote").value[0]);
    var players = Players.find({alive: true, _id: {$ne: lynchTarget._id}});
    // The number of voters is all of these players
    var numVoters = players.count();
    // Now we need to get the tally counts
    var tally = GameVariables.findOne("voteTally").value;
    var votesFor = tally.for;
    var votesAgainst = tally.against;

    // Now we need to count up the new votes, keeping the old ones for comparison later
    var newVotesFor = 0;
    var newVotesAgainst = 0;
    players.forEach(function(player) {
      if (player.voteChoice == 1) {
        newVotesFor++;
      } else if (player.voteChoice == 2) {
        newVotesAgainst++;
      }
    });
    // Update the database with the new tally
    GameVariables.update("voteTally", {$set: {value: {for: newVotesFor, against: newVotesAgainst}}});

    // Just print some stuff to the console for debug purposes
    console.log("Votes for: " + newVotesFor);
    console.log("Votes against: " + newVotesAgainst);
    console.log("Num voters: " + numVoters);

    // Now we need to check is a majority has been reached and update the direction variable
    // Majority is when you have more votes than the half number of eligible voters, rounded up (ceil)
    if (newVotesFor > newVotesAgainst) {
      if (newVotesFor > (numVoters/2)) {
        console.log("Majority reached to lynch.");

        GameVariables.update("voteDirection", {$set: {value: true, enabled: true}});
      } else {
        // No majority, clear the relevant variables
        GameVariables.update("voteDirection", {$set: {enabled: false}});
        stopLynchCountdown();
        startLynchTimeout();
      }
    } else {
      if (newVotesAgainst > (numVoters/2)) {
        console.log("Majority reached not to lynch.");

        GameVariables.update("voteDirection", {$set: {value: false, enabled: true}});
      } else {
        // No majority, clear the relevant variables (code repeated, I know... I feel bad...)
        GameVariables.update("voteDirection", {$set: {enabled: false}});
        stopLynchCountdown();
        startLynchTimeout();
      }
    }

    // Now that we know if there is a majority and in that case, which way the vote is going...
    if (GameVariables.findOne("voteDirection").enabled) {
      // If indeed a majority was reached, lets check that there isn't already a count in progress.
      // First, lets check if there was already a majority in this direction before.
      if (GameVariables.findOne("voteDirection").value) {
        // Lets see if the original tally favoured this direction
        if (votesFor > (numVoters/2)) {
          // If we got here, that means that new votes came in, but they did not change the fact that there is
          // a majority to lynch, so we do nothing and the countdown will continue.
          console.log("Still a majority to lynch.");

          // Just in case, check to make sure that there is a countdown in progress
          if (!executeVoteCounter) {
            startLynchCountdown();
            stopLynchTimeout();
          }
        } else {
          // If we got here, that means there wasn't a majority before to lynch, so we should start the clock.
          startLynchCountdown();
          // We should also stop the timeout counter
          stopLynchTimeout();
          console.log("Starting countdown to lynch.");
        }
      } else {
        // Lets see if the original tally favoured this direction instead
        if (votesAgainst > (numVoters/2)) {
          // If we got here, then there was already a majority not to lynch, so we do nothing here as well.
          console.log("Still a majority to not lynch.");

          // Just in case, check to make sure that there is a countdown in progress
          if (!executeVoteCounter) {
            startLynchCountdown();
            stopLynchTimeout();
          }
        } else {
          // If we got here, that means that there wasn't a majority to not lynch before, so start the clock.
          startLynchCountdown();
          // And also stop the countdown timer again
          stopLynchTimeout();
          console.log("Starting countdown not to lynch.");
        }
      }
    }
  },
  "beginLynchVote": function() {
    var cycleNumber = GameVariables.findOne("cycleNumber").value;
    var target = Players.findOne(GameVariables.findOne("lynchVote").value[0]);
    var nominator = Players.findOne(GameVariables.findOne("lynchVote").value[1]);

    var lynchNominationMadeText = nominator.name + " has nominated " + target.name + " to be lynched.";

    EventList.insert({type: "info", cycleNumber: cycleNumber, text: lynchNominationMadeText, timeAdded: new Date()});

    startLynchTimeout();
  },
  "executeVote": function() { // This isn't used anymore
    executeVote();
  },
  "doingNothingToday": function() {
    var cycleNumber = GameVariables.findOne("cycleNumber").value;

    var didNothingText = "The day moves into night with the villagers choosing not to lynch anyone.";

    EventList.insert({type: "info", cycleNumber: cycleNumber, text: didNothingText, timeAdded: new Date()});

    // Prepare players for night time
    var players = Players.find({alive: true});
    players.forEach(function(player) {
      if (!player.bot)
        Players.update(player._id, {$set: {nightActionDone: false}});
    });

    moveToNextCycle();
  },
  "setRoleTarget": function(roleId, targetId) {
    var role = Roles.findOne(roleId);
    var target = Players.findOne(targetId);

    //console.log(roleId);

    console.log("Setting " + role.name + " target to " + target.name);

    Roles.update(roleId, {$set: {target: targetId}});
  },
  "getRoleTarget": function(roleName) {
    var role = Roles.findOne({name: roleName});

    return Players.findOne(role.target);
  },
  "changeRoleVote": function(playerId, roleId, newVote) {
    var vote = RoleVotes.findOne({playerId: playerId, roleId: roleId});

    // Check to see if an entry for this players vote exists, if so update it, else make one.
    if (vote) {
      RoleVotes.update(vote._id, {$set: {vote: newVote}});
    } else {
      RoleVotes.insert({
        roleId: roleId,
        playerId: playerId,
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
    //console.log("Processing role votes for " + Roles.findOne(roleId).name);
    //console.log("Adding votes, tally: " + tally);

    // Now to count the votes

    countVotes();
  },
  "recountRoleVotes": function() {
    countVotes();
  },
  "changeWerewolfVote": function(playerId, targetId) {
    // Update the werewolf that requested it
    Players.update(playerId, {$set: {target: targetId}});

    // Now let's check if they all agree or not...

    // Lets get the werewolves in question (all of them...)
    var werewolfId = Roles.findOne({name: "Werewolf"})._id;
    var werewolves = Players.find({role: werewolfId, alive: true, joined: true});

    // Lets make a list of all the targets id's
    var targets = [];
    werewolves.forEach(function(werewolf) {
      targets.push(werewolf.target);
    });

    // Lets now check to see if they are all the same and thus the werewolves all agree on a target
    var potentialTargetId = targets[0];
    var allAgree = true;
    for (var i = 1; i < targets.length; i++) {
      if (potentialTargetId != targets[i] || !targets[i] || targets[i] == 0) {
        // One werewolf does not agree, then they don't all agree. Duh.
        allAgree = false;
      }
    }

    // OK, so what was the outcome of that? Are the werewolves all in agreement, or no?
    if (allAgree) {
      var countdownDelay = GameSettings.findOne("timeDelays").countdown;

      GameVariables.update("timeToKill", {$set: {
        value: (new Date()).valueOf() + countdownDelay,
        enabled: true
      }});

      var agreedTarget = Players.findOne(potentialTargetId);
      console.log("Werewolves have all targeted: " + agreedTarget.name);

      if (!killCounter) {
        killCounter = Meteor.setTimeout(function () {
          werewolves.forEach(function (werewolf) {
            finishedNightAction(werewolf._id);
          });

          Roles.update(werewolfId, {$set: {target: potentialTargetId}});

          checkNightEnded();
        }, countdownDelay);
      }
    } else {
      // No agreement yet
      if (killCounter) {
        Meteor.clearTimeout(killCounter);
        killCounter = null;
      }

      GameVariables.update("timeToKill", {$set: {
        value: 0,
        enabled: false
      }});

      Roles.update(werewolfId, {$set: {target: 0}});
    }
  },
  "finishedNightAction": function(playerId) {
    finishedNightAction(playerId);
    checkNightEnded();
  }
});

function finishedNightAction(playerId) {
  Players.update(playerId, {$set: {
    nightActionDone: true,
    seenNightResults: false,
    seenNewEvents: false,
    doingNightAction: false
  }});
}

function checkNightEnded() {
  // Do a check to see if everyone has seen the results and if so, move to day.
  var players = Players.find({alive: true});
  var allDone = true;

  players.forEach(function(player) {
    if (!player.nightActionDone) {
      allDone = false;
    }
  });

  if (allDone) {
    endNightCycle();
  }
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

function moveToNextCycle() {
  var players = Players.find({alive: true});

  // Reset all the variables for the players, to be ready for the next day/night cycle
  players.forEach(function(player) {
    Players.update(player._id, {$set: {seenNewEvents: false, target: 0}});

    // Reset the double jeopardy rule
    Players.update(player._id, {$set: {previousNominations: []}});

    if (!player.bot) {
      //Players.update(player._id, {$set: {nightActionDone: false}});
      Players.update(player._id, {$set: {doNothing: false}});
    }
  });

  // Do a check to see what cycle we are moving from, just in case there is anything cycle specific
  var werewolfId = Roles.findOne({name: "Werewolf"})._id;
  var lastCycle = GameVariables.findOne("cycleNumber").value;
  if (!(lastCycle % 2 == 0)) {
    // It was just day
    console.log("End day cycle has been called.");

    // The werewolves target needs to be reset after leaving the day cycle
    Roles.update(werewolfId, {$set: {target: 0}});
  } else {
    // It was just night
    console.log("End night cycle has been called.");
  }

  // Increment the cycle
  GameVariables.update("cycleNumber", {$inc: {value: 1}});

  // 1. Specifically, we first need to check that there are still werewolves (villagers win).
  // 2. Then we need to check if the werewolves outnumber the villagers (werewolves win)
  // 3. In the case that the villagers outnumber the werewolves, the game continues.
  // 4. In the case that the villagers and werewolves have the same numbers, then another check is needed.
  //    The only way the villagers can win in that case is if one of the villagers is a knight and thus cannot be
  //    killed at night. Or one of them is a Doctor, which means that the other villager could potentially be saved.
  //    So if the remaining pool of villagers contains either a Doctor or a Knight, the game continues.

  var doctorKnightPresent = false;
  var knight = Roles.findOne({name: "Knight"});
  var doctor = Roles.findOne({name: "Doctor"});

  // Count the werewolves/villagers
  var numWerewolves = 0;
  var numVillagers = 0;
  players.forEach(function(player) {
    if (player.role == werewolfId) {
      numWerewolves++;
    } else {
      if ((player.role == knight._id) || (player.role == doctor._id)) {
        // There is a knight and/or doctor present
        doctorKnightPresent = true;
      }
      numVillagers++;
    }
  });

  console.log("Num Villagers left: " + numVillagers);
  console.log("Num Werewolves left: " + numWerewolves);

  if (numWerewolves <= 0) { // 1. Are the werewolves all dead?
    // The villagers win
    console.log("The Werewolves are all dead.");
    endGame(true);
  } else if (numWerewolves > numVillagers) { // 2. Are the werewolves the majority?
    // The werewolves win
    console.log("The Werewolves have the majority.");
    endGame(false);
  } else if (numWerewolves == numVillagers) { // 4. Is the number of werewolves and villagers equal?
    // We need to check if the remaining players contains either a doctor or knight.
    console.log("Equal numbers for werewolves and villagers");
    if (!doctorKnightPresent || numVillagers <= 1) {
      // There is no doctor or knight present, the villagers can't win, the werewolves have it
      // Also, if there is only one villager, they also lose even if it is a knight (for balance reasons).
      console.log("No doctor or knight present.");
      endGame(false);
    } else {
      console.log("There was a doctor or knight present so the game continues.");
    }
  } else {
    // 3. If we get here, that means there are more villagers than werewolves, so do nothing.
    console.log("The game continues...");
  }
}

function endNightCycle() {
  var cycleNumber = GameVariables.findOne("cycleNumber").value;

  var nightEndText = "The night has ended...";
  EventList.insert({type: "info", cycleNumber: cycleNumber, text: nightEndText, timeAdded: new Date()});

  // Here is where the night cycle needs to be computed

  // Need to kill whoever the werewolves picked UNLESS they have the "save" effect, or are the Knight
  // Need to generate an event based on that

  // Get the werewol(f/ves) target id
  var werewolf = Roles.findOne({name: "Werewolf"});
  var werewolfTargetId = werewolf.target;
  // Get the doctors target id
  var doctorsTargetId = Roles.findOne({name: "Doctor"}).target;
  // Get the saints id
  var knight = Players.findOne({role: Roles.findOne({name: "Knight"})._id});
  var knightId = 0;
  if (knight != undefined) {
    knightId = knight._id;
  }

  // Now lets check if the werewolves are indeed allowed to kill their target (not saved, not the knight)
  if (werewolfTargetId != doctorsTargetId && werewolfTargetId != knightId && werewolfTargetId != 0) {
    // It seems this player is doomed
    var target = Players.findOne(werewolfTargetId);

    // Sorry mate...
    Players.update(werewolfTargetId, {$set: {alive: false, deathDetails: {cycle: cycleNumber, type: "werewolf"}}});

    // Now lets inform everyone
    var wwKillText = target.name + " has been killed during the night!";

    // Are we revealing the roles of the dead during the night?
    if (GameSettings.findOne("revealRole").night) {
      var targetsRole = Roles.findOne(target.role);

      if (targetsRole.name == "Villager") {
        wwKillText += " They were a villager.";
      } else {
        wwKillText += " They were the " + targetsRole.name + ".";
      }
    }

    EventList.insert({type: "vDeath", cycleNumber: cycleNumber, text: wwKillText, timeAdded: new Date()});
  } else {
    // Phew, that player sure is happy about this outcome...

    // Better let everybody know the good news
    var noDeathText = "Nobody was killed during the night";
    EventList.insert({type: "info", cycleNumber: cycleNumber, text: noDeathText, timeAdded: new Date()});
  }

  // Need to generate an event for what the witch has done
  var witchesTargetId = Roles.findOne({name: "Witch"}).target;
  var witchesTarget = Players.findOne(witchesTargetId);
  // Now to generate some text and the event
  if (witchesTarget != undefined) {
    var witchesText = witchesTarget.name + " was hexxed during the night, and can't speak today!";
    EventList.insert({type: "warning", cycleNumber: cycleNumber, text: witchesText, timeAdded: new Date()});
  }

  moveToNextCycle();
}

// This function ends the game, the boolean input is true if the villagers won, false if the werewolves win.
function endGame(villagersWin) {
  console.log("Endgame called");

  var cycleNumber = GameVariables.findOne("cycleNumber").value - 1;
  var winnerText = "";

  if (villagersWin) {
    console.log("Villagers win");
    winnerText = "The Villagers have won!";
  } else {
    console.log("Werewolves win");
    winnerText = "The Werewolves have won!";
  }

  EventList.insert({type: "info", cycleNumber: cycleNumber, text: winnerText, timeAdded: new Date()});

  GameVariables.update("lastGameResult", {$set: {value: villagersWin, enabled: true}});

  var players = Players.find({joined: true});
  var werewolfId = Roles.findOne({name: "Werewolf"})._id;

  // Let's set the variables for all the players that were in the game
  players.forEach(function(player) {
    Players.update(player._id, {$set: {seenEndgame: false, ready: false}});

    if (villagersWin) {
      if (player.role == werewolfId) {
        Players.update(player._id, {$set: {alive: false}});
      }
    } else {
      if (player.role != werewolfId) {
        Players.update(player._id, {$set: {alive: false}});
      }
    }
  });

  // Re-enable the lobby
  GameVariables.update("gameMode", {$set: {value: "lobby"}});
}

function startLynchCountdown() {
  if (executeVoteCounter) {
    Meteor.clearTimeout(executeVoteCounter);
  }

  var milliDelay = GameSettings.findOne("timeDelays").countdown; // execute 5 seconds from now (magic number, I know...)

  var executeTime = (new Date()).valueOf() + milliDelay;

  GameVariables.update("timeToVoteExecution", {$set: {value: executeTime, enabled: true}});

  executeVoteCounter = Meteor.setTimeout(executeVote, milliDelay);
}

function stopLynchCountdown() {
  GameVariables.update("timeToVoteExecution", {$set: {value: 0, enabled: false}});

  // Lets not stop what isn't started
  if (executeVoteCounter) {
    Meteor.clearTimeout(executeVoteCounter);
    executeVoteCounter = null;
  }
}

function startLynchTimeout() {
  if (voteTimeout) {
    console.log("Timeout counter already in progress");
  } else {
    var milliDelay = GameSettings.findOne("timeDelays").timeout;

    var timeoutTime = (new Date()).valueOf() + milliDelay;

    GameVariables.update("timeToVoteTimeout", {$set: {value: timeoutTime, enabled: true}});

    voteTimeout = Meteor.setTimeout(cancelVote, milliDelay);
  }
}

function stopLynchTimeout() {
  GameVariables.update("timeToVoteTimeout", {$set: {value: 0, enabled: false}});

  if (voteTimeout) {
    Meteor.clearTimeout(voteTimeout);
    voteTimeout = null;
  }
}

function startGameCountdown() {
  var milliDelay = GameSettings.findOne("timeDelays").startgame;

  // TODO This shouldn't be necessary but for some reason the reset isn't working in server??
  if(!milliDelay) {
    GameSettings.update("timeDelays", {$set: {startgame: 5100}});
    milliDelay = 5100;
  }

  var startTime = (new Date()).valueOf() + milliDelay;

  GameVariables.update("timeToStart", {$set: {value: startTime, enabled: true}});

  startGameCounter = Meteor.setTimeout(startGame, milliDelay);
}

function stopGameCountdown() {
  GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});

  Meteor.clearTimeout(startGameCounter);
  startGameCounter = null;
}

function startGame() {
  // Set the variables dealing with the game starting
  GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
  GameVariables.update("gameMode", {$set: {value: "inGame"}});
  GameVariables.update("cycleNumber", {$set: {value: 1}});
  GameVariables.update("lastGameResult", {$set: {enabled: false}});

  // Clear the variables relating to each player
  Players.find({joined: true}).forEach(function(player) {
    if (!player.bot) {
      Players.update(player._id, {
        $set: {
          seenEndgame: false,
          alive: true,
          doNothing: false,
          seenNewEvents: false,
          seenNightResults: true,
          nightActionDone: false,
          effect: "none",
          seenDeath: false,
          deathDetails: {cycle: 0, type: "none"},
          target: 0
        }
      });
    }
  });

  // Clear the event list on starting a new game
  EventList.remove({});

  if (!GameVariables.findOne("rolesAssigned").value) {

    // Calculate the number of werewolves
    var numPlayers = Players.find({joined: true}).count();
    var numWW      = Math.floor(numPlayers / 3);

    // Get the role ids of the werewolf and villager
    wwId = Roles.findOne({name: "Werewolf"})._id;
    vId  = Roles.findOne({name: "Villager"})._id;

    // Find all the non critical enabled roles
    enabledRoles = Roles.find({enabled: true, critical: false});

    // This is the array that will hold the roles to assign
    var roleIds = [];
    // This for loop adds all the werewolves
    for (var i = 0; i < numWW; i++) {
      roleIds.push(wwId);
    }
    // This Mongo for each loop adds the enabled non-critical roles
    enabledRoles.forEach(function (role) {
      roleIds.push(role._id);
    });
    // This for loop adds the remaining villagers
    var addedRolesNum = roleIds.length;
    for (i = 0; i < (numPlayers - addedRolesNum); i++) {
      roleIds.push(vId);
    }

    // Now use the Knuth shuffle function on the array
    arrayShuffle(roleIds);

    // Map these roles onto the players
    Players.find({joined: true}).map(function (player, index) {
      Players.update(player._id, {$set: {role: roleIds[index]}});

      console.log("Player " + player.name + " given " + Roles.findOne(roleIds[index]).name);
    });

    GameVariables.update("rolesAssigned", {$set: {value: true}});
  }
}

function cancelVote() {
  GameVariables.update("voteDirection", {$set: {value: false, enabled: true}});
  executeVote();
}

function executeVote() {
  // The countdown has elapsed, execute the vote decision!!
  var cycleNumber = GameVariables.findOne("cycleNumber").value;
  var voteDirection = GameVariables.findOne("voteDirection").value;
  var target = Players.findOne(GameVariables.findOne("lynchVote").value[0]);
  var nominator = Players.findOne(GameVariables.findOne("lynchVote").value[1]);
  stopLynchCountdown();

  var voteText = nominator.name + "'s nomination for " + target.name + " to be lynched";

  // Fill in the rest of the vote text depending on outcome of vote
  voteText += voteDirection ? " has passed." : " has failed.";
  EventList.insert({type: "info", cycleNumber: cycleNumber, text: voteText, timeAdded: new Date()});

  if (voteDirection) {
    // Lynch the target!!
    Players.update(target._id, {$set: {alive: false, deathDetails: {cycle: cycleNumber, type: "lynch"}}});

    var targetsRole = Roles.findOne(target.role);

    var targetDiedText = target.name + " has been lynched!";
    if (GameSettings.findOne("revealRole").day) {
      if (targetsRole.name != "Werewolf" && targetsRole.name != "Villager")
        targetDiedText += " They were the " + targetsRole.name + ".";
      else
        targetDiedText += " They were a " + targetsRole.name + ".";
    }

    var deathType = "";
    if (targetsRole.name == "Werewolf")
      deathType = "wwDeath";
    else
      deathType = "vDeath";

    EventList.insert({type: deathType, cycleNumber: cycleNumber, text: targetDiedText, timeAdded: new Date()});

    // We should also check if the target is the saint, as they take the nominator with them
    if (targetsRole.name == "Saint") {
      var nominatorsRole = Roles.findOne(nominator.role);

      Players.update(nominator._id, {$set: {alive: false, deathDetails: {cycle: cycleNumber, type: "saint"}}});

      var nominatorDiedText = nominator.name + " has been struck down by the heavens because ";
      nominatorDiedText += target.name + " was a Saint!";

      if (GameSettings.findOne("revealRole").day) {
        if (nominatorsRole.name != "Werewolf" && nominatorsRole.name != "Villager")
          nominatorDiedText += " They were the " + nominatorsRole.name + ".";
        else
          nominatorDiedText += " They were a " + nominatorsRole.name + ".";
      }

      if (nominatorsRole.name == "Werewolf")
        deathType = "wwDeath";
      else
        deathType = "vDeath";

      EventList.insert({type: deathType, cycleNumber: cycleNumber, text: nominatorDiedText, timeAdded: new Date()});
    }

    moveToNextCycle();
  }

  // Reset the related global variables
  GameVariables.update("timeToVoteExecution", {$set: {value: 0, enabled: false}});
  GameVariables.update("voteDirection", {$set: {value: false, enabled: false}});
  GameVariables.update("lynchVote", {$set: {value: [0, 0], enabled: false}});
  // Prepare players for night time / reset for day
  var players = Players.find({alive: true});
  players.forEach(function(player) {
    Players.update(player._id, {$set: {doNothing: false}});
    if (!player.bot)
      Players.update(player._id, {$set: {nightActionDone: false}});
  });
}

function numWerewolves() {
  // Get the number of players that have joined in the lobby
  var numPlayers = Players.find({joined: true}).count();

  return Math.floor(numPlayers / 3);
}

function arrayShuffle(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}