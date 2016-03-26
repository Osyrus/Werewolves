var seerDep = new Tracker.Dependency;

Template.nightTime.helpers({
  "passive": function() {
    return isRoleType("passive");
  },
  "werewolf": function() {
    return isRoleType("werewolf");
  },
  "doctor": function() {
    return isRoleType("doctor");
  },
  "witch": function() {
    return isRoleType("witch");
  },
  "seer": function() {
    return isRoleType("seer");
  },
  "nightActionDone": function() {
    return getPlayer().nightActionDone;
  },
  "doingNightAction": function() {
    return getPlayer().doingNightAction;
  }
});

Template.nightTime.events({
  "click .js-doNightAction": function(event) {
    event.preventDefault();

    console.log("Now calling doNightAction method.");

    // This is the shared method the player calls to say they want to do their night action
    Meteor.call("doNightAction");
  }
});

Template.werewolvesTargetList.helpers({
  "werewolfTargets": function() {
    // Find all the players that aren't werewolves to make a list of targets
    var werewolfId = Roles.findOne({name: "Werewolf"})._id;
    var nonWerewolves = Players.find({role: {$ne: werewolfId}, alive: true});
    var werewolves = Players.find({role: werewolfId});
    var thisPlayer = getPlayer();

    // Now, in this case we are going to need to make out own modified array to fill the template with
    var players = [];
    nonWerewolves.forEach(function(player) {
      // Let's check to see if there are any werewolves targeting this player
      var targeted = false;
      var playersTarget = false;
      var targetString = "";

      // Lets check this player against all the werewolves and their own targets
      werewolves.forEach(function(werewolf) {
        if (werewolf.target == player._id) {
          // This makes it so that the target has the string next to them of all the werewolves that have selected them.
          targeted = true;

          if (werewolf._id == thisPlayer._id) {
            // This makes it so that this player has a more immediate colour as it is THIS players target
            playersTarget = true;
            // Make it obvious that it is indeed this player that has selected this player
            targetString += ", You";
          } else {
            // Add the werewolves who have targeted this player to the string to display for this player to see
            targetString += ", " + werewolf.name;
          }
        }
      });
      targetString = targetString.slice(2); // Kill the first two characters

      // Set up the css tag depending on the players status
      var targetTag = "";
      if (playersTarget) {
        targetTag = "inverted red";
      } else if (targeted) {
        targetTag = "inverted orange";
      }

      // Lets make the data structure that will fill the info for each target
      var targetInfo = {
        playerId: player._id,
        playerName: player.name,
        targetString: targetString,
        targeted: targeted,
        targetTag: targetTag
      };
      // Add that to the list
      players.push(targetInfo);
    });

    return players;

    // Overall idea here:
    // Make a new data structure for each one that only passes their _id and name
    // Then add to that structure a boolean for if any werewolves have targeted them (targeted)
    // Also add a string for any of them that are targeted that is a comma separated list of the werewolves
    // that have targeted them (werewolvesTargeting)
  }
});

Template.werewolfTarget.events({
  "click .js-select-target": function() {
    // We also need the target, luckily we included an id data entry that we gave to our template
    var targetId = this.playerId;
    // Now we can quite easily update this werewolf's target
    Meteor.call("changeWerewolfVote", targetId);
  }
});

Template.passiveScreen.events({
  "click .js-done": function(event) {
    Meteor.call("finishedNightAction");
  }
});

Template.playerSelectionList.helpers({
  "otherPlayers": function() {
    return Players.find({alive: true, _id: {$not: getPlayer()._id}});
  },
  "confirm": function() {
    var role = Roles.findOne(getPlayer().role);
    var name = String(role.name).toLowerCase();

    var target = Session.get("currentTarget");

    if (!target) {
      target = "nobody";
    }

    //console.log("Your role is " + name);

    var contentText = "Are you sure that you want to ";
    var titleText = "";

    if (name == "doctor") {
      titleText = "Save " + target + "?";
      contentText += " save " + target + " from the werewolves?";
    } else if (name == "witch") {
      titleText = "Silence " + target + "?";
      contentText += " silence " + target + ", preventing them from speaking during the next day?";
    } else if (name == "seer") {
      titleText = "View " + target + "?";
      contentText += " gaze into the soul of " + target + " and see if they are a Werewolf?";
      seerDep.changed();
    }

    return {
      title: titleText,
      text: contentText
    }
  }
});

Template.playerSelection.events({
  "click .select-player": function(event) {
    var targetId = this._id;
    var target = Players.findOne(targetId);

    Session.set("currentTarget", target.name);
    // console.log("Clicked on " + target.name);

    Meteor.call("setRoleTarget", getPlayer().role, targetId, function(error, params) {
      if (error) {
        console.log(error);
      } else {
        if (!$('.ui.modal.confirmCheck').modal('is active')) {
          $('.ui.modal.confirmCheck')
            .modal({
              closable: false,
              onApprove: function () {
                Meteor.call("finishedNightAction");
              }
            })
            .modal("show")
            //.modal('hide others', true) // This seems to cause more problems than it fixed.
            .modal('refresh', true);
        } else {
          console.log("Blocked duplicate modal.");
        }
      }
    });
  }
});

