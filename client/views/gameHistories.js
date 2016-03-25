Template.gameHistories.helpers({
  previousGames: function() {
    // Grab all the games that are complete (have been finished)
    var finishedGames = GameHistory.find({gameEndedAt: {$exists: true}});

    // This will be our array of the games to make buttons out of
    var previousGames = [];
    finishedGames.forEach(function (game) {
      var name = moment(game.gameEndedAt).format('ddd Do MMM YY - h:mm a');
      var colour;
      var icon;

      if (game.villagersWon) {
        name += " - Villager Victory";
        colour = "green";
        icon = "tree";
      } else {
        name += " - Werewolf Victory";
        colour = "red";
        icon = "paw";
      }

      previousGames.push({
        id: game._id,
        gameName: name,
        gameMeta: "Played " + moment(game.gameEndedAt).fromNow(),
        gameColour: colour,
        gameIcon: icon
      })
    });

    // Now return the result to the template
    return previousGames;
  },
  anyPreviousGames: function() {
    // Grab all the games that are complete (have been finished)
    var finishedGames = GameHistory.find({gameEndedAt: {$exists: true}});

    return finishedGames.count() > 0;
  }
});

Template.gameHistories.events({
  "click .js-gotoGameHistory": function(event) {
    event.preventDefault();

    var gameId = this.id;

    FlowRouter.go("/gameDetail/" + gameId);
  },
  "click .js-backToSplash": function(event) {
    event.preventDefault();

    FlowRouter.go('/');
  }
});