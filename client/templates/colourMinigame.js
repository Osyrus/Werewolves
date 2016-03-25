var colours = ["Red", "Orange", "Green", "Blue", "Purple", "Grey", "Pink"];
var timeout = null;

Template.coloursGame.helpers({
  gameVars: function() {
    var vars = getPlayer().gameVars;
    Session.set("statusText", "Choose the colour as it is written.");

    return vars ? vars : [];
  },
  statusText: function() {
    return Session.get("statusText");
  }
});

Template.coloursGame.events({
  "click .js-correct": function() {
    Session.set("statusText", "Correct, good work!");

    Meteor.setTimeout(function() {
      Meteor.call("finishedNightAction");
    }, 3000);
  },
  "click .js-incorrect": function() {
    Session.set("statusText", "Incorrect!");

    if (!timeout)
      Meteor.clearTimeout(timeout);

    timeout = Meteor.setTimeout(function() {
      Session.set("statusText", "Remember to choose the WRITTEN colour");
    }, 2000);
  }
});

generateColourGameVars = function() {
  // First we get the number of colours we have to play with
  var numColours = colours.length;

  // Next we need to get two randomly shuffled arrays, one for the labels and one for the display colours
  // Copy the colours array into each (otherwise it will pass by reference, which mackes them the same!)
  var randColours1 = colours.slice();
  var randColours2 = colours.slice();
  // Now shuffle them
  arrayShuffle(randColours1);
  arrayShuffle(randColours2);

  console.log("The rand1 array: " + randColours1);

  // Now we need to choose a random colour to use as our "correct answer"
  var correctIndex = Math.floor(Math.random() * numColours);
  console.log("Chosen random index: " + correctIndex);

  // Now we need to generate the list that will pass to the HTML template that shows the answer list
  var possibleAnswers = [];
  for (i = 0; i < numColours; i++) {
    possibleAnswers.push({
      text: randColours1[i], // This will be what is WRITTEN in the i'th item of the list
      colourTag: randColours2[i].toLowerCase(), // This will be the ACTUAL COLOUR of that item
      jsTag: i == correctIndex ? "js-correct" : "js-incorrect" // This is where the correct answer is determined
    });
  }

  // We also need to print the desired answer at the top of the screen
  var correctColour = randColours1[correctIndex];
  console.log("The correct colour is: " + correctColour);

  // Now pass these to the template
  return {
    colour: correctColour,
    colourTag: correctColour.toLowerCase(),
    answers: possibleAnswers
  };
};