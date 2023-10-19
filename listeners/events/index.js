const { appHomeOpenedCallback } = require('./app-home-opened');
const axios = require('axios');
const AWS = require('aws-sdk');
const { Prisma } = require('@prisma/client');

const dummyQuestions = [
  {"title": "PythonSDK를 이용하여 RDS데이터베이스를 DynamoDB로 마이그레이션 하는 방법", "link": "https://repost.aws/ko/articles/ARAb4aeTJJScmlJwqEGGqK3Q/python-sdk%EB%A5%BC-%EC%9D%B4%EC%9A%A9%ED%95%98%EC%97%AC-rds%EB%8D%B0%EC%9D%B4%ED%84%B0%EB%B2%A0%EC%9D%B4%EC%8A%A4%EB%A5%BC-dynamo-db%EB%A1%9C-%EB%A7%88%EC%9D%B4%EA%B7%B8%EB%A0%88%EC%9D%B4%EC%85%98-%ED%95%98%EB%8A%94-%EB%B0%A9%EB%B2%95"},
  {"title": "ECS (FARGATE) TASK 작업개수 리소스 제한 질문입니다.", "link": "https://repost.aws/ko/questions/QUHvNZs5YJQWKVFRXQ3iAPHA/ecs-fargate-task-%EC%9E%91%EC%97%85%EA%B0%9C%EC%88%98-%EB%A6%AC%EC%86%8C%EC%8A%A4-%EC%A0%9C%ED%95%9C-%EC%A7%88%EB%AC%B8%EC%9E%85%EB%8B%88%EB%8B%A4"},
  {"title": "S3 삭제 Access Denied", "link": "https://repost.aws/ko/questions/QUawgxHE85ReueNlROb8BosA/s-3-%EC%82%AD%EC%A0%9C-access-denied#AN0OU01PUjR-GH9B3QNNiJ7w"},
  {"title": "접속이 잘되던 ssh 가 접속이 갑자기 안됩니다. Permission denied (publickey,gssapi-keyex,gssapi-with-mic).", "link": "https://repost.aws/ko/questions/QU5aYqBcIUT_iAepA0pvHK7A/%EC%A0%91%EC%86%8D%EC%9D%B4-%EC%9E%98%EB%90%98%EB%8D%98-ssh-%EA%B0%80-%EC%A0%91%EC%86%8D%EC%9D%B4-%EA%B0%91%EC%9E%90%EA%B8%B0-%EC%95%88%EB%90%A9%EB%8B%88%EB%8B%A4-permission-denied-publickey-gssapi-keyex-gssapi-with-mic#ANrk3sq7KMTD2n8Z4TtQ4cLA"}
];

AWS.config.update({region: 'us-east-1'});
s3 = new AWS.S3({apiVersion: '2006-03-01'});

module.exports.register = (app) => {
  app.event('app_home_opened', appHomeOpenedCallback);
  // eslint-disable-next-line no-unused-vars
  app.event('app_mention', async ({ event, context, client, say }) => {
    // Acknowledge the action

    // await say(`<@${event.user}>님의 질문 "${event.text.replaceAll('<@U05VBG5DFKR>', '')}"에 대한 검색을 진행합니다.`);
    // for await (const q of dummyQuestions) {
    //   await say({
    //     blocks: [{
    //       type: "divider"
    //       },
    //       {
    //       type: "section",
    //       text: {
    //         type: 'mrkdwn',
    //         text: `${q.title}\n\n<${q.link}|View More>`
    //       },
    //     }]
    //   });
    // }

    if(event.files && event.files.length > 0) {
      const res = await axios.get(event.files[0].url_private, {
        headers: {
          'Authorization': `Bearer ${process.env.SLACK_BOT_TOKEN}`
        },
        responseType: 'arraybuffer',
      })

      const uploadParams = {Bucket: 'icn16-slack-bot-files-bucket', Key: event.files[0].name, Body: res.data}
      const object = await s3.upload(uploadParams, function (err, data) {
        if (err) {
          console.log("Error", err);
        } if (data) {
          console.log("Upload Success", data.Location);
        }
      })

      Prisma
      
      await say(`${event.text.replaceAll('<@U05VBG5DFKR>', '')} ![이미지](https://icn16-slack-bot-files-bucket.s3.amazonaws.com/${event.files[0].name})`);
    }
  });
};
