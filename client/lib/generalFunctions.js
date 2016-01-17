getPlayer = function() {
  return Players.findOne({userId: Meteor.user()._id});
}

getAlivePlayers = function() {
  return Players.find({alive: true});
}