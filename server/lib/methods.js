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
      doNothing: false
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
  "currentCycle": function() {
    return GameVariables.findOne("cycleNumber").value;
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
    // Set all the players back to neutral
    var players = Players.find({alive: true});
    players.forEach(function(player) {
      Players.update(player._id, {$set: {doNothing: false}});
    });
  },
  "doingNothingToday": function() {
    var cycleNumber = GameVariables.findOne("cycleNumber").value;

    var didNothingText = "The day moves into night with the villagers choosing not to lynch anyone.";

    EventList.insert({type: "info", cycleNumber: cycleNumber, text: didNothingText});

    moveToNextCycle();
  }
});

function moveToNextCycle() {
  var players = Players.find({alive: true});

  players.forEach(function(player) {
    Players.update(player._id, {$set: {seenNewEvents: false}});
  });

  GameVariables.update("cycleNumber", {$inc: {value: 1}});
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