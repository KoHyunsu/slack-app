/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */
const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const { appHomeOpenedCallback } = require('./app-home-opened');
const fs = require('fs').promises;

const botUserId = 'U05VBG5DFKR';

const BUCKET_NAME = 'icn16-slack-bot-files-bucket';
const REGION = 'us-east-1';
const PROFILE = 'default';

const s3Client = new S3Client({ region: REGION, credentials: fromIni({ profile: PROFILE }) });
const dynamoDBClient = new DynamoDBClient({ region: REGION, credentials: fromIni({ profile: PROFILE }) });

const getTags = async () => {
  const tags = await fs.readFile(`${__dirname}/../../utils/tags.txt`, 'utf-8');
  return tags.toString().split('\n');
};

const searchQuestion = async (question) => {
  const pageSize = 6;
  const response = await axios.get(encodeURI(`${process.env.AWS_APIGATEWAY_URL}/search?keyword=${question}&pageSize=${pageSize}`));
  return response.data;
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

// const dummyQuestions = [
//   { title: 'PythonSDK를 이용하여 RDS데이터베이스를 DynamoDB로 마이그레이션 하는 방법', link: 'https://repost.aws/ko/articles/ARAb4aeTJJScmlJwqEGGqK3Q/python-sdk%EB%A5%BC-%EC%9D%B4%EC%9A%A9%ED%95%98%EC%97%AC-rds%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4%EB%A5%BC-dynamo-db%EB%A1%9C-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%85%98-%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95' },
//   { title: 'ECS (FARGATE) TASK 작업개수 리소스 제한 질문입니다.', link: 'https://repost.aws/ko/questions/QUHvNZs5YJQWKVFRXQ3iAPHA/ecs-fargate-task-%EC%9E%91%EC%97%85%EA%B0%9C%EC%88%98-%EB%A6%AC%EC%86%8C%EC%8A%A4-%EC%A0%9C%ED%95%9C-%EC%A7%88%EB%AC%B8%EC%9E%85%EB%8B%88%EB%8B%A4' },
//   { title: 'S3 삭제 Access Denied', link: 'https://repost.aws/ko/questions/QUawgxHE85ReueNlROb8BosA/s-3-%EC%82%AD%EC%A0%9C-access-denied#AN0OU01PUjR-GH9B3QNNiJ7w' },
//   { title: '접속이 잘되던 ssh 가 접속이 갑자기 안됩니다. Permission denied (publickey,gssapi-keyex,gssapi-with-mic).', link: 'https://repost.aws/ko/questions/QU5aYqBcIUT_iAepA0pvHK7A/%EC%A0%91%EC%86%8D%EC%9D%B4-%EC%9E%98%EB%90%98%EB%8D%98-ssh-%EA%B0%80-%EC%A0%91%EC%86%8D%EC%9D%B4-%EA%B0%91%EC%9E%90%EA%B8%B0-%EC%95%88%EB%90%A9%EB%8B%88%EB%8B%A4-permission-denied-publickey-gssapi-keyex-gssapi-with-mic#ANrk3sq7KMTD2n8Z4TtQ4cLA' },
// ];

module.exports.register = (app) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  // eslint-disable-next-line no-unused-vars
  app.event('app_mention', async ({ event, context, client, say }) => {
    // Acknowledge the action

    const questionInput = event.text.replaceAll(`<@${botUserId}> `, '');

    await say({
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `<@${event.user}>님의 질문 "*${questionInput}*"에 대한 검색을 진행합니다.`,
          },
        },
      ],
    });

    const searchResults = await searchQuestion(questionInput);
    const filteredContents = searchResults.length >= 2 ? searchResults.slice(0, -1) : [];
    const nextURL = searchResults[searchResults.length - 1].NextURL;

    const tags = await getTags();

    try {
      await dynamoDBClient.send(new PutItemCommand({
        TableName: 'repost_statistics_table',
        Item: {
          category: { S: 'searchQuestion' },
          workspace: { S: context?.teamId },
          channel: { S: event?.channel },
          user: { S: event?.user },
          createdAt: { S: new Date() },
        },
      }));
    } catch (error) {
      await say(`질문 검색 도중 오류가 발생하였습니다. ${error}`);
    }

    if (filteredContents && filteredContents?.length > 0) {
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
        });
      }
      await say({
        blocks: [
          (nextURL === 'end' ? {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "마지막 질문까지 조회했습니다."
            }
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
            }
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
      });
    } else {
      await say('관련된 컨텐츠가 존재하지 않습니다. 새롭게 질문을 업로드하겠습니다.');

      try {
        await dynamoDBClient.send(new PutItemCommand({
          TableName: 'repost_statistics_table',
          Item: {
            category: { S: 'postQuestion' },
            workspace: { S: context?.teamId },
            channel: { S: event?.channel },
            user: { S: event?.user },
            createdAt: { S: new Date() },
          },
        }));
      } catch (error) {
        await say(`질문 업로드 도중 오류가 발생하였습니다. ${error}`);
      }

      if (event?.files && event?.files.length > 0) {
        try {
          await dynamoDBClient.send(new PutItemCommand({
            TableName: 'repost_statistics_table',
            Item: {
              category: { S: 'postFiles' },
              workspace: { S: context?.teamId },
              channel: { S: event?.channel },
              user: { S: event?.user },
              createdAt: { S: new Date() },
            },
          }));
        } catch (error) {
          await say(`질문 업로드 도중 오류가 발생하였습니다. ${error}`);
        }

        const res = await axios.get(event?.files[0].url_private, {
          headers: {
            Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          },
          responseType: 'arraybuffer',
        });

        try {
          await s3Client.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: event.files[0].name,
            Body: res.data,
            ContentType: 'binary',
            CacheControl: 'max-age=172800',
          }));

          const question_description = `${event.text.replaceAll(`<@${botUserId}> `, '')} \n\n[참고 이미지 링크](https://${BUCKET_NAME}.s3.amazonaws.com/${event.files[0].name.replaceAll(' ', '%20')})`;
          await say(submitTemplate(tags, question_description));
        } catch (error) {
          await say(`질문 업로드 도중 오류가 발생하였습니다. ${error}`);
        }
      } else {
        const question_description = `${event.text.replaceAll(`<@${botUserId}> `, '')}`;
        await say(submitTemplate(tags, question_description));
      }
    }
  });
};