Template.nightResults.events({
  "click .ok": function() {
    Players.update(getPlayer()._id, {$set: {seenNightResults: true}});
  }
});

Template.nightResults.helpers({
  nightInfo: function() {
    seerDep.depend();

    var player = getPlayer();
    var role = Roles.findOne(player.role);
    var info = {
      title: "Loading...",
      body: "Patience young padawan...",
      tag: ""
    };

    if (player.nightActionDone) {
      var name = String(role.name).toLowerCase();

      if (name == "doctor") {
        info = getDoctorResults(role.target);
      } else if (name == "witch") {
        info = getWitchResults(role.target);
      } else if (name == "seer") {
        info = getSeerResults(role.target);
      } else if (name == "villager") {
        info = getVillagerResults();
      } else if (name == "werewolf") {
        info = getWerewolfResults(role.target);
      } else if (role.passive) {
        info = {
          title: "You slept",
          body: "After playing some games before bed, you went to sleep",
          tag: "blue"
        }
      }
    }

    return info;
  },
  "okButton": function() {
    var player = getPlayer();

    var okButton = {
      text: "OK",
      tag: "blue"
    };

    if (player.seenNightResults) {
      okButton.text = "Waiting for others...";
      okButton.tag = "grey";
    }

    return okButton;
  }
});

Template.werewolfScreen.helpers({
  werewolfInfo: function() {
    var text = "All werewolves must choose the same player before the kill can occur.";
    var tag = "";

    timeToKill = GameVariables.findOne("timeToKill");
    if (timeToKill.enabled) {
      text = "The werewolves all agree! Killing in " + Math.floor((timeToKill.value - TimeSync.serverTime()) / 1000);
      tag = "inverted orange";
    }

    return {
      text: text,
      tag: tag
    };
  }
});

function getWerewolfResults(targetId) {
  var target = Players.findOne(targetId);

  if (!target) {
    console.log("Has the target not loaded yet?");
    return;
  }

  //console.log("Werewolves targeted" + target.name);

  var werewolfTitle = "The werewolves chose to kill " + target.name;
  var werewolfContent = "The werewolves encountered " + target.name + " during the night. " +
    "You yourself don't remember exactly what happened, but it would be a miracle if they were to have survived...";
  var werewolfTag = "red";

  return {
    title: werewolfTitle,
    body: werewolfContent,
    tag: werewolfTag
  }
}

function getDoctorResults(targetId) {
  var target = Players.findOne(targetId);

  var doctorTitle = "You have chosen to save " + target.name;
  var doctorContent = target.name + " cannot be killed this night by the werewolves, thanks to your skills.";
  var doctorTag = "green";

  return {
    title: doctorTitle,
    body: doctorContent,
    tag: doctorTag
  }
}

function getWitchResults(targetId) {
  var target = Players.findOne(targetId);

  var witchTitle = "You have chosen to silence " + target.name;
  var witchContent = target.name + " will not be able to talk tomorrow, as you hexxed them during the night.";
  var witchTag = "orange";

  return {
    title: witchTitle,
    body: witchContent,
    tag: witchTag
  }
}

function getVillagerResults() {
  var villagerTitle = "You went to bed";
  var villagerContent = "Not having anything in particular to do at night time, you went to bed.";
  villagerContent += " Hopefully nothing bad happens while you're asleep...";
  var villagerTag = "blue";

  return {
    title: villagerTitle,
    body: villagerContent,
    tag: villagerTag
  }
}

function getSeerResults(targetId) {
  var target = Players.findOne(targetId);
  var targetsRole = Roles.findOne(target.role);
  var results = {
    title: "",
    body: "",
    tag: ""
  };

  var seerTitle = "";
  var seerContent = "You have gazed into their soul and found ";
  var seerTag = "";

  if (targetsRole.name == "Werewolf") {
    seerTitle = target.name + " is a Werewolf!";
    seerContent += "that " + target.name + " is a Werewolf!";
    seerTag = "red";
  } else {
    seerTitle = target.name + " is not a Werewolf";
    seerContent += target.name + " is pure of heart, and not a Werewolf.";
    seerTag = "green";
  }

  results.title = seerTitle;
  results.body = seerContent;
  results.tag = seerTag;

  return results;
}

function isRoleType(roleName) {
  var role = Roles.findOne(getPlayer().role);
  var name = String(role.name).toLowerCase();

  if (name == "villager" || name == "saint" || name == "knight") {
    return "passive" == roleName;
  } else {
    return name == roleName;
  }
}