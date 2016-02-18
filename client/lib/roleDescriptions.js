
passiveWinCondition = " You win by killing all of the werewolves.";

werewolfDescription =
  "As a werewolf you win by killing all of the villagers. You do this by killing people during the night," +
  " and protecting yourself and any other werewolves from being lynched during the day.";

villagerDescription =
  "As a villager you win by killing all the werewolves, you can do this by lynching them during the day." +
  " During the night you have no active role to play.";

doctorDescription =
  "As the doctor of the village, you have the power to visit someone at night and potentially save them from death." +
  " If the person you picked is also picked by a werewolf, they will not die that night." +
  passiveWinCondition;

witchDescription =
  "As the witch, you are an agent of chaos. During the day you are a normal villager, but at night you can " +
  "choose someone to hex. This will mean that they are not able to speak the next day." +
  passiveWinCondition;

seerDescription =
  "As the seer, you have the power to see into the souls of others to find out if they are a werewolf, or villager." +
  " During the day you are a normal villager, but during the night you can choose someone and have their soul revealed." +
  passiveWinCondition;

knightDescription =
  "As the knight, you are armed and dangerous during the night. This means that if you are picked by the werewolves" +
  " during the night, you are able to defend yourself against them. Keep in mind however that if the werewolves" +
  " become the majority, they can kill you in a last ditch effort and win the game." +
  passiveWinCondition;

saintDescription =
  "As the saint, you are favoured by the gods above and have their protection. During the night, they have no power" +
  " and you can be killed by the werewolves. However during the day they protect you by striking down any who harm you." +
  " This means that if you are nominated and are killed, the one who nominated you is smitten by the heavens and dies" +
  " with you." + passiveWinCondition;

// TODO this might be a better way of distributing this information

//var roles = Roles.find();

//roles.forEach(function(role) {
//  var description = "";
//
//  if (role.name == "Villager") {
//    description = villagerDescription;
//  } else if (role.name == "Werewolf") {
//    // etc...
//  }
//
//  Roles.update(role._id, {$set: {description: description}});
//});