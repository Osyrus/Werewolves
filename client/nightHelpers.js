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

Template.playerSelectionList.helpers({
  "otherPlayers": function() {
    return Players.find({alive: true, _id: {$not: getPlayer()._id}});
  }
});

Template.playerSelection.events({
  "click .select-player": function(event) {
    var targetId = this._id;
    Session.set("targetId", targetId);

    var target = Players.findOne(targetId);

    getRoleType();

    var contentText = "Are you sure that you want to ";
    var titleText = "";

    if (Session.equals("roleType", "doctor")) {
      titleText = "Save " + target.name + "?";
      contentText += " save " + target.name + " from the werewolves?";
    } else if (Session.equals("roleType", "witch")) {
      titleText = "Silence " + target.name + "?";
      contentText += " silence " + target.name + ", preventing them from speaking during the next day?";
    } else if (Session.equals("roleType", "seer")) {
      titleText = "View " + target.name + "?";
      contentText += " gaze into the soul of " + target.name + " and see if they are a Werewolf?";
    }

    var modalData = {
      title: titleText,
      content: contentText
    };

    Modal.show("areYouSureDialog", modalData);
  }
});

Template.areYouSureDialog.events({
  "click .sure": function() {
    // Execute the action that the players says they are sure about
    var targetId = Session.get("targetId");
    var target = Players.findOne(targetId);

    Modal.hide("areYouSureDialog");
    finishedNightAction();

    if (Session.equals("roleType", "doctor")) {
      // This is where the doctors effect is added
      Players.update(targetId, {$set: {effect: "save"}});

      console.log("Doctor has selected " + target.name);
    } else if (Session.equals("roleType", "witch")) {
      // This is where the witches effect is added
      Players.update(targetId, {$set: {effect: "silence"}});

      console.log("Witch has selected " + target.name);
    } else if (Session.equals("roleType", "seer")) {
      // This is where the seer finds out their answer
      Meteor.call("getRoleId", target, function(error, result) {
        if (error) {
          console.log(error);
        } else {
          var role = String(Roles.findOne(result).name).toLowerCase();
          Session.set("targetsRole", role);
        }
      });

      console.log("Seer has selected " + target.name);
    }
  }
});

Template.nightResults.events({
  "click .results.ok": function() {
    Players.update(getPlayer()._id, {$set: {seenNightResults: true}});
  }
});

Template.nightResults.helpers({
  "nightInfo": function() {
    var player = getPlayer();
    getRoleType();

    var info = {
      title: "Error",
      body: "How did that happen?",
      tag: "none"
    };

    if (player.nightActionDone) {
      if (Session.equals("roleType", "doctor")) {
        info = getDoctorResults();
      } else if (Session.equals("roleType", "witch")) {
        info = getWitchResults();
      } else if (Session.equals("roleType", "seer")) {
        info = getSeerResults();
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

function getDoctorResults() {
  var target = Players.findOne(Session.get("targetId"));

  var doctorTitle = "You have chosen to save " + target.name;
  var doctorContent = target.name + " cannot be killed this night by the werewolves, thanks to your skills.";
  var doctorTag = "passive";

  return {
    title: doctorTitle,
    body: doctorContent,
    tag: doctorTag
  }
}

function getWitchResults() {
  var target = Players.findOne(Session.get("targetId"));

  var witchTitle = "You have chosen to silence " + target.name;
  var witchContent = target.name + " will not be able to talk tomorrow, as you hexxed them during the night.";
  var witchTag = "werewolf";

  return {
    title: witchTitle,
    body: witchContent,
    tag: witchTag
  }
}

function getSeerResults() {
  var target = Players.findOne(Session.get("targetId"));

  var seerTitle = "";
  var seerContent = "You have gazed into their soul and found ";
  var seerTag = "";

  if (Session.equals("targetsRole", "werewolf")) {
    seerTitle = target.name + " is a Werewolf!";
    seerContent += "that " + target.name + " is a Werewolf!";
    seerTag = "werewolf";
  } else {
    seerTitle = target.name + " is not a Werewolf";
    seerContent += target.name + " is pure of heart, and not a Werewolf.";
    seerTag = "passive";
  }

  return {
    title: seerTitle,
    body: seerContent,
    tag: seerTag
  };
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