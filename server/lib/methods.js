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
      rank: 0
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

    // Add their ids to a javascript array
    var roleIds = [];
    enabledRoles.forEach(function(role) {
      roleIds.push(role._id);
    });

    // Assign the werewol(ves/f) randomly to the necessary number of people
    Players.find({joined: true}).forEach(function(player) {
      player.rank = Math.random();
    });

    var wwAdded = 0;
    Players.find({joined: true}, {sort: {rank: -1}}).map(function(player) {
      // Add werewolves
      if (wwAdded < numWW) {
        player.role = wwId;
        wwAdded++;
      } else if (roleIds.length > 0) {
        player.role = roleIds.pop();
      } else {
        player.role = vId;
      }

      console.log("Player " + player.name + " given " + Roles.findOne(player.role).name);
    });
  },
  "getRoleId": function(user) {
    return Roles.findOne(Players.findOne({userId: user._id}).role);
  }
});