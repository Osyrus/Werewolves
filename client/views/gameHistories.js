Template.gameHistories.helpers({
  previousGames: function() {
    var games = GameHistory.find({});

    // TODO filter out the games that are finished and pull out the relevant info to send to the template
  }
});

Template.gameHistories.events({
  "click .js-gotoGameHistory": function(event) {
    event.preventDefault();

    var gameId = this.id;

    FlowRouter.go("/gameHistory/" + gameId);
  }
});