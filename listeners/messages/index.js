const { sampleMessageCallback } = require('./sample-message');

module.exports.register = (app) => {
  app.message(/^(hi|hello|hey).*/, sampleMessageCallback);
  app.message('cat', async ({ message, say }) => {
    // say() sends a message to the channel where the event was triggered
    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `Hey there <@${message.user}>!`,
          },
          accessory: {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Click Me',
            },
            action_id: 'button_click',
          },
        },
      ],
      text: `Hey there <@${message.user}>!`,
    });
  });

  app.action('button_click', async ({ body, ack, say }) => {
    // Acknowledge the action
    await ack();
    await say(`<@${body.user.id}> clicked the button`);
  });
};
