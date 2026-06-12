import { config } from './config.js';
import {
  loadDataFile,
  parseLocalDateInTimezone,
  formatInTimezone,
  getFlagEmoji,
  STADIUM_TIMEZONES
} from './utils.js';

/**
 * Returns the daily schedule formatted for Slack.
 * @param {string} dateStr - YYYY-MM-DD date string (defaults to today in user's timezone)
 * @returns {object} Slack Block Kit message payload
 */
export function generateSchedulePayload(dateStr) {
  // Load data files
  const matches = loadDataFile('matches.json');
  const teams = loadDataFile('teams.json');
  const stadiums = loadDataFile('stadiums.json');

  // Create lookup maps for performance and simplicity
  const teamMap = teams.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {});

  const stadiumMap = stadiums.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  const userTimezone = config.app.userTimezone;

  // Determine target date components
  let targetDate = dateStr;
  if (!targetDate) {
    const today = new Date();
    // Format today in user's timezone as YYYY-MM-DD
    const y = formatInTimezone(today, userTimezone, { year: 'numeric' });
    const m = formatInTimezone(today, userTimezone, { month: '2-digit' });
    const d = formatInTimezone(today, userTimezone, { day: '2-digit' });
    targetDate = `${y}-${m}-${d}`;
  }

  const [tYear, tMonth, tDay] = targetDate.split('-').map(Number);

  // Filter matches scheduled for targetDate in user's timezone
  const targetMatches = matches.filter(match => {
    const tz = STADIUM_TIMEZONES[match.stadium_id];
    if (!tz) return false;

    try {
      const matchDate = parseLocalDateInTimezone(match.local_date, tz);
      
      const mYear = Number(formatInTimezone(matchDate, userTimezone, { year: 'numeric' }));
      const mMonth = Number(formatInTimezone(matchDate, userTimezone, { month: 'numeric' }));
      const mDay = Number(formatInTimezone(matchDate, userTimezone, { day: 'numeric' }));

      return mYear === tYear && mMonth === tMonth && mDay === tDay;
    } catch (e) {
      console.warn(`Warning: Failed to parse date for match ID ${match.id}:`, e.message);
      return false;
    }
  });

  // Sort matches by time chronological in user's timezone
  targetMatches.sort((a, b) => {
    const tzB = STADIUM_TIMEZONES[b.stadium_id];
    const tzA = STADIUM_TIMEZONES[a.stadium_id];
    const dateA = parseLocalDateInTimezone(a.local_date, tzA);
    const dateB = parseLocalDateInTimezone(b.local_date, tzB);
    return dateA - dateB;
  });

  // Build Block Kit payload
  const blocks = [];

  // 1. Header Block
  blocks.push({
    type: 'header',
    text: {
      type: 'plain_text',
      text: '🏆 2026 FIFA World Cup - Daily Schedule',
      emoji: true
    }
  });

  // Format the date for friendly reading (e.g., "Friday, June 12, 2026")
  const friendlyDate = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(new Date(tYear, tMonth - 1, tDay));

  // 2. Subheader Context
  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `📅 *${friendlyDate}*  |  🕒 Times displayed in *${userTimezone}*`
      }
    ]
  });

  // 3. Divider
  blocks.push({
    type: 'divider'
  });

  // 4. Matches Section
  if (targetMatches.length === 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '😴 *No World Cup matches scheduled for today.* Time to rest and catch up on highlights!'
      }
    });
  } else {
    targetMatches.forEach((match, index) => {
      const homeTeam = teamMap[match.home_team_id] || { name_en: `Team ${match.home_team_id}`, iso2: '' };
      const awayTeam = teamMap[match.away_team_id] || { name_en: `Team ${match.away_team_id}`, iso2: '' };
      const stadium = stadiumMap[match.stadium_id] || { name_en: 'Unknown Stadium', city_en: 'Unknown City', country_en: '' };
      
      const stadiumTz = STADIUM_TIMEZONES[match.stadium_id];
      const matchInstant = parseLocalDateInTimezone(match.local_date, stadiumTz);

      // Kickoff time in user's timezone
      const timeUser = formatInTimezone(matchInstant, userTimezone, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short'
      });

      // Kickoff time in stadium's local time
      const timeStadiumLocal = formatInTimezone(matchInstant, stadiumTz, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      // Group or Stage info
      const stageText = match.type === 'group' 
        ? `*Group ${match.group}* • Matchday ${match.matchday}`
        : `*${match.type.toUpperCase()}*`;

      const homeFlag = getFlagEmoji(homeTeam.iso2);
      const awayFlag = getFlagEmoji(awayTeam.iso2);

      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `⚽ *Match ${match.id}*  |  ${stageText}\n` +
                `👉 ${homeFlag} *${homeTeam.name_en}*  vs  *${awayTeam.name_en}* ${awayFlag}\n` +
                `⏰ *${timeUser}*  _(${timeStadiumLocal} local time in ${stadium.city_en})_\n` +
                `🏟️ *${stadium.name_en}* (${stadium.city_en}, ${stadium.country_en})`
        }
      });

      // Add a divider between matches (except for the last one)
      if (index < targetMatches.length - 1) {
        blocks.push({
          type: 'divider'
        });
      }
    });
  }

  // 5. Divider and Footer Context
  blocks.push({
    type: 'divider'
  });

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `⚽ *Devpost Sports Admin*  |  Inspiring teams to follow the beautiful game`
      }
    ]
  });

  return { blocks };
}
