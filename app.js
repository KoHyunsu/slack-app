const { App, LogLevel } = require('@slack/bolt');
const { registerListeners } = require('./listeners');
const orgInstall = require('./database/auth/store_user_org_install');
const workspaceAuth = require('./database/auth/store_user_workspace_install');
const db = require('./database/db');

// Connect Database
db.connect();

// Create Bolt App
const app = new App({
  appToken: process.env.SLACK_APP_TOKEN,
  port: process.env.PORT || 9000,
  socketMode: true,
  logLevel: LogLevel.ERROR,
  // logLevel: LogLevel.DEBUG,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  clientId: process.env.SLACK_CLIENT_ID,
  clientSecret: process.env.SLACK_CLIENT_SECRET,
  stateSecret: 'made-by-hyunsu-ko',
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
        return await orgInstall.saveUserOrgInstall(installation);
      }
      if (installation.team !== undefined) {
        return await workspaceAuth.saveUserWorkspaceInstall(installation);
      }
      throw new Error('Failed saving installation data to installationStore');
    },
    fetchInstallation: async (installQuery) => {
      if (
        installQuery.isEnterpriseInstall
        && installQuery.enterpriseId !== undefined
      ) {
        return await db.findUser(installQuery.enterpriseId);
      }
      if (installQuery.teamId !== undefined) {
        return await db.findUser(installQuery.teamId);
      }
      throw new Error('Failed fetching installation');
    },
  },
});

// Register Listeners
registerListeners(app);

// Start Bolt App
(async () => {
  try {
    await app.start();
    console.log('⚡️ Bolt app is running! ⚡️');
  } catch (error) {
    console.error('Unable to start App', error);
  }
})();
