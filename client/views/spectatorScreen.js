Template.spectatorScreen.events({
  "click .js-endSpectate": function() {
    var player = getPlayer();

    if (player)
      if (player.joined)
        FlowRouter.go('/game');
      else
        FlowRouter.go('/');
    else
      FlowRouter.go('/');
  }
});