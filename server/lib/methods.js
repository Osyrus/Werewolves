Meteor.methods({
  addPlayer: function(user) {
    Players.insert({
      userId: user._id,
      name:   user.username,
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
      bot: false
    });
  },
  // This is called when a client thinks it's time to start the game
  startGame: function() {
    // Set the variables dealing with the game starting
    GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
    GameVariables.update("gameMode", {$set: {value: "inGame"}});
    GameVariables.update("cycleNumber", {$set: {value: 1}});

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

    // Now we need to get a hold of all the alive players
    var players = Players.find({alive: true});
    // The number of voters is all the alive players, minus the target
    var numVoters = players.count() - 1;
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
    if (newVotesFor > newVotesAgainst) {
      if (newVotesFor > Math.floor(numVoters/2)) {
        console.log("Majority reached to lynch.");

        GameVariables.update("voteDirection", {$set: {value: true, enabled: true}});
      } else {
        // No majority, clear the relevant variables
        GameVariables.update("voteDirection", {$set: {enabled: false}});
        GameVariables.update("timeToVoteExecution", {$set: {value: 0, enabled: false}});
      }
    } else {
      if (newVotesAgainst > Math.floor(numVoters/2)) {
        console.log("Majority reached not to lynch.");

        GameVariables.update("voteDirection", {$set: {value: false, enabled: true}});
      } else {
        // No majority, clear the relevant variables (code repeated, I know... I feel bad...)
        GameVariables.update("voteDirection", {$set: {enabled: false}});
        GameVariables.update("timeToVoteExecution", {$set: {value: 0, enabled: false}});
      }
    }

    // Now that we know if there is a majority and in that case, which way the vote is going...
    if (GameVariables.findOne("voteDirection").enabled) {
      // If indeed a majority was reached, lets check that there isn't already a count in progress.
      // First, lets check if there was already a majority in this direction before.
      if (GameVariables.findOne("voteDirection").value) {
        // Lets see if the original tally favoured this direction
        if (votesFor > votesAgainst) {
          // If we got here, that means that new votes came in, but they did not change the fact that there is
          // a majority to lynch, so we do nothing and the countdown will continue.
          console.log("Still a majority to lynch.");
        } else {
          // If we got here, that means there wasn't a majority before to lynch, so we should start the clock.
          startLynchCountdown();
          console.log("Starting countdown to lynch.");
        }
      } else {
        // Lets see if the original tally favoured this direction instead
        if (votesFor < votesAgainst) {
          // If we got here, then there was already a majority not to lynch, so we do nothing here as well.
          console.log("Still a majority to not lynch.");
        } else {
          // If we got here, that means that there wasn't a majority to not lynch before, so start the clock.
          startLynchCountdown();
          console.log("Starting countdown not to lynch.");
        }
      }
    }
  },
  "executeVote": function() {
    // The countdown has elapsed, execute the vote decision!!
    var cycleNumber = GameVariables.findOne("cycleNumber").value;
    var voteDirection = GameVariables.findOne("voteDirection").value;
    var target = Players.findOne(GameVariables.findOne("lynchVote").value[0]);

    if (voteDirection) {
      // This means the day is over, so make an event for that

      var dayEndedOnLynchText = "The vote is complete and with that marks the end of the day.";

      EventList.insert({type: "info", cycleNumber: cycleNumber, text: dayEndedOnLynchText});

      // Lynch the target!!
      Players.update(target._id, {$set: {alive: false}});

      var targetsRole = Roles.findOne(target.role);

      var targetDiedText = target.name + " has been lynched!";
      if (targetsRole.name != "Werewolf" && targetsRole.name != "Villager")
        targetDiedText += " They were the " + targetsRole.name;
      else
        targetDiedText += " They were a " + targetsRole.name;

      var deathType = "";
      if (targetsRole.name == "Werewolf")
        deathType = "wwDeath";
      else
        deathType = "vDeath";

      EventList.insert({type: deathType, cycleNumber: cycleNumber, text: targetDiedText});

      // We should also check if the target is the saint, as they take the nominator with them
      if (targetsRole.name == "Saint") {
        var nominator = Players.findOne(GameVariables.findOne("lynchVote").value[1]);

        Players.update(nominator._id, {$set: {alive: false}});

        var nominatorDiedText = nominator.name + " has been struck down by the heavens because ";
        nominatorDiedText += target.name + " was a Saint!";

        EventList.insert({type: "vDeath", cycleNumber: cycleNumber, text: nominatorDiedText});
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
  },
  "doingNothingToday": function() {
    var cycleNumber = GameVariables.findOne("cycleNumber").value;

    var didNothingText = "The day moves into night with the villagers choosing not to lynch anyone.";

    EventList.insert({type: "info", cycleNumber: cycleNumber, text: didNothingText});

    // Prepare players for night time
    var players = Players.find({alive: true});
    players.forEach(function(player) {
      if (!player.bot)
        Players.update(player._id, {$set: {nightActionDone: false}});
    });

    moveToNextCycle();
  },
  "endNightCycle": function() {
    console.log("End night cycle has been called.");

    var cycleNumber = GameVariables.findOne("cycleNumber").value;

    var nightEndText = "The night has ended...";
    EventList.insert({type: "info", cycleNumber: cycleNumber, text: nightEndText});

    // Here is where the night cycle needs to be computed

    // Need to kill whoever the werewolves picked UNLESS they have the "save" effect, or are the Saint
      // Need to generate an event based on that

    // Get the werewol(f/ves) target id
    var werewolf = Roles.findOne({name: "Werewolf"});
    var werewolfTargetId = werewolf.target;
    // Get the doctors target id
    var doctorsTargetId = Roles.findOne({name: "Doctor"}).target;
    // Get the saints id
    var saint = Players.findOne({role: Roles.findOne({name: "Saint"})._id});
    var saintsId = 0;
    if (saint != undefined) {
      saintsId = saint._id;
    }

    // Now lets check if the werewolves are indeed allowed to kill their target
    if (werewolfTargetId != doctorsTargetId && werewolfTargetId != saintsId && werewolfTargetId != 0) {
      // It seems this player is doomed
      var target = Players.findOne(werewolfTargetId);

      // Sorry mate...
      Players.update(werewolfTargetId, {$set: {alive: false}});

      // Now lets inform everyone
      var wwKillText = target.name + " has been killed during the night!";
      EventList.insert({type: "vDeath", cycleNumber: cycleNumber, text: wwKillText});
    } else {
      // Phew, that player sure is happy about this outcome...

      // Better let everybody know the good news
      var noDeathText = "Nobody was killed during the night";
      EventList.insert({type: "info", cycleNumber: cycleNumber, text: noDeathText});
    }
    // Now to reset the werewolf target
    Roles.update(werewolf._id, {$set: {target: 0}});

    // Need to generate an event for what the witch has done
    var witchesTargetId = Roles.findOne({name: "Witch"}).target;
    var witchesTarget = Players.findOne(witchesTargetId);
    // Now to generate some text and the event
    if (witchesTarget != undefined) {
      var witchesText = witchesTarget.name + " was hexxed during the night, and can't speak today!";
      EventList.insert({type: "warning", cycleNumber: cycleNumber, text: witchesText});
    }

    moveToNextCycle();
  },
  "setRoleTarget": function(roleId, targetId) {
    Roles.update(roleId, {$set: {target: targetId}});
  },
  "getRoleTarget": function(roleName) {
    var role = Roles.findOne({name: roleName});

    return Players.findOne(role.target);
  }
});

function moveToNextCycle() {
  var players = Players.find({alive: true});

  // Reset all the variables for the players, to be ready for the next day/night cycle
  players.forEach(function(player) {
    Players.update(player._id, {$set: {seenNewEvents: false}});

    if (!player.bot) {
      //Players.update(player._id, {$set: {nightActionDone: false}});
      Players.update(player._id, {$set: {doNothing: false}});
    }
  });

  GameVariables.update("cycleNumber", {$inc: {value: 1}});
}

function startLynchCountdown() {
  var executeTime = (new Date()).valueOf() + 5100; // execute 5 seconds from now (magic number, I know...)

  GameVariables.update("timeToVoteExecution", {$set: {value: executeTime, enabled: true}});
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