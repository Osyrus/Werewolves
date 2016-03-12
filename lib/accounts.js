AccountsTemplates.configure({
  defaultLayout: "mainLayout",
  defaultLayoutRegions: {},
  defaultContentRegion: "content",
  confirmPassword: true,
  homeRoutePath: '/',
  negativeFeedback: true
});

AccountsTemplates.configureRoute('signIn');

var pwd = AccountsTemplates.removeField('password');
AccountsTemplates.removeField('email');
AccountsTemplates.addFields([
  {
    _id: "username",
    type: "text",
    displayName: "username",
    required: true,
    minLength: 5
  },
  pwd
]);