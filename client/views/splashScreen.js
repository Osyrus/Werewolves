Template.splashScreen.helpers({
  btn1: function() {
    var text = "";
    var colour = "";
    var tag = "";
    var icon = "";

    if (Meteor.user()) {
      var currentGameMode = GameVariables.findOne("gameMode");

      if (!currentGameMode) {
        return;
      }

      if (currentGameMode.value == "lobby") {
        tag = "js-goto-game";
        text = "Join Lobby";
        colour = "blue";
        icon = "share";
      } else {
        text = "Game already running...";
        tag = "";
        colour = "";
        icon = "setting";
      }

      var player = getPlayer();

      if (player) {
        if (player.joined && currentGameMode.value == "inGame") {
          if (player.alive) {
            text = "Rejoin Game";
            colour = "green";
            tag = "js-goto-game";
            icon = "share";
          } else {
            text = "You died... (join anyway)";
            colour = "red";
            tag = "js-goto-game";
            icon = "share";
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
      tag: tag,
      icon: icon
    }
  },
  btn2: function() {
    var text = "";
    var colour = "blue";
    var tag = "";
    var icon = "";

    var currentGameMode = GameVariables.findOne("gameMode");

    if (!currentGameMode) {
      return;
    }

    if (currentGameMode.value == "inGame") {
      text = "Spectate";
      tag = "js-goto-spectate";
      icon = "find";
    } else {
      text = "No game to spectate";
      colour = "grey";
      icon = "hide";
    }

    return {
      text: text,
      colour: colour,
      tag: tag,
      icon: icon
    }
  },
  btnLabel: function() {
    var text = "";
    var colour = "";

    var currentGameMode = GameVariables.findOne("gameMode");

    if (!currentGameMode)
      return;

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
      var gameMode = GameVariables.findOne("gameMode").value;
      // Only change the players joined state if they are heading into the lobby
      if (gameMode == "lobby")
        Players.update(player._id, {$set: {joined: true, seenEndgame: true}});
    } else {
      Meteor.call("addPlayer");
    }

    // Reset the start game countdown
    Meteor.call("stopStartCountdown");
    Session.set("seenRole", false);

    // As the enabled roles vote count is dependant on the number of people, we need to do a recount.
    Meteor.call("recountRoleVotes");

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
  "click .js-viewGameHistories": function(event) {
    event.preventDefault();

    FlowRouter.go('/gameHistories');
  }
});