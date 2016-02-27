getPlayer = function() {
  return Players.findOne({userId: Meteor.user()._id});
};

getAlivePlayers = function() {
  return Players.find({alive: true});
};

arrayShuffle = function(array) {
  var currentIndex = array.length
    , temporaryValue
    , randomIndex;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
};