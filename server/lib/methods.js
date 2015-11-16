Meteor.methods({
  addPlayer: function(user) {
    Players.insert({
      userId: user._id,
      name:   user.username,
      role:   0,
      status: 0,
      alive: true,
      joined: true,
      ready:  false
    });
  },
  // This is called when a client thinks it's time to start the game
  startGame: function() {
    // Set the variables dealing with the game starting
    GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
    GameVariables.update("gameMode", {$set: {value: "inGame"}});

    // Calculate the number of werewolves
    var numPlayers = Players.find({joined: true}).count();
    var numWW = Math.floor(numPlayers / 3);

    // Get the role ids of the werewolf and villager
    wwId = Roles.findOne({name: "Werewolf"})._id;
    vId = Roles.findOne({name: "Villager"})._id;

    // Find all the non critical enabled roles
    enabledRoles = Roles.find({enabled: true, critical: false});

    // This is the array that will hold the roles to assign
    var roleIds = [];
    // This for loop adds all the werewolves
    for (var i = 0; i < numWW; i++) {
      roleIds.push(wwId);
    }
    // This Mongo for each loop adds the enabled non-critical roles
    enabledRoles.forEach(function(role) {
      roleIds.push(role._id);
    });
    // This for loop adds the remaining villagers
    for (var i = 0; i < (numPlayers - roleIds.length); i++) {
      roleIds.push(vId);
    }

    // Now use the Knuth shuffle function on the array
    arrayShuffle(roleIds);

    // Map these roles onto the players
    Players.find({joined: true}).map(function(player, index, cursor) {
      player.role = roleIds[index];

      console.log("Player " + player.name + " given " + Roles.findOne(player.role).name);
    });
  },
  "getRoleId": function(user) {
    return Roles.findOne(Players.findOne({userId: user._id}).role);
  }
});

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