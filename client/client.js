// These are the dependency trackers to make sure things are reactive
var votesDep = new Tracker.Dependency;
var startDep = new Tracker.Dependency;

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

    return currentGameMode == "lobby";
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
    var player = getPlayer();
    if (player) {
      Players.update(player._id, {$set: {joined: true}});
    } else {
      Meteor.call("addPlayer", Meteor.user());
    }

    // Reset the start game countdown
    GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});

    // As the enabled roles vote count is dependant on the number of people, we need to do a recount.
    countVotes();
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
    if (TimeSync.isSynced()) {
      // Check to see if there is already a countdown
      if (TimeSync.serverTime() < GameVariables.findOne("timeToStart").value) {
        GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
      } else {
        // If there is no countdown, start one
        var date      = new Date();
        var startTime = date.valueOf() + 5100; // start 5 seconds from now (magic number, I know...)

        GameVariables.update("timeToStart", {$set: {value: TimeSync.serverTime(startTime, 500), enabled: true}}); // Update every half second
      }

      startDep.changed();
    } else {
      TimeSync.resync();
    }
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
  }
});

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

// This currently just works in the lobby (as it uses 'alive' to determine if the player has joined).
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

function getPlayer() {
  return Players.findOne({userId: Meteor.user()._id});
}

function allReady() {
  var playersTotal = Players.find({joined: true}).count();
  var playersReady = Players.find({ready: true}).count();

  return playersReady == playersTotal;
}