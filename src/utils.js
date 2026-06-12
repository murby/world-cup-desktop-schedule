import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

// Map stadium IDs to IANA timezone strings
export const STADIUM_TIMEZONES = {
  '1': 'America/Mexico_City',     // Estadio Azteca (Mexico City)
  '2': 'America/Mexico_City',     // Estadio Akron (Guadalajara)
  '3': 'America/Monterrey',       // Estadio BBVA (Monterrey)
  '4': 'America/Chicago',         // AT&T Stadium (Dallas)
  '5': 'America/Chicago',         // NRG Stadium (Houston)
  '6': 'America/Chicago',         // Arrowhead Stadium (Kansas City)
  '7': 'America/New_York',        // Mercedes-Benz Stadium (Atlanta)
  '8': 'America/New_York',        // Hard Rock Stadium (Miami)
  '9': 'America/New_York',        // Gillette Stadium (Boston)
  '10': 'America/New_York',       // Lincoln Financial Field (Philadelphia)
  '11': 'America/New_York',       // MetLife Stadium (NY/NJ)
  '12': 'America/Toronto',        // BMO Field (Toronto)
  '13': 'America/Vancouver',      // BC Place (Vancouver)
  '14': 'America/Los_Angeles',    // Lumen Field (Seattle)
  '15': 'America/Los_Angeles',    // Levi's Stadium (SF/Santa Clara)
  '16': 'America/Los_Angeles',    // SoFi Stadium (Los Angeles)
};

/**
 * Loads a JSON data file from either /data or root directory
 * @param {string} filename 
 * @returns {any} parsed JSON data
 */
export function loadDataFile(filename) {
  const possiblePaths = [
    path.join(process.cwd(), 'data', filename),
    path.join(process.cwd(), filename),
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, 'utf8'));
    }
  }

  throw new Error(`Data file "${filename}" not found in project root or /data folder.`);
}

/**
 * Parses a local date string "MM/DD/YYYY HH:mm" for a specific timezone
 * and returns a standard Date object.
 * @param {string} localDateStr 
 * @param {string} timezone 
 * @returns {Date}
 */
export function parseLocalDateInTimezone(localDateStr, timezone) {
  const [datePart, timePart] = localDateStr.split(' ');
  const [month, day, year] = datePart.split('/').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Create UTC date representing the local date numbers
  // Date month is 0-indexed
  const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute));

  // Determine timezone difference using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(utcDate);
  const formatted = {};
  for (const part of parts) {
    if (part.type !== 'literal') {
      formatted[part.type] = Number(part.value);
    }
  }

  const candidateLocal = Date.UTC(
    formatted.year,
    formatted.month - 1,
    formatted.day,
    formatted.hour === 24 ? 0 : formatted.hour,
    formatted.minute
  );

  const targetLocal = Date.UTC(year, month - 1, day, hour, minute);
  const diff = targetLocal - candidateLocal;

  return new Date(utcDate.getTime() + diff);
}

/**
 * Formats a Date object in a specific timezone with options
 * @param {Date} date 
 * @param {string} timezone 
 * @param {object} options 
 * @returns {string}
 */
export function formatInTimezone(date, timezone, options = {}) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options
  }).format(date);
}

/**
 * Maps an ISO 2-letter country code (or FIFA code like ENG, SCO) to a Unicode flag emoji
 * @param {string} iso2 
 * @returns {string}
 */
export function getFlagEmoji(iso2) {
  if (!iso2) return '🏳️';
  
  const code = iso2.toUpperCase();
  // Special cases for UK home nations in FIFA
  if (code === 'ENG') return '🏴󠁧󠁢󠁥󠁮󠁧󠁿';
  if (code === 'SCO') return '🏴󠁧󠁢󠁳󠁣󠁴󠁿';
  if (code === 'WAL') return '🏴󠁧󠁢󠁷󠁬󠁳󠁿';
  if (code === 'NIR') return '🇬🇧'; // Northern Ireland standard fallback is UK flag
  
  if (code.length !== 2) return '🏳️';
  
  const charCodeAtZero = code.charCodeAt(0) - 65 + 0x1F1E6;
  const charCodeAtOne = code.charCodeAt(1) - 65 + 0x1F1E6;
  return String.fromCodePoint(charCodeAtZero, charCodeAtOne);
}

// API Cache Configuration
let apiMatchesCache = null;
let apiLastFetchedTime = 0;
const CACHE_TTL_MS = 25 * 1000; // 25 seconds cache TTL

/**
 * Fetches live matches/scores from football-data.org API if the API key is configured
 * @returns {Promise<Array|null>}
 */
async function fetchLiveScores() {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    return null;
  }

  const now = Date.now();
  if (apiMatchesCache && (now - apiLastFetchedTime < CACHE_TTL_MS)) {
    return apiMatchesCache;
  }

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions/WC/matches', {
      headers: { 'X-Auth-Token': apiKey }
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    apiMatchesCache = data.matches || [];
    apiLastFetchedTime = now;
    return apiMatchesCache;
  } catch (error) {
    console.error('Error fetching live scores:', error.message);
    return apiMatchesCache || null;
  }
}

/**
 * Retrieves match data for a specific date, enriched with live API scores if available
 * @param {string} [dateStr] - YYYY-MM-DD date string (defaults to today)
 * @returns {Promise<object>}
 */
export async function getMatchesData(dateStr) {
  try {
    const matches = loadDataFile('matches.json');
    const teams = loadDataFile('teams.json');
    const stadiums = loadDataFile('stadiums.json');

    // Fetch live scores from API (if key is present and cache is expired)
    const apiMatches = await fetchLiveScores();

    const teamMap = teams.reduce((acc, t) => {
      acc[t.id] = t;
      return acc;
    }, {});

    const stadiumMap = stadiums.reduce((acc, s) => {
      acc[s.id] = s;
      return acc;
    }, {});

    const userTimezone = process.env.USER_TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';

    // Parse target date
    let targetDate = dateStr;
    if (!targetDate) {
      const today = new Date();
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
        return false;
      }
    });

    // Sort matches chronologically
    targetMatches.sort((a, b) => {
      const tzB = STADIUM_TIMEZONES[b.stadium_id];
      const tzA = STADIUM_TIMEZONES[a.stadium_id];
      const dateA = parseLocalDateInTimezone(a.local_date, tzA);
      const dateB = parseLocalDateInTimezone(b.local_date, tzB);
      return dateA - dateB;
    });

    // Map matches to a clean representation
    const formattedMatches = targetMatches.map(match => {
      const homeTeam = teamMap[match.home_team_id] || { name_en: `Team ${match.home_team_id}`, flag: '', iso2: '', fifa_code: '' };
      const awayTeam = teamMap[match.away_team_id] || { name_en: `Team ${match.away_team_id}`, flag: '', iso2: '', fifa_code: '' };
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

      // Calculate state dynamically based on simulated/current time
      const now = new Date();
      let finished = match.finished === 'TRUE' || match.finished === true;
      let homeScore = match.home_score || '0';
      let awayScore = match.away_score || '0';
      let timeElapsed = match.time_elapsed || 'notstarted';

      const matchTime = matchInstant.getTime();
      const nowTime = now.getTime();
      const matchDurationMs = 105 * 60 * 1000; // 105 minutes (90' + halftime + added time)

      let foundInApi = false;

      // Try to enrich using API data if available
      if (apiMatches && apiMatches.length > 0) {
        const localHomeCode = homeTeam.fifa_code || homeTeam.iso2 || '';
        const localAwayCode = awayTeam.fifa_code || awayTeam.iso2 || '';

        const apiMatch = apiMatches.find(am => {
          const apiHomeTla = am.homeTeam?.tla || '';
          const apiAwayTla = am.awayTeam?.tla || '';
          return (
            apiHomeTla.toUpperCase() === localHomeCode.toUpperCase() &&
            apiAwayTla.toUpperCase() === localAwayCode.toUpperCase()
          );
        });

        if (apiMatch) {
          foundInApi = true;
          finished = apiMatch.status === 'FINISHED';
          homeScore = String(apiMatch.score?.fullTime?.home ?? 0);
          awayScore = String(apiMatch.score?.fullTime?.away ?? 0);

          if (apiMatch.status === 'IN_PLAY' || apiMatch.status === 'LIVE') {
            const elapsed = Math.floor((nowTime - matchTime) / 60000);
            timeElapsed = String(Math.min(90, Math.max(1, elapsed)));
          } else if (apiMatch.status === 'PAUSED') {
            timeElapsed = 'HT';
          } else if (finished) {
            timeElapsed = 'finished';
          } else {
            timeElapsed = 'notstarted';
          }
        }
      }

      // Offline deterministic simulation fallback
      if (!foundInApi) {
        const idNum = parseInt(match.id) || 1;
        const finalHomeScore = (idNum * 7) % 4;  // 0 to 3 goals
        const finalAwayScore = (idNum * 13) % 3; // 0 to 2 goals

        if (nowTime >= matchTime + matchDurationMs) {
          finished = true;
          homeScore = String(finalHomeScore);
          awayScore = String(finalAwayScore);
          timeElapsed = 'finished';
        } else if (nowTime >= matchTime) {
          finished = false;
          const elapsedMinutes = Math.floor((nowTime - matchTime) / 60000);
          
          if (elapsedMinutes >= 45 && elapsedMinutes < 60) {
            timeElapsed = 'HT';
          } else {
            const gameMin = elapsedMinutes >= 60 ? elapsedMinutes - 15 : elapsedMinutes;
            timeElapsed = String(Math.min(90, gameMin));
          }

          const progress = Math.min(1, elapsedMinutes / 90);
          homeScore = String(Math.floor(finalHomeScore * progress));
          awayScore = String(Math.floor(finalAwayScore * progress));
        } else {
          finished = false;
          homeScore = '0';
          awayScore = '0';
          timeElapsed = 'notstarted';
        }
      }

      return {
        id: match.id,
        homeTeam: {
          name: homeTeam.name_en,
          flag: homeTeam.flag,
          iso2: homeTeam.iso2
        },
        awayTeam: {
          name: awayTeam.name_en,
          flag: awayTeam.flag,
          iso2: awayTeam.iso2
        },
        stadium: {
          name: stadium.name_en,
          city: stadium.city_en,
          country: stadium.country_en
        },
        kickoffUser: timeUser,
        kickoffLocal: timeStadiumLocal,
        localTimezone: stadiumTz,
        group: match.group,
        matchday: match.matchday,
        type: match.type,
        finished,
        homeScore,
        awayScore,
        timeElapsed
      };
    });

    const friendlyDate = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone,
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(new Date(tYear, tMonth - 1, tDay));

    return {
      success: true,
      dateStr: targetDate,
      friendlyDate,
      userTimezone,
      matches: formattedMatches
    };
  } catch (error) {
    console.error('Data retrieval error:', error);
    return { success: false, error: error.message };
  }
}
