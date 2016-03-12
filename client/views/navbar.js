var settingsDep = new Tracker.Dependency;

Template.navbar.helpers({
  inGame: function() {
    var currentGameMode = GameVariables.findOne("gameMode");

    return currentGameMode ? currentGameMode.value == "inGame" : false;
  },
  settingStates: function() {
    // This makes this update when required.
    settingsDep.depend();

    var enabledTag = "green";
    var disabledTag = "red";
    var enabledText = "Enabled";
    var disabledText = "Disabled";

    var doubleJeopardy = GameSettings.findOne("doubleJeopardy").enabled;
    var revealDay = GameSettings.findOne("revealRole").day;
    var revealNight = GameSettings.findOne("revealRole").night;
    var countdownTime = Math.floor(GameSettings.findOne("timeDelays").countdown / 1000);
    var timeoutTime = Math.floor(GameSettings.findOne("timeDelays").timeout / 1000);

    $('#countdown-range').range('set value', countdownTime);
    $('#timeout-range').range('set value', timeoutTime);

    return {
      doubleTag: doubleJeopardy ? enabledTag : disabledTag,
      doubleText: doubleJeopardy ? enabledText : disabledText,
      revealDTag: revealDay ? enabledTag : disabledTag,
      revealDText: revealDay ? enabledText : disabledText,
      revealNTag: revealNight ? enabledTag : disabledTag,
      revealNText: revealNight ? enabledText : disabledText,
      countdown: countdownTime,
      timeout: timeoutTime
    }
  },
  playerName: function() {
    return getPlayer().name;
  }
});

Template.navbar.events({
  "click .logout": function() {
    AccountsTemplates.logout();
  },
  "click .whoami": function() {
    Session.set("seenRole", false);
  },
  "click .doubleJeopardy": function() {
    console.log("Clicked double jeopardy button");

    if (GameSettings.findOne("doubleJeopardy").enabled)
      GameSettings.update("doubleJeopardy", {$set: {enabled: false}});
    else
      GameSettings.update("doubleJeopardy", {$set: {enabled: true}});
  },
  "click .settings": function() {
    $('.ui.button.doubleJeopardy').click(function(e) {
      // Toggle the state
      if (GameSettings.findOne("doubleJeopardy").enabled)
        GameSettings.update("doubleJeopardy", {$set: {enabled: false}});
      else
        GameSettings.update("doubleJeopardy", {$set: {enabled: true}});
    });

    $('.ui.button.revealDay').click(function(e) {
      // Toggle the state
      if (GameSettings.findOne("revealRole").day)
        GameSettings.update("revealRole", {$set: {day: false}});
      else
        GameSettings.update("revealRole", {$set: {day: true}});
    });

    $('.ui.button.revealNight').click(function(e) {
      // Toggle the state
      if (GameSettings.findOne("revealRole").night)
        GameSettings.update("revealRole", {$set: {night: false}});
      else
        GameSettings.update("revealRole", {$set: {night: true}});
    });

    $('#countdown-range').range({
      min: 5,
      max: 20,
      start: Math.floor(GameSettings.findOne("timeDelays").countdown / 1000),
      onChange: function(val) {
        var currentTime = GameSettings.findOne("timeDelays").countdown;
        var newTime = (val*1000 + 100);

        // Don't update the database if it is unnecessary.
        if (newTime != currentTime) {
          GameSettings.update("timeDelays", {$set: {countdown: newTime}});
        }
      }
    });

    $('#timeout-range').range({
      min: 30,
      max: 90,
      start: Math.floor(GameSettings.findOne("timeDelays").timeout / 1000),
      onChange: function(val) {
        var currentTime = GameSettings.findOne("timeDelays").timeout;
        var newTime = (val*1000 + 100);

        // Don't update the database if it is unnecessary.
        if (newTime != currentTime) {
          GameSettings.update("timeDelays", {$set: {timeout: newTime}});
        }
      }
    });

    $('.ui.modal.settingsModal').modal("show");

    // This makes sure that all the settings values are updated in the UI after opening.
    settingsDep.changed();
  }
});