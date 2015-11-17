// This is the collection holding all the players in the game
Players = new Mongo.Collection("players");
// userId: the _id of the user
// name: The players name, can be drawn from username of user
// roleId: The players role, set at the start of the game and used to
//       set the players behavior during the game
// status: This will hold information about a players status, for
//         example, if they are cursed/silenced/saved etc...
// alive: A boolean setting the player to be alive or dead
// joined: A boolean for if the player has joined the game or not
// ready: A boolean used while in the lobby to indicate readyness to
//        start the game

Roles = new Mongo.Collection("roles");
// name: The human readable name of the role
// votes: Store the number of votes the role got for later calculations
// order: The order that the votes puts the role relative to the others
// enabled: After calculating the votes, is this role going to be in game?
// critical: A boolean that determines if this is a necessary role (e.g. Villager and Werewolf)
//           If this is true, then they are not voted on and not part of that calculation.

RoleVotes = new Mongo.Collection("votes");
// roleId: The role Id the vote corresponds to
// playerId: The player that made the vote
// vote: The value of the vote that the player made for this role

GameVariables = new Mongo.Collection("gameVars");
// id: The variable name
// name: The human readable variable name
// value: The value of the variable
// enabled: Is the value currently important?