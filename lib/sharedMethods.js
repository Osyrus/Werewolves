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
      doingNightAction: false,
      nightActionDone: false,
      effect: "none",
      bot: false,
      seenDeath: false,
      deathDetails: {cycle: 0, type: "none"}, // (types: lynch, saint, werewolf)
      target: 0,
      seenEndgame: true,
      seenRole: true
    });
  },
  currentCycle: function() {
    return GameVariables.findOne("cycleNumber").value;
  },
  seenRole: function(seen) {
    // This is called by the player to set if they have seen their role (view/dismiss the screen)
    // The argument is a boolean (true to show the page, false to dismiss it).
    Players.update(getPlayer()._id, {$set: {seenRole: seen}});
  },
  changeLynchVote: function(vote) {
    // A client has called that it would likes it's players vote to be changed

    // Make sure that there is a vote in progress first
    if (GameVariables.findOne("lynchVote").enabled) {
      // First, we update the vote for that player
      Players.update(getPlayer()._id, {$set: {voteChoice: vote}});

      // Now we call the server function that checks over the votes to see if this changes anything
      Meteor.call("checkLynchVotes");
    }
  },
  setRoleTarget: function(roleId, targetId) {
    // var role = Roles.findOne(roleId);
    // var target = Players.findOne(targetId);

    // console.log("Setting " + role.name + " target to " + target.name);

    Roles.update(roleId, {$set: {target: targetId}});
  },
  changeRoleVote: function(roleId, newVote) {
    //// The client wishes to change their vote on one of the roles

    var playerId = getPlayer()._id;

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

    // Now the role vote has been updated or created, we need to check for consequences (servers job)
    Meteor.call("checkRoleVote", roleId);
  },
  changeWerewolfVote: function(targetId) {
    // Update the werewolf that requested it
    Players.update(getPlayer()._id, {$set: {target: targetId}});

    // Now let's check if they all agree or not... (server-side)
    Meteor.call("checkWerewolfVote");
  },
  doNightAction: function() {
    // This function is called from the client by the player to indicate they want to do their night action.
    var player = getPlayer();

    if (player)
      console.log("Do night action called by: " + player.name);
    else
      console.log("Do night action called. Player object is invalid?!");

    // If the player is passive, we need to generate the variables they need at night.
    if (Roles.findOne(player.role).passive) {
      console.log(player.name + " is passive, assigning colours for minigame.");
      Players.update(player._id, {$set: {gameVars: generateColourGameVars()}});
      console.log(player.name + " has been assigned colours.");
    } else {
      console.log(player.name + " is active, nothing to assign.");
    }

    // In either case, switch the player to night action mode.
    Players.update(player._id, {$set: {doingNightAction: true}});
  }
});