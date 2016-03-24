Template.gameDetail.helpers({
  game: function() {
    // First we need the game, so get it's id from the URL
    var gameId = FlowRouter.getParam("id");
    // Now pull that game from the database
    var game = GameHistory.findOne(gameId);

    // There is no point going further if there is no game for this ID
    if (game) {
      // TODO parse the game into bits of relevant info and pass it to the template to render
    } else {
      console.log("Game ID not in database");
      // Kick them back to the previous game list
      FlowRouter.go('/gameHistories');
    }
  }
});

Template.gameDetail.events({

});