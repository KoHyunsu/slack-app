const axios = require('axios');
const { sampleActionCallback } = require('./sample-action');

const postQuestion = async (question_title, question_description, tags) => {
  const response = await axios.post(`${process.env.AWS_CLOUDFRONT_URL}/v1/questions`, {
    question_title,
    question_description,
    tags,
  });
  return response.data;
};

module.exports.register = (app) => {
  app.action('sample_action_id', sampleActionCallback);
  app.action('submit_quesiton', async ({ ack, client, body, say, event }) => {
    try {
      await ack();

      const question_title = body.state.values.question_title['plain_text_input-action'].value;
      const question_description = body.message.blocks[1].text.text.slice(10, -2);
      const tags = body.state.values.tags['multi_static_select-action'].selected_options.map((tag) => (tag.text.text.replaceAll('\r', '')));

      console.log('title: ', question_title);
      console.log('description: ', question_description);
      console.log('tags: ', tags);

      // const responseData = await postQuestion(question_title, question_description, tags);
      // await say({
      //   blocks: [
      //     {
      //       type: 'section',
      //       text: {
      //         type: 'mrkdwn',
      //         text: `re:Post에 질문이 게시되었습니다. <바로 가기|${responseData.question_link}>`,
      //       },
      //     },
      //   ],
      // });

      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '저희 서비스가 마음에 드셨다면 별점을 남겨주세요',
            },
            accessory: {
              type: 'static_select',
              placeholder: {
                type: 'plain_text',
                text: '별점 선택',
                emoji: true,
              },
              options: Array.from({ length: 5 }, (value, index) => ({
                text: {
                  type: 'plain_text',
                  text: '⭐'.repeat(index + 1),
                  emoji: true,
                },
                value: index + 1,
              })),
              action_id: 'rating_select-action',
            },
          },
          {
            type: 'actions',
            elements: [
              {
                type: 'button',
                text: {
                  type: 'plain_text',
                  text: '제출',
                  emoji: true,
                },
                value: 'rate_submit_question_button',
                action_id: 'rate_submit_question',
              },
            ],
          },
        ],
      });
    } catch (error) {
      await say(`질문 업로드 도중 오류가 발생하였습니다. ${error}`);
    }
  });
};
