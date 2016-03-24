FlowRouter.route('/', {
  action: function() {
    BlazeLayout.render("mainLayout", {content: "splashScreen"});
  }
});

FlowRouter.route('/game', {
  triggersEnter: [function(context, redirect) {
    var allow = true;

    // The player must be logged in
    if (Meteor.user()) {
      // If the game is running we must check that the player is in this game to allow them in
      var currentGameMode = GameVariables.findOne("gameMode");
      if (currentGameMode.value == "inGame") {
        // The user must have a player entry if they are playing, check that
        var player = getPlayer();
        if (player) {
          // If they have an entry, they must be joined to be allowed into a running game
          if (!player.joined)
            allow = false;
        } else {
          allow = false;
        }
      }
    } else {
      allow = false;
    }

    if (!allow)
      redirect('/');
  }],
  action: function() {
    BlazeLayout.render("mainLayout", {navbar: "navbar", content: "gameScreen"});
  },
  triggersExit: [function(context, redirect) {
    // This is where we prevent the user from being able to leave the game if they are playing
    var player = getPlayer();

    if (player) {
      var currentGameMode = GameVariables.findOne("gameMode");

      // If the game is running and the player is in the game and alive, they aren't allow to leave this screen
      if (currentGameMode.value == "inGame" && player.joined && player.alive)
        redirect(context.path);
    }
  }]
});

FlowRouter.route('/spectate', {
  triggersEnter: [function(context, redirect) {
    // Check if there is a game in progress
    var currentGameMode = GameVariables.findOne("gameMode");
    if (currentGameMode.value == "inGame") {
      // In the case that there is, make sure that the current user is not in that game (otherwise it's cheating!!)
      var player = getPlayer();
      if (player) {
        // So they have a player entry, but they may not be joined...
        if (player.joined) {
          // Cheeky buggers are in the current game, no spectating for you!
          console.log("You are already in the game, you can't spectate!");
          redirect('/'); // Should really send them to game, but not for now...
        }
      }
    }
  }],
  action: function() {
    BlazeLayout.render("mainLayout", {content: "spectatorScreen"});
  }
});