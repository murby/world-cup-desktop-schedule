# 🏆 World Cup 2026 Desktop & CLI Schedule App

A timezone-aware Node.js and Electron application that fetches and displays the daily match schedule for the **2026 FIFA World Cup** (June 11 – July 19, 2026). 

It features a dual interface:
1. 💻 **Desktop / Tray App**: A cyberpunk-themed desktop dashboard and macOS menu bar widget showing real-time live scores, match progress bars, venue timezones, and system performance metrics.
2. ⌨️ **CLI Daily Schedule Printer**: A clean, retro terminal-styled CLI command to check matches scheduled for today or any target date.

---

## 🚀 Features

- 🕒 **Timezone Aware**: Automatically translates kickoff times from stadium local time to your preferred local timezone (defaults to system timezone, customizable via `.env`).
- 🇺🇸🇲🇽🇨🇦 **Full Match Database**: Offline-first design with all 104 matches, groups, teams, and stadium metadata preloaded.
- ⚡ **Real-Time Live Scores**: Live score enrichment using the `football-data.org` API, with an offline deterministic simulation fallback for demo purposes.
- 🎨 **Cyberpunk Desktop UI**: Interactive Electron dashboard that can live in the tray/menu bar or be detached into a floating window.

---

## 🛠️ Setup & Installation

### 1. Install Dependencies
Ensure you have Node.js 18+ installed. Install the application dependencies:
```bash
npm install
```

### 2. Configure Environment Variables
Copy the `.env.example` file to `.env`:
```bash
cp .env.example .env
```

Open `.env` to configure your settings:
```ini
# Preferred timezone to display match kickoff times (defaults to system timezone)
USER_TIMEZONE=America/New_York

# Live Score API Configuration (football-data.org)
# Register for a free API key at https://www.football-data.org/client/register
FOOTBALL_DATA_API_KEY=
```

---

## 🕹️ CLI Usage

Get the daily schedule directly in your terminal with nice Unicode flag emojis and ANSI colors:

### 1. Print Today's Schedule
```bash
npm start
```

### 2. Print Schedule for a Specific Date
```bash
npm run test
# Or:
node index.js --date 2026-06-11
```

---

## 💻 Desktop Application

To launch the Cyberpunk-themed Electron app:
```bash
npm run desktop
```

### Features:
- **Minimize & Close**: Standard window buttons tailored for custom tray overlay.
- **Detach Window**: Click **DETACH** to separate the app from the menu bar into a resizable window.
- **Simulate Live**: Click **SIM_LIVE** to trigger a deterministic simulated game timeline to see live animations and goal alerts.

---

## 📂 Project Structure

- `data/`: Contains database files (`matches.json`, `teams.json`, `stadiums.json`).
- `src/utils.js`: Core helpers for IANA timezone offsets, Unicode flag emoji converters, and the `getMatchesData` schedule retriever.
- `electron/`: The Electron main and renderer processes for the Cyberpunk desktop application.
- `index.js`: The command line CLI daily schedule printer.
