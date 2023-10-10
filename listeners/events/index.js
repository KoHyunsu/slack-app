const { appHomeOpenedCallback } = require('./app-home-opened');

module.exports.register = (app) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  app.event('app_mention', async ({ event, context, client, say }) => {
    // Acknowledge the action
    await say(`<@${event.user}>님 안녕하세요`);
  });
};
