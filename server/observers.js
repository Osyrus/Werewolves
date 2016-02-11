
// TODO this ain't working!

/// This observer will update a reactive document entry that represents all the joined players being ready or not

// Use Tracker.autorun?

Players.find().observeChanges({
  added: function(id, fields) {
    ServerChecks.update("allReady", {$set: {value: false}});
  },

  changed: function(id, fields) {
    var playersTotal = Players.find({joined: true}).count();
    var playersReady = Players.find({ready: true}).count();

    var result = playersReady == playersTotal;

    ServerChecks.update("allReady", {$set: {value: result}});
  }
});