import { config } from './config.js';

/**
 * Sends a message payload to Slack using either Webhook or Bot Token.
 * @param {object} payload - Slack Block Kit message payload
 */
export async function sendSlackMessage(payload) {
  if (config.app.dryRun) {
    console.log('\n--- DRY-RUN MODE: Slack Message Payload ---');
    console.log(JSON.stringify(payload, null, 2));
    console.log('-------------------------------------------\n');
    return { success: true, mode: 'dry-run' };
  }

  // Option 1: Incoming Webhook
  if (config.slack.webhookUrl) {
    return sendToWebhook(config.slack.webhookUrl, payload);
  }

  // Option 2: Bot Token & Channel
  if (config.slack.botToken && config.slack.channelId) {
    return sendToWebApi(config.slack.botToken, config.slack.channelId, payload);
  }

  throw new Error('Slack configuration missing. Configure SLACK_WEBHOOK_URL or SLACK_BOT_TOKEN + SLACK_CHANNEL_ID.');
}

async function sendToWebhook(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Slack Webhook returned error (${response.status}): ${text}`);
  }

  return { success: true, mode: 'webhook' };
}

async function sendToWebApi(token, channelId, payload) {
  const url = 'https://slack.com/api/chat.postMessage';
  const body = {
    channel: channelId,
    ...payload,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  
  if (!response.ok || !data.ok) {
    throw new Error(`Slack Web API error: ${data.error || response.statusText}`);
  }

  return { success: true, mode: 'web-api' };
}
