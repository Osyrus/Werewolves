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
    // TODO: Fetch all the players that are alive, but not the werewolves themselves

    // Make a new data structure for each one that only passes their _id and name
    // Then add to that structure a boolean for if any werewolves have targeted them (targeted)
    // Also add a string for any of them that are targeted that is a comma separated list of the werewolves
    // that have targeted them (werewolvesTargeting)
  }
});

Template.werewolfTarget.events({
  "click .js-select-target": function() {
    // TODO: Set the werewolf's new target

    // This is where the werewolf who clicked this, needs to have their target set to the selected player
    // This should update a reactive variable that will make every other werewolves screen update the target list
    // to show that this particular werewolf's selection has changed.
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
      //Players.update(player._id, {$set: {voteChoice: 2}});
    });
    // Set the variable to move to the yes/no vote
    GameVariables.update("lynchVote", {$set: {value: [this.data.nominatedPlayer, this.data.nominator], enabled: true}});
    // The nominator starts voting to lynch the target
    Players.update(this.data.nominator, {$set: {voteChoice: 1}});

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
    var info = {
      title: "Loading...",
      body: "Patience young padawan...",
      tag: ""
    };

    Meteor.call("getRoleFromId", player._id, function(error, role) {
      if (error) {
        console.log(error);

        info = {
          title: "Get role method call failed",
          body: "That's a shame...",
          tag: ""
        };
      } else {
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
          }
        }
      }

      Session.set("nightInfo", info);
    });

    return Session.get("nightInfo");
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