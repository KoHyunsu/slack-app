/* eslint-disable max-len */
const { App, LogLevel } = require('@slack/bolt');
const AWS = require('aws-sdk');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { registerListeners } = require('./listeners');
const orgInstall = require('./database/auth/store_user_org_install');
const workspaceAuth = require('./database/auth/store_user_workspace_install');
const db = require('./database/db');

const REGION = process.env.AWS_DEFAULT_REGION || 'us-east-1';

(async () => {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: REGION,
  });
  const secretsManagerClient = new SecretsManagerClient({ region: REGION });
  const secretsManagerResponse = await secretsManagerClient.send(
    new GetSecretValueCommand({
      SecretId: process.env.AWS_SECRET_NAME,
      VersionStage: 'AWSCURRENT',
    }),
  );

  // Connect Database
  db.connect();

  // Create Bolt App
  const app = new App({
    appToken: secretsManagerResponse.SecretString.SLACK_APP_TOKEN || process.env.SLACK_APP_TOKEN,
    port: process.env.PORT || 9000,
    socketMode: true,
    logLevel: LogLevel.ERROR,
    // logLevel: LogLevel.DEBUG,
    signingSecret: secretsManagerResponse.SecretString.SLACK_SIGNING_SECRET || process.env.SLACK_SIGNING_SECRET,
    clientId: secretsManagerResponse.SecretString.SLACK_CLIENT_ID || process.env.SLACK_CLIENT_ID,
    clientSecret: secretsManagerResponse.SecretString.SLACK_CLIENT_SECRET || process.env.SLACK_CLIENT_SECRET,
    stateSecret: 'made-by-hyunsuko',
    installerOptions: {
      stateVerification: false,
    },
    // Installation Info stored in MongoDB
    installationStore: {
      storeInstallation: async (installation) => {
        if (
          installation.isEnterpriseInstall
        && installation.enterprise !== undefined
        ) {
          const saveUserOrgInstall = await orgInstall.saveUserOrgInstall(installation);
          return saveUserOrgInstall;
        }
        if (installation.team !== undefined) {
          const saveUserWorkspaceInstall = await workspaceAuth.saveUserWorkspaceInstall(installation);
          return saveUserWorkspaceInstall;
        }
        throw new Error('Failed saving installation data to installationStore');
      },
      fetchInstallation: async (installQuery) => {
        if (
          installQuery.isEnterpriseInstall
        && installQuery.enterpriseId !== undefined
        ) {
          const findUser = await db.findUser(installQuery.enterpriseId);
          return findUser;
        }
        if (installQuery.teamId !== undefined) {
          const findUser = await db.findUser(installQuery.teamId);
          return findUser;
        }
        throw new Error('Failed fetching installation');
      },
    },
  });

  // Register Listeners
  registerListeners(app);

  // Start Bolt App
  try {
    await app.start();
    // eslint-disable-next-line no-console
    console.log('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Unable to start App', error);
  }
})();
