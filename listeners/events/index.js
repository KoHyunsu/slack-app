/* eslint-disable no-restricted-syntax */
/* eslint-disable max-len */
/* eslint-disable import/no-extraneous-dependencies */
const axios = require('axios');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const { fromIni } = require('@aws-sdk/credential-provider-ini');
const { appHomeOpenedCallback } = require('./app-home-opened');

const BUCKET_NAME = 'icn16-slack-bot-files-bucket';
const REGION = 'us-east-1';
const PROFILE = 'default';

const s3Client = new S3Client({ region: REGION, credentials: fromIni({ profile: PROFILE }) });
const dynamoDBClient = new DynamoDBClient({ region: REGION, credentials: fromIni({ profile: PROFILE }) });

const dummyQuestions = [
  { title: 'PythonSDK를 이용하여 RDS데이터베이스를 DynamoDB로 마이그레이션 하는 방법', link: 'https://repost.aws/ko/articles/ARAb4aeTJJScmlJwqEGGqK3Q/python-sdk%EB%A5%BC-%EC%9D%B4%EC%9A%A9%ED%95%98%EC%97%AC-rds%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4%EB%A5%BC-dynamo-db%EB%A1%9C-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%85%98-%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95' },
  { title: 'ECS (FARGATE) TASK 작업개수 리소스 제한 질문입니다.', link: 'https://repost.aws/ko/questions/QUHvNZs5YJQWKVFRXQ3iAPHA/ecs-fargate-task-%EC%9E%91%EC%97%85%EA%B0%9C%EC%88%98-%EB%A6%AC%EC%86%8C%EC%8A%A4-%EC%A0%9C%ED%95%9C-%EC%A7%88%EB%AC%B8%EC%9E%85%EB%8B%88%EB%8B%A4' },
  { title: 'S3 삭제 Access Denied', link: 'https://repost.aws/ko/questions/QUawgxHE85ReueNlROb8BosA/s-3-%EC%82%AD%EC%A0%9C-access-denied#AN0OU01PUjR-GH9B3QNNiJ7w' },
  { title: '접속이 잘되던 ssh 가 접속이 갑자기 안됩니다. Permission denied (publickey,gssapi-keyex,gssapi-with-mic).', link: 'https://repost.aws/ko/questions/QU5aYqBcIUT_iAepA0pvHK7A/%EC%A0%91%EC%86%8D%EC%9D%B4-%EC%9E%98%EB%90%98%EB%8D%98-ssh-%EA%B0%80-%EC%A0%91%EC%86%8D%EC%9D%B4-%EA%B0%91%EC%9E%90%EA%B8%B0-%EC%95%88%EB%90%A9%EB%8B%88%EB%8B%A4-permission-denied-publickey-gssapi-keyex-gssapi-with-mic#ANrk3sq7KMTD2n8Z4TtQ4cLA' },
];

module.exports.register = (app) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  // eslint-disable-next-line no-unused-vars
  app.event('app_mention', async ({ event, context, client, say }) => {
    // Acknowledge the action

    await say(`<@${event.user}>님의 질문 "${event.text.replaceAll('<@U05VBG5DFKR>', '')}"에 대한 검색을 진행합니다.`);

    const filteredContents = [];

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
      for await (const q of dummyQuestions) {
        await say({
          blocks: [{
            type: 'divider',
          },
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `${q.title}\n\n<${q.link}|View More>`,
            },
          }],
        });
      }
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
          console.log('event: ', event);
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
          }));
          await say(`${event.text.replaceAll('<@U05VBG5DFKR>', '')} \n\n[참고 이미지 링크](https://${BUCKET_NAME}.s3.amazonaws.com/${event.files[0].name})`);
        } catch (error) {
          await say(`질문 업로드 도중 오류가 발생하였습니다. ${error}`);
        }
      } else {
        await say(`${event.text.replaceAll('<@U05VBG5DFKR>', '')}`);
      }
    }
  });
};
