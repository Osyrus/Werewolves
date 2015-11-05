// This is the collection holding all the players in the game
Players = new Mongo.Collection("players");
// userId: the _id of the user
// name: The players name, can be drawn from username of user
// roleId: The players role, set at the start of the game and used to
//       set the players behavior during the game
// status: This will hold information about a players status, for
//         example, if they are cursed/silenced/saved etc...
// alive: A boolean setting the player to be alive or dead
// ready: A boolean used while in the lobby to indicate readyness to
//        start the game

Roles = new Mongo.Collection("roles");
// name: The human readable name of the role
// votes: Store the number of votes the role got for later calculations
// order: The order that the votes puts the role relative to the others
// enabled: After calculating the votes, is this role going to be in game?
// critical: A boolean that determines if this is a necessary role (e.g. Villager and Werewolf)
//           If this is true, then they are not voted on and not part of that calculation.

RoleVotes = new Mongo.Collection("votes");
// roleId: The role Id the vote corresponds to
// playerId: The player that made the vote
// vote: The value of the vote that the player made for this role

// Game state is used for switching out the HTML shown to the client
var gameState = 1;
// 1: List the players and let the users become players, this is essentially the lobby
// 2: 

var votesDep = new Tracker.Dependency;

if (Meteor.isClient) {
  Template.body.helpers({
    players: function() {
      return Players.find({alive: true});
    },

    roles: function() {
      return Roles.find({critical: false});
    },

    playerCounter: function() {
      var playersTotal = Players.find({alive: true}).count();
      var playersReady = Players.find({ready: true}).count();

      return String(playersReady) + "/" + String(playersTotal);
    },

    gameState: function() {
      return gameState;
    },

    joined: function() {
  var player = Players.findOne({userId: Meteor.user()._id});
      return player != undefined ? player.alive : false;
    },

    ready: function() {
      var player = Players.findOne({userId: Meteor.user()._id});

      return player.ready;
    }
  });

  Template.body.events({
    "click .join-game": function() {
      var player = getPlayer();
      if (player) {
        Players.update(player._id, {$set: {alive: true}});
      } else {
        Players.insert({
          userId: Meteor.user()._id,
          name: Meteor.user().username,
          role: 0,
          status: 0,
          alive: true,
          ready: false
        });
      }

      // As the enabled roles vote count is dependant on the number of people, we need to do a recount.
      countVotes();
    },
    "click .leave-game": function() {
      var player = getPlayer();
      Players.update(player._id, {$set: {alive: false}});
      Players.update(player._id, {$set: {ready: false}});
    },
    "click .set-ready": function() {
      var player = getPlayer();
      Players.update(player._id, {$set: {ready: true}});
    },
    "click .set-nready": function() {
      var player = getPlayer();
      Players.update(player._id, {$set: {ready: false}});
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
      if (getVote(this._id) != 1) {
        console.log("Voted up: " + Roles.findOne(this._id).name);
        changeVote(this._id, 1);
      }
    },
    "click .vote-neutral": function() {
      if (getVote(this._id) != 0) {
        console.log("Voted neutral: " + Roles.findOne(this._id).name);
        changeVote(this._id, 0);
      }
    },
    "click .vote-down": function() {
      if (getVote(this._id) != -1) {
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
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // Create the fake players for testing
    Players.remove({});

    addTestPlayer("Fred");
    addTestPlayer("Steve");
    addTestPlayer("Bob");

    // Create the roles
    Roles.remove({});

    addRole("Villager", true);
    addRole("Werewolf", true);
    addRole("Doctor", false);
    addRole("Witch", false);
    addRole("Seer", false);
    addRole("Knight", false);
    addRole("Saint", false);

    // Clear the votes upon server restart
    RoleVotes.remove({});
  });
}

function addTestPlayer(name) {
  Players.insert({
    userId: 7,
    name: name,
    role: 0,
    status: 0,
    alive: true,
    ready: false
  });
}

// Note: The order that the roles are added will determine their tiebreaker order (when counting votes)
function addRole(name, critical) {
  Roles.insert({
    name: name,
    votes: 0,
    enabled: critical,
    critical: critical
  });
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
  var numVillagers = Players.find({alive: true}).count() - numWerewolves();

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
  var numPlayers = Players.find({alive: true}).count();

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