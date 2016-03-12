Template.splashScreen.helpers({
  btn1: function() {
    var text = "";
    var colour = "";
    var tag = "";

    if (Meteor.user()) {
      var currentGameMode = GameVariables.findOne("gameMode");

      if (currentGameMode.value == "lobby") {
        tag = "js-goto-game";
        text = "Join Lobby";
        colour = "blue";
      } else {
        text = "Game already running...";
        tag = "";
        colour = "";
      }

      var player = getPlayer();

      if (player) {
        if (player.joined && currentGameMode.value == "inGame") {
          if (player.alive) {
            text = "Rejoin Game";
            colour = "green";
            tag = "js-goto-game";
          } else {
            text = "You died...";
            colour = "red";
            tag = "";
          }
        }
      }
    } else {
      text = "Login";
      tag = "js-goto-login";
      colour = "blue";
    }

    return {
      text: text,
      colour: colour,
      tag: tag
    }
  },
  btn2: function() {
    var text = "";
    var colour = "blue";
    var tag = "";

    var currentGameMode = GameVariables.findOne("gameMode");

    if (currentGameMode.value == "inGame") {
      text = "Spectate";
      tag = "js-goto-spectate";
    } else {
      text = "No game to spectate";
      colour = "grey";
    }

    return {
      text: text,
      colour: colour,
      tag: tag
    }
  },
  btnLabel: function() {
    var text = "";
    var colour = "";

    var currentGameMode = GameVariables.findOne("gameMode");

    if (currentGameMode.value == "inGame") {
      text = "Game in Progress";
      colour = "grey";
    } else {
      text = "Ready for New Game";
      colour = "green";
    }

    return {
      text: text,
      colour: colour
    }
  }
});

Template.splashScreen.events({
  "click .js-goto-game": function(event) {
    event.preventDefault();

    // Make sure there is a player before they go to the game screen
    var player = getPlayer();

    if (player) {
      Players.update(player._id, {$set: {joined: false, seenEndgame: true}});
    } else {
      Meteor.call("addPlayer");
    }

    FlowRouter.go('/game');
  },
  "click .js-goto-login": function(event) {
    event.preventDefault();

    FlowRouter.go('/sign-in');
  },
  "click .js-goto-spectate": function(event) {
    event.preventDefault();

    FlowRouter.go('/spectate');
  },
  "click .js-logout": function(event) {
    event.preventDefault();

    AccountsTemplates.logout();
  },
  "click .js-view-last-game": function(event) {
    event.preventDefault();

  // TODO this is where the client is redirected to the view of the last game
  }
});