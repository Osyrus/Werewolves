var seerDep = new Tracker.Dependency;

Template.nightTime.helpers({
  "passive": function() {
    getRoleType();

    return Session.equals("roleType", "passive");
  },
  "werewolf": function() {
    getRoleType();

    return Session.equals("roleType", "werewolf");
  },
  "doctor": function() {
    getRoleType();

    return Session.equals("roleType", "doctor");
  },
  "witch": function() {
    getRoleType();

    return Session.equals("roleType", "witch");
  },
  "seer": function() {
    getRoleType();

    return Session.equals("roleType", "seer");
  },
  "selecting": function() {
    var player = getPlayer();

    return !player.nightActionDone;
  }
});

Template.werewolvesTargetList.helpers({
  "werewolfTargets": function(events) {
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
          // This make it so that the target has the string next to them of all the werewolves that have selected them.
          targeted = true;

          if (thisPlayer.target == player._id) {
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
      var targetTag = "list-group-item-info";
      if (playersTarget) {
        targetTag = "list-group-item-danger";
      } else if (targeted) {
        targetTag = "list-group-item-warning";
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
    // Get the current player (who is a werewolf of course, or else how are they here?)
    var werewolf = getPlayer();
    // We also need the target, luckily we included an id data entry that we gave to our template
    var targetId = this.playerId;
    // Now we can quite easily update this werewolf's target
    Players.update(werewolf._id, {$set: {target: targetId}});

    // Now we need to check if all the werewolves have clicked on the same target
    Meteor.call("checkWerewolvesAgree", function(error, result) {
      if (error) {
        console.log(error);
      } else {
        if (result) {
          // This will ensure that if the server says that all the werewolves agree,
          // then finishedNightAction() will be called
          finishedNightAction();
        }
      }
    });
  }
});

Template.passiveScreen.events({
  "click .js-done": function(event) {
    finishedNightAction();
  }
});

Template.playerSelectionList.helpers({
  "otherPlayers": function() {
    return Players.find({alive: true, _id: {$not: getPlayer()._id}});
  }
});

Template.playerSelection.events({
  "click .select-player": function(event) {
    var targetId = this._id;
    var target = Players.findOne(targetId);

    // Changing to a more server-side system
    Meteor.call("getRoleId", Meteor.user(), function(error, result) {
      if (error) {
        console.log(error);
      } else {
        var role = Roles.findOne(result);
        var name = String(role.name).toLowerCase();

        var contentText = "Are you sure that you want to ";
        var titleText = "";

        if (name == "doctor") {
          titleText = "Save " + target.name + "?";
          contentText += " save " + target.name + " from the werewolves?";
        } else if (name == "witch") {
          titleText = "Silence " + target.name + "?";
          contentText += " silence " + target.name + ", preventing them from speaking during the next day?";
        } else if (name == "seer") {
          titleText = "View " + target.name + "?";
          contentText += " gaze into the soul of " + target.name + " and see if they are a Werewolf?";
          seerDep.changed();
        }

        Meteor.call("setRoleTarget", role._id, target._id);

        var modalData = {
          title: titleText,
          content: contentText,
          sureTag: "nightDone"
        };

        Modal.show("areYouSureDialog", modalData);
      }
    });
  }
});

Template.areYouSureDialog.events({
  "click .sure.nightDone": function() {
    Modal.hide("areYouSureDialog");
    finishedNightAction();
  },
  "click .sure.nominate": function() {
    // This stuff is technically daytime stuff, but oh well
    console.log("Clicked sure in nominate");
    // Kill the array holding the number of players looking at the nominate selection screen
    GameVariables.update("playersNominating", {$set: {value: []}});
    // Set all the players votes back to abstain for the impending vote
    var players = getAlivePlayers();
    players.forEach(function(player) {
      // Don't do this yet, for testing purposes (otherwise the bots votes get reset)
      // TODO Remember this is here!!!
      //Players.update(player._id, {$set: {voteChoice: 0}});
    });
    // Set the variable to move to the yes/no vote
    GameVariables.update("lynchVote", {$set: {value: [this.data.nominatedPlayer, this.data.nominator], enabled: true}});
    // The nominator starts voting to lynch the target
    Players.update(this.data.nominator, {$set: {voteChoice: 1}});
    // Let the server know that the lynch vote has started
    Meteor.call("beginLynchVote");

    Modal.hide("areYouSureDialog");
  }
});

Template.nightResults.events({
  "click .results.ok": function() {
    Players.update(getPlayer()._id, {$set: {seenNightResults: true}});
  }
});

Template.nightResults.helpers({
  "nightInfo": function() {
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
      }
    }

    return info;
  },
  "okButton": function() {
    var player = getPlayer();

    var okButton = {
      text: "OK",
      tag: ""
    };

    if (player.seenNightResults) {
      okButton.text = "Waiting for others...";
      okButton.tag = "waiting";
    }

    return okButton;
  }
});

function getWerewolfResults(targetId) {
  var target = Players.findOne(targetId);

  //console.log("Werewolves targeted" + target.name);

  var werewolfTitle = "The werewolves chose to kill " + target.name;
  var werewolfContent = "The werewolves encountered " + target.name + " during the night. " +
    "You yourself don't remember exactly what happened, but it would be a miracle if they were to have survived...";
  var werewolfTag = "aggressive";

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
  var doctorTag = "passive";

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
  var witchTag = "aggressive";

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
  var villagerTag = "passive";

  return {
    title: villagerTitle,
    body: villagerContent,
    tag: villagerTag
  }
}

function getSeerResults(targetId) {
  var target = Players.findOne(targetId);
  var results = {
    title: "",
    body: "",
    tag: ""
  };

  Meteor.call("getRoleFromId", targetId, function(error, role) {
    if (error) {
      console.log(error);

      results.title = "Error";
      results.body = error.response;
    } else {
      var seerTitle = "";
      var seerContent = "You have gazed into their soul and found ";
      var seerTag = "";

      if (role.name == "Werewolf") {
        seerTitle = target.name + " is a Werewolf!";
        seerContent += "that " + target.name + " is a Werewolf!";
        seerTag = "aggressive";
      } else {
        seerTitle = target.name + " is not a Werewolf";
        seerContent += target.name + " is pure of heart, and not a Werewolf.";
        seerTag = "passive";
      }

      results.title = seerTitle;
      results.body = seerContent;
      results.tag = seerTag;
    }

    Session.set("seerResults", results);
  });

  return Session.get("seerResults");
}

function finishedNightAction() {
  Players.update(getPlayer()._id, {$set: {nightActionDone: true}});
  Players.update(getPlayer()._id, {$set: {seenNightResults: false}});
  Players.update(getPlayer()._id, {$set: {seenNewEvents: false}});

  // Do a check to see if everyone has seen the results and if so, move to day.
  var players = getAlivePlayers();
  var allDone = true;

  players.forEach(function(player) {
    if (!player.nightActionDone) {
      allDone = false;
    }
  });

  if (allDone) {
    Meteor.call("endNightCycle");
  }
}

function getRoleType() {
  Meteor.call("getRoleId", Meteor.user(), function(error, result) {
    if (error) {
      console.log(error);
    } else {
      var role = Roles.findOne(result);
      var name = String(role.name).toLowerCase();

      if (name == "villager" || name == "saint" || name == "knight") {
        Session.set("roleType", "passive");
      } else {
        Session.set("roleType", name);
      }
    }
  });
}