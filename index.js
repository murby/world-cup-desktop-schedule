import { config, validateConfig } from './src/config.js';
import { generateSchedulePayload } from './src/schedule.js';
import { sendSlackMessage } from './src/slack.js';

async function main() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    let targetDate = null;
    let forceDryRun = false;

    for (let i = 0; i < args.length; i++) {
      if ((args[i] === '--date' || args[i] === '-d') && args[i + 1]) {
        targetDate = args[i + 1];
        i++;
      } else if (args[i] === '--dry-run' || args[i] === '-n') {
        forceDryRun = true;
      }
    }

    // Apply CLI overrides to configuration
    if (forceDryRun) {
      config.app.dryRun = true;
    }

    // Validate Slack configuration (only if not dry-running)
    validateConfig();

    console.log(`World Cup Schedule App initiated.`);
    console.log(`Target Date: ${targetDate || 'Today (default)'}`);
    console.log(`User Timezone: ${config.app.userTimezone}`);
    console.log(`Execution Mode: ${config.app.dryRun ? 'DRY-RUN (console only)' : 'PRODUCTION (Slack)'}`);

    // Generate schedule
    const payload = generateSchedulePayload(targetDate);

    // Send payload
    const result = await sendSlackMessage(payload);

    if (result.success) {
      if (result.mode === 'dry-run') {
        console.log('✅ Success: Dry-run matches printed above.');
      } else {
        console.log(`✅ Success: Schedule posted to Slack via ${result.mode}.`);
      }
    }
  } catch (error) {
    console.error(`❌ Error executing schedule app: ${error.message}`);
    process.exit(1);
  }
}

main();
