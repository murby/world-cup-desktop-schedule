import fs from 'fs';
import path from 'path';

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
 * Maps an ISO 2-letter country code (or FIFA code like ENG, SCO) to Slack flag emoji
 * @param {string} iso2 
 * @returns {string}
 */
export function getFlagEmoji(iso2) {
  if (!iso2) return '🏳️';
  
  const code = iso2.toUpperCase();
  // Special cases for UK home nations in FIFA
  if (code === 'ENG') return ':flag-england:';
  if (code === 'SCO') return ':flag-scotland:';
  if (code === 'WAL') return ':flag-wales:';
  if (code === 'NIR') return ':flag-northern_ireland:';
  
  return `:flag-${code.toLowerCase()}:`;
}
