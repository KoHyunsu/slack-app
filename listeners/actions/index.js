/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
const axios = require('axios');
const fs = require('fs').promises;
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { fromIni } = require('@aws-sdk/credential-provider-ini');

const REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';
const PROFILE = process.env.AWS_DEFAULT_PROFILE || 'default';
const dynamoDBClient = new DynamoDBClient({ region: REGION, credentials: fromIni({ profile: PROFILE }) });

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

const submitTemplate = (tags, question_description, event_ts) => ({
  thread_ts: event_ts,
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
  app.action('submit_quesiton', async ({ ack, body, say }) => {
    try {
      await ack();

      const question_title = body.state.values.question_title['plain_text_input-action'].value;
      const question_description = body.message.blocks[1].text.text.slice(9, -1);
      const tags = body.state.values.tags['multi_static_select-action'].selected_options.map((tag) => (tag.text.text.replaceAll('\r', '')));

      const responseData = await postQuestion(question_title, question_description, tags);
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
        thread_ts: body.message.thread_ts,
      });

      await say({
        blocks: [
          {
            block_id: 'rating',
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
        thread_ts: body.message.thread_ts,
      });
    } catch (error) {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `질문 업로드 도중 오류가 발생하였습니다. ${error}`,
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    }
  });
  app.action('prepare_submit_question', async ({ ack, context, body, say }) => {
    try {
      await ack();

      await dynamoDBClient.send(new PutItemCommand({
        TableName: 'repost_statistics_table',
        Item: {
          category: { S: 'postQuestion' },
          workspace: { S: context?.teamId },
          channel: { S: body?.channel?.id },
          user: { S: body?.message?.user },
          createdAt: { S: new Date() },
        },
      }));

      const question_description = body.actions[0].value;

      const tags = await getTags();
      await say(submitTemplate(tags, question_description, body.message.thread_ts));
    } catch (error) {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `질문 업로드 도중 오류가 발생하였습니다. ${error}`,
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    }
  });
  app.action('rate_submit_question', async ({ ack, context, body, say }) => {
    try {
      await ack();

      const scoreInput = body.state.values.rating['rating_submit_question_select-action'].selected_option.value;

      await dynamoDBClient.send(new PutItemCommand({
        TableName: 'repost_statistics_table',
        Item: {
          category: { S: 'rateQuestionPosting' },
          workspace: { S: context?.teamId },
          channel: { S: body?.channel?.id },
          user: { S: body?.message?.user },
          score: { N: scoreInput },
          createdAt: { S: new Date() },
        },
      }));

      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '질문 업로드에 대한 별점 올리기가 완료되었습니다.',
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    } catch (error) {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `별점 올리기 도중 오류가 발생하였습니다. ${error}`,
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    }
  });
  app.action('rate', async ({ ack, context, body, say }) => {
    try {
      await ack();

      const scoreInput = body.state.values.rating['rating_select-action'].selected_option.value;

      await dynamoDBClient.send(new PutItemCommand({
        TableName: 'repost_statistics_table',
        Item: {
          category: { S: 'rateQuestionSearch' },
          workspace: { S: context?.teamId },
          channel: { S: body?.channel?.id },
          user: { S: body?.message?.user },
          score: { N: scoreInput },
          createdAt: { S: new Date() },
        },
      }));

      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '질문 업로드에 대한 별점 올리기가 완료되었습니다.',
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    } catch (error) {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `별점 올리기 도중 오류가 발생하였습니다. ${error}`,
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    }
  });
  app.action('more_question_button-action', async ({ ack, event, body, say }) => {
    try {
      await ack();
      const currentURL = body.actions[0].value;
      const questionInput = body.message.blocks[1].accessory.value;

      const searchResults = (await axios.get(encodeURI(currentURL))).data;
      const filteredContents = searchResults.length >= 2 ? searchResults.slice(0, -1) : [];
      const nextURL = searchResults[searchResults.length - 1].NextURL;

      for await (const q of filteredContents) {
        await say({
          blocks: [
            {
              type: 'divider',
            },
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `${q.title}\n\n<${q.link}|바로 가기>`,
              },
            },
          ],
          thread_ts: body.message.thread_ts,
        });
      }
      await say({
        blocks: [
          (nextURL === 'end' ? {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '마지막 질문까지 조회했습니다.',
            },
          } : {
            block_id: 'more_questions',
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '검색 결과를 더 불러오시겠습니까?',
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '추가 조회',
                emoji: true,
              },
              value: `${nextURL}`,
              action_id: 'more_question_button-action',
            },
          }),
          {
            block_id: 'new_question',
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: '찾으시는 결과가 없다면 질문을 새로 등록하실 수 있습니다.',
            },
            accessory: {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '질문 등록하기',
                emoji: true,
              },
              value: `${questionInput}`,
              action_id: 'prepare_submit_question',
            },
          },
          {
            block_id: 'rating',
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
              action_id: 'rating_select-action',
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
                value: 'rate_button',
                action_id: 'rate',
              },
            ],
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    } catch (error) {
      await say({
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `검색 도중 오류가 발생하였습니다. ${error}`,
            },
          },
        ],
        thread_ts: body.message.thread_ts,
      });
    }
  });
};
