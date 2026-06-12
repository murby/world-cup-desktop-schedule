# 🏆 World Cup 2026 Slack Schedule App

A lightweight, timezone-aware Node.js application that fetches the daily schedule of the **2026 FIFA World Cup** and posts a beautifully formatted **Slack Block Kit** message to your team's Slack channel.

## 🚀 Features

- 🕒 **Timezone Aware**: Translates kickoff times from stadium local time to your preferred timezone (e.g. Eastern Time, Central Time, etc.).
- 🇺🇸🇲🇽🇨🇦 **Full Match Database**: Prefetched and compiled 104 matches, groups, teams, and stadium metadata for the entire 2026 tournament (June 11 – July 19, 2026).
- 🎨 **Slack Block Kit**: Generates visually stunning Slack messages complete with country flag emojis, stadiums, local times, and groups.
- ⚙️ **Dual Delivery Modes**: Supports posting via **Incoming Webhook** or the **Slack Web API** (using a bot token).
- 🧪 **Dry-Run Mode**: Test the layout and scheduling outputs locally on the console without sending actual payloads to Slack.

---

## 🛠️ Setup & Installation

### 1. Install Dependencies
Ensure you have Node.js 18+ installed. Install the environment variable manager (`dotenv`):
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Open `.env` and configure your settings:
```ini
# Preferred timezone to display match kickoff times (IANA format)
USER_TIMEZONE=America/New_York

# Default mode is dry-run. Set to false once Slack configurations are added.
DRY_RUN=true
```

---

## 💬 Slack App Configuration

You can connect this app to your Slack workspace using either of two methods:

### Option A: Incoming Webhook (Simplest Setup)
1. Go to the [Slack App Console](https://api.slack.com/apps) and click **Create New App** (choose **From Scratch**).
2. Name your app (e.g. `World Cup Schedule`) and select your workspace.
3. Under **Add features and functionality**, select **Incoming Webhooks** and toggle it **On**.
4. Click **Add New Webhook to Workspace**, select the channel where the daily schedule should be posted, and click **Authorize**.
5. Copy the generated **Webhook URL** and add it to your `.env` file:
   ```ini
   SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX
   DRY_RUN=false
   ```

### Option B: Slack Bot Token & Web API (More Customizable)
1. Go to the [Slack App Console](https://api.slack.com/apps) and create an app.
2. Under **OAuth & Permissions**, scroll down to **Scopes** -> **Bot Token Scopes** and add `chat:write`.
3. Install the app to your workspace.
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`).
5. Invite the bot user to your target channel in Slack (e.g., type `/invite @YourAppName` in the channel).
6. Copy the **Channel ID** (right-click the channel name in Slack, select **View channel details**, and copy the ID at the bottom).
7. Add both credentials to your `.env` file:
   ```ini
   SLACK_BOT_TOKEN=xoxb-your-bot-token
   SLACK_CHANNEL_ID=C0123456789
   DRY_RUN=false
   ```

---

## 🕹️ CLI Usage

Run the app manually or test historical dates:

### 1. Dry Run (Default / Local Test)
Runs the script for today's date but prints the Block Kit JSON structure to the console instead of posting to Slack:
```bash
npm run dry-run
```

### 2. Test a Specific Date (Dry Run)
Test the schedule formatting for the opening match day (June 11, 2026) or second day (June 12, 2026):
```bash
node index.js --date 2026-06-11 --dry-run
node index.js --date 2026-06-12 --dry-run
```

### 3. Live Run (Sends to Slack)
Ensure `DRY_RUN=false` in `.env`, then run:
```bash
npm start
```
Or override dynamically to force send a specific date to Slack:
```bash
node index.js --date 2026-06-12
```

---

## ⏰ Scheduling Daily Updates

To post the schedule automatically every morning, you can run the script using a scheduler:

### Method 1: Local macOS / Linux Cron Job
Open your cron table:
```bash
crontab -e
```
Add a cron entry to run the script every day at **8:00 AM** in your local environment. Replace the paths with your absolute node and project paths:
```text
0 8 * * * cd /absolute/path/to/slack-world-cup-schedule && /usr/local/bin/node index.js >> /var/log/world-cup-cron.log 2>&1
```

### Method 2: GitHub Actions (Recommended & Free Hosting)
You can schedule the script to run every day for free using GitHub Actions.

1. Create a file at `.github/workflows/daily-schedule.yml` with the following content:
```yaml
name: Post Daily World Cup Schedule

on:
  schedule:
    # Run daily at 12:00 PM UTC (which is 8:00 AM EDT / 5:00 AM PDT)
    - cron: '0 12 * * *'
  workflow_dispatch: # Allows manual trigger from GitHub UI

jobs:
  run-schedule:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Post Schedule
        env:
          # Define these in your GitHub Repository Secrets
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_CHANNEL_ID: ${{ secrets.SLACK_CHANNEL_ID }}
          USER_TIMEZONE: America/New_York
          DRY_RUN: false
        run: node index.js
```
2. Commit the files to GitHub.
3. Go to your repository settings -> **Secrets and variables** -> **Actions** and add `SLACK_WEBHOOK_URL` (or `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`) as repository secrets.

---

## 📂 Project Structure

- `data/`: Contains database files (`matches.json`, `teams.json`, `stadiums.json`).
- `src/config.js`: Parses and validates configuration and `.env` setups.
- `src/utils.js`: Core helpers for IANA timezone offsets and Slack UK flag overrides.
- `src/slack.js`: Lightweight Slack webhook and Web API delivery clients using native `fetch`.
- `src/schedule.js`: Filters games matching the target date and generates structured Block Kit components.
- `index.js`: Command line CLI entry point.
