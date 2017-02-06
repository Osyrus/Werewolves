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