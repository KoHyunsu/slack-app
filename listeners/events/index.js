const { appHomeOpenedCallback } = require('./app-home-opened');

module.exports.register = (app) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  // eslint-disable-next-line no-unused-vars
  app.event('app_mention', async ({ event, context, client, say }) => {
    // Acknowledge the action
    await say(`<@${event.user}>님의 질문 "${event.text.replaceAll('<@U05VBG5DFKR>', '')}"에 대한 검색을 진행합니다.`);
  });
};
