Template.gameScreen.helpers({
  // These are the helpers that tell the html which screen to show
  lobby: function() {
    var currentGameMode = GameVariables.findOne("gameMode");

    if (Meteor.user() != null && currentGameMode) {
      var player = Players.findOne({userId: Meteor.userId()});

      if (player == undefined) {
        return true;
      } else if (!player.joined) {
        return true;
      } else {
        return currentGameMode.value == "lobby";
      }
    } else {
      return true; // This could force the login page here
    }
  },
  viewingLastGame: function() {
    var player = getPlayer();

    return player ? !player.seenEndgame : false;
  },
  inGame: function() {
    var currentGameMode = GameVariables.findOne("gameMode");

    return currentGameMode ? currentGameMode.value == "inGame" : false;
  },
  whoAmIScreen: function() {
    var currentGameMode = GameVariables.findOne("gameMode").value;

    if (currentGameMode == "inGame") {
      return !Session.get("seenRole");
    }

    return false;
  },
  alive: function() {
    var player = getPlayer();

    return !player.seenNightResults ? true : player.alive;
  },
  spectating: function() {
    return Session.get("spectating");
  }
});