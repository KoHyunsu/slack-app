const axios = require('axios');
const fs = require('fs').promises;
const { sampleActionCallback } = require('./sample-action');

const postQuestion = async (question_title, question_description, tags) => {
  const response = await axios.post(`${process.env.AWS_CLOUDFRONT_URL}/questions`, {
    question_title,
    question_description,
    tags,
  });
  return response.data;
};

const getTags = async () => {
  const tags = await fs.readFile(`${__dirname}/../../utils/tags.txt`, 'utf-8');
  return tags.toString().split('\n');
};

const submitTemplate = (tags, question_description) => ({
  blocks: [
    {
      block_id: 'question_title',
      type: 'input',
      element: {
        type: 'plain_text_input',
        action_id: 'plain_text_input-action',
      },
      label: {
        type: 'plain_text',
        text: '질문 제목을 작성해주세요 (최대 200자)',
        emoji: true,
      },
    },
    {
      block_id: 'question_description',
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*질문 설명*\n"${question_description}"`,
      },
    },
    {
      block_id: 'tags',
      type: 'input',
      element: {
        type: 'multi_static_select',
        placeholder: {
          type: 'plain_text',
          text: '태그 목록',
          emoji: true,
        },
        option_groups: Array.from({ length: parseInt(tags.length / 100, 10) + 1 }, () => 0).map((_, idx) => ({
          label: {
            type: 'plain_text',
            text: `목록 ${idx + 1}`,
          },
          options: tags.slice(idx * 100, idx === parseInt(tags.length / 100, 10) ? (tags.length - 1) : ((idx + 1) * 100)).map((tag) => ({
            text: {
              type: 'plain_text',
              text: `${tag}`,
              emoji: true,
            },
            value: `${tag}`,
          })),
        })),
        action_id: 'multi_static_select-action',
      },
      label: {
        type: 'plain_text',
        text: '1개 이상의 태그를 선택해주세요 (최대 5개)',
        emoji: true,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: '질문 제출하기',
            emoji: true,
          },
          value: 'submit_question_button',
          action_id: 'submit_quesiton',
        },
      ],
    },
  ],
});

module.exports.register = (app) => {
  app.action('sample_action_id', sampleActionCallback);
  app.action('submit_quesiton', async ({ ack, client, body, say, event }) => {
    try {
      await ack();

      const question_title = body.state.values.question_title['plain_text_input-action'].value;
      const question_description = body.message.blocks[1].text.text.slice(9, -1);
      const tags = body.state.values.tags['multi_static_select-action'].selected_options.map((tag) => (tag.text.text.replaceAll('\r', '')));

      console.log('title: ', question_title);
      console.log('description: ', question_description);
      console.log('tags: ', tags);

      // const responseData = await postQuestion(question_title, question_description, tags);
      const responseData = {
        question_link: 'https://repost.aws/questions/QUQ1VQ5P1cTQOd5aaG1Im7EA/%EC%95%88%EB%93%9C%EB%A1%9C%EC%9D%B4%EB%93%9C-amplify-%EB%9D%BC%EC%9D%B4%EB%B8%8C%EB%9F%AC%EB%A6%AC-v-1-v-2-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%9E%98%EC%9D%B4%EC%85%98?sc_ichannel=ha&sc_ilang=en&sc_isite=repost&sc_iplace=hp&sc_icontent=QUQ1VQ5P1cTQOd5aaG1Im7EA&sc_ipos=2',
      };

      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `re:Post에 질문이 게시되었습니다. [<${responseData.question_link}|바로 가기>]`,
            },
          },
        ],
      });

      await say({
        blocks: [
          {
            type: 'input',
            element: {
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
              action_id: 'rating_submit_question_select-action',
            },
            label: {
              type: 'plain_text',
              text: '저희 서비스가 마음에 드셨다면 별점을 남겨주세요',
              emoji: true,
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
  app.action('prepare_submit_question', async ({ ack, client, body, say, event }) => {
    try {
      await ack();
      const question_description = body.actions[0].value;

      const tags = await getTags();
      await say(submitTemplate(tags, question_description));
    } catch (error) {
      await say(`질문 업로드 도중 오류가 발생하였습니다. ${error}`);
    }
  });
  app.action('rate_submit_question', async ({ ack, client, body, say, event }) => {
    try {
      await ack();

      await say('질문 업로드에 대한 별점 올리기가 완료되었습니다.');
    } catch (error) {
      await say(`별점 올리기 도중 오류가 발생하였습니다. ${error}`);
    }
  });
  app.action('rate', async ({ ack, client, body, say, event }) => {
    try {
      await ack();

      await say('질문 검색에 대한 별점 올리기가 완료되었습니다.');
    } catch (error) {
      await say(`별점 올리기 도중 오류가 발생하였습니다. ${error}`);
    }
  });
  app.action('more_question_button-action', async ({ ack, client, body, say, event }) => {
    try {
      await ack();
      const nextURL = body.actions[0].value;
      await say(`추가 검색 결과를 조회합니다. ${nextURL}`);
    } catch (error) {
      await say(`검색 도중 오류가 발생하였습니다. ${error}`);
    }
  });
};
