import { getMatchesData, getFlagEmoji } from './src/utils.js';

async function main() {
  try {
    // Parse arguments
    const args = process.argv.slice(2);
    let targetDate = null;

    for (let i = 0; i < args.length; i++) {
      if ((args[i] === '--date' || args[i] === '-d') && args[i + 1]) {
        targetDate = args[i + 1];
        i++;
      }
    }

    const result = await getMatchesData(targetDate);

    if (!result.success) {
      throw new Error(result.error || 'Failed to retrieve match data.');
    }

    const { friendlyDate, userTimezone, matches } = result;

    console.log('\n┌────────────────────────────────────────────────────────┐');
    console.log('│           🏆 2026 FIFA WORLD CUP SCHEDULE              │');
    console.log('├────────────────────────────────────────────────────────┤');
    console.log(`│  Date:     ${friendlyDate.padEnd(43)} │`);
    console.log(`│  Timezone: ${userTimezone.padEnd(43)} │`);
    console.log('└────────────────────────────────────────────────────────┘\n');

    if (matches.length === 0) {
      console.log('😴 No matches scheduled for this date.\n');
      return;
    }

    matches.forEach((match, idx) => {
      const homeFlag = getFlagEmoji(match.homeTeam.iso2);
      const awayFlag = getFlagEmoji(match.awayTeam.iso2);
      const stageText = match.type === 'group'
        ? `Group ${match.group} • Matchday ${match.matchday}`
        : match.type.toUpperCase();

      let statusText = 'SCHEDULED';
      let scoreText = '';

      if (match.finished) {
        statusText = 'FINISHED';
        scoreText = ` [${match.homeScore} - ${match.awayScore}]`;
      } else if (match.timeElapsed !== 'notstarted') {
        statusText = `LIVE (${match.timeElapsed}')`;
        scoreText = ` [${match.homeScore} - ${match.awayScore}]`;
      }

      console.log(`⚽ \x1b[35mMatch #${match.id}\x1b[0m | \x1b[36m${stageText}\x1b[0m`);
      console.log(`   👉 ${homeFlag} \x1b[1m${match.homeTeam.name}\x1b[0m vs \x1b[1m${match.awayTeam.name}\x1b[0m ${awayFlag}${scoreText}`);
      console.log(`   ⏰ \x1b[33m${match.kickoffUser}\x1b[0m (${match.kickoffLocal} local in ${match.stadium.city})`);
      console.log(`   🏟️  ${match.stadium.name} (${match.stadium.city}, ${match.stadium.country})`);
      console.log(`   ⚡ Status: \x1b[32m${statusText}\x1b[0m`);
      
      if (idx < matches.length - 1) {
        console.log('\n──────────────────────────────────────────────────────────\n');
      }
    });
    console.log('');
  } catch (error) {
    console.error(`\n❌ Error executing schedule app: ${error.message}\n`);
    process.exit(1);
  }
}

main();
