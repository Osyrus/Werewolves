Meteor.methods({
  // This is called when a client thinks it's time to start the game
  startGame: function() {
    GameVariables.update("timeToStart", {$set: {value: 0, enabled: false}});
    GameVariables.update("gameMode", {$set: {value: "inGame"}});
  }
});