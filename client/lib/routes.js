FlowRouter.route('/', {
  action: function() {
    BlazeLayout.render("mainLayout", {content: "splashScreen"});
  }
});

// TODO make sure you can only get here if logged in, and no game in progress
FlowRouter.route('/game', {
  action: function() {
    BlazeLayout.render("mainLayout", {navbar: "navbar", content: "gameScreen"});
  }
});

// TODO make sure you can only get here if there is a game in progress and the client is not in it
FlowRouter.route('/spectate', {
  action: function() {
    BlazeLayout.render("mainLayout", {content: "spectatorScreen"});
  }
});