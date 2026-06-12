import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config();

export const config = {
  slack: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL || null,
    botToken: process.env.SLACK_BOT_TOKEN || null,
    channelId: process.env.SLACK_CHANNEL_ID || null,
  },
  app: {
    userTimezone: process.env.USER_TIMEZONE || 'America/New_York',
    dryRun: process.env.DRY_RUN === 'true',
  }
};

export function validateConfig() {
  if (config.app.dryRun) {
    return true; // No need for Slack credentials in dry-run mode
  }

  const hasWebhook = !!config.slack.webhookUrl;
  const hasBotToken = !!config.slack.botToken && !!config.slack.channelId;

  if (!hasWebhook && !hasBotToken) {
    throw new Error(
      'Configuration Error: You must configure either SLACK_WEBHOOK_URL or both SLACK_BOT_TOKEN and SLACK_CHANNEL_ID. Set DRY_RUN=true in .env to test locally without Slack credentials.'
    );
  }

  return true;
}
