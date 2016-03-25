getPlayer = function() {
  var user = Meteor.user();

  if (user)
    return Players.findOne({userId: user._id});
  else
    console.log("You are not logged in, so you have no player object");
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