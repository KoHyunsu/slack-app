const axios = require('axios');
const { sampleActionCallback } = require('./sample-action');

const postQuestion = async (question_title, question_description, tags) => {
  const response = await axios.post(`${process.env.AWS_CLOUDFRONT_URL}/questions`, {
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
      const responseData = {
        question_link: "https://repost.aws/questions/QUQ1VQ5P1cTQOd5aaG1Im7EA/%EC%95%88%EB%93%9C%EB%A1%9C%EC%9D%B4%EB%93%9C-amplify-%EB%9D%BC%EC%9D%B4%EB%B8%8C%EB%9F%AC%EB%A6%AC-v-1-v-2-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%9E%98%EC%9D%B4%EC%85%98?sc_ichannel=ha&sc_ilang=en&sc_isite=repost&sc_iplace=hp&sc_icontent=QUQ1VQ5P1cTQOd5aaG1Im7EA&sc_ipos=2"
      };

      console.log('response :', responseData)

      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `re:Post에 질문이 게시되었습니다. <${responseData.question_link}|바로 가기>`,
            },
          },
        ],
      });

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
                  text: '⭐'.repeat(5 - index),
                  emoji: true,
                },
                value: `${index + 1}`,
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
