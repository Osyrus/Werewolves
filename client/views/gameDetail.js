Template.gameDetail.helpers({
  game: function() {
    // First we need the game, so get it's id from the URL
    var gameId = FlowRouter.getParam("id");
    // Now pull that game from the database
    var game = GameHistory.findOne(gameId);

    // There is no point going further if there is no game for this ID
    if (game) {
      // TODO parse the game into bits of relevant info and pass it to the template to render

      //// First grab that game events, needed all over...
      // This should be a normal array of objects
      var gameEvents = game.gameEvents;

      //// Title stuff
      // First, who won?
      var villagersWon = game.villagersWon;
      var titleText = villagersWon ? "Villager Victory" : "Werewolf Victory";
      var titleIcon = villagersWon ? "green tree" : "red paw";

      //// Time stuff
      // Next, when did the game end?
      var gameEndedAt = moment(game.gameEndedAt);
      var gameEndedAtText = "The game was finished at " + gameEndedAt.format('h:mm a, ddd Do MMM YY');
      // When did it start?
      var gameStartedAt = moment(game.gameStartedAt);
      // Next, how long did the game take to play?
      var gameDuration = gameEndedAt.twix(gameStartedAt);
      var gameDurationText = "It lasted for " + gameDuration.humanizeLength();
      var numCycles = gameEvents.length;
      var numCyclesText = "and took " + numCycles + " cycles";
      
      //// The surviving players
      var lastCycleEvents = gameEvents[numCycles - 1];
      var survivingPlayers = lastCycleEvents.playerList;
      var survivingPlayersArray = [];
      for (var i = 0; i < survivingPlayers.length; i++) {
        // This is where we need to make a list by parsing the user data
        var player = survivingPlayers[i];

        // Remember that each cycle event stores the player that just died as well
        if (!player.justDied) {
          var user = Meteor.users.findOne(player.userId);
          var name;
          var avatar = "";
          var facebook = false;
          var role = Roles.findOne(player.role).name;

          // Only players with valid users will get info pulled from their user profiles
          if (user) {
            facebook = !!user.services.facebook;

            if (facebook) {
              name = user.profile.name;
              avatar = "http://graph.facebook.com/" + user.services.facebook.id + "/picture/?type=large";
            } else {
              name = user.username;
            }
          } else {
            name = player.name;
          }

          survivingPlayersArray.push({
            name: name,
            playerName: player.name,
            facebook: facebook,
            role: role,
            avatar: avatar
          });
        }
      }

      //// Now we want the players that didn't make it
      // This should be all the players from the first cycle, minus the players from the last...

      var firstCycleEvents = gameEvents[0];
      var startingPlayers = firstCycleEvents.playerList;
      var killedPlayersArray = [];
      for (i = 0; i < startingPlayers.length; i++) {
        player = startingPlayers[i];
        var stillAlive = false; // Looking at you GLaDOS

        // Lets filter out the surviving players
        for (var j = 0; j < survivingPlayersArray.length; j++) {
          if (player.name == survivingPlayersArray[j].playerName)
            stillAlive = true;
        }

        if (!stillAlive) {
          // OK so they really are a dead player, lets add them to the array.
          user = Meteor.users.findOne(player.userId);
          avatar = "";
          facebook = false;
          role = Roles.findOne(player.role).name;

          // Only players with valid users will get info pulled from their user profiles
          if (user) {
            facebook = !!user.services.facebook;

            if (facebook) {
              name = user.profile.name;
              avatar = "http://graph.facebook.com/" + user.services.facebook.id + "/picture/?type=large";
            } else {
              name = user.username;
            }
          } else {
            name = player.name;
          }

          killedPlayersArray.push({
            name: name,
            playerName: player.name,
            facebook: facebook,
            role: role,
            avatar: avatar
          });
        }
      }

      //// This is where each cycles events must get parsed
      // The day and night cycles will have different info to show,
      // so the template will need a boolean flag to alternate the required template.

      // TODO write the events each cycle parsing and loading system

      return {
        titleText: titleText,
        titleIcon: titleIcon,
        gameDuration: gameDurationText,
        gameEndedAt: gameEndedAtText,
        numCycles: numCyclesText,
        survivingPlayers: survivingPlayersArray,
        killedPlayers: killedPlayersArray
      }
    } else {
      console.log("Game ID not in database");
      // Kick them back to the previous game list
      FlowRouter.go('/gameHistories');
    }
  }
});

Template.gameDetail.events({

});