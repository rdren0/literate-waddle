# Harry Potter Jeopardy Discord Bot

A Discord bot that lets players participate in Harry Potter Jeopardy games directly from Discord.

## Features

- 🎯 Full Jeopardy game with 6 categories and 5 difficulty levels
- 🏆 Real-time scoring and leaderboards
- 📊 Automatic answer validation with flexible matching
- ⏰ Question timeouts (60 seconds default)
- 🎮 Easy-to-use commands
- 📋 Visual game board display with Discord embeds
- 🔄 Real-time sync with web interface
- 👥 Support for multiple players (up to 50)

## Prerequisites

Before starting, make sure you have:
- **Node.js 16.0.0 or higher** - [Download here](https://nodejs.org/)
- **A Discord account** - [Create one here](https://discord.com/)
- **Administrator permissions** on the Discord server where you want to add the bot

## Detailed Setup Instructions

### Step 1: Create Discord Application & Bot

#### 1.1 Create the Application
1. Open your web browser and go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click the **"New Application"** button (blue button in top-right)
3. Enter a name for your bot (e.g., "Harry Potter Jeopardy Bot")
4. Click **"Create"**

#### 1.2 Configure Application Settings
1. On the **General Information** tab:
   - Add a description: "Harry Potter Jeopardy bot for trivia games"
   - Upload an icon if desired (optional)
   - Save changes

#### 1.3 Create the Bot
1. Click on the **"Bot"** tab in the left sidebar
2. Click **"Add Bot"** button
3. Click **"Yes, do it!"** to confirm
4. Configure bot settings:
   - **Username**: Change if desired (e.g., "HP-Jeopardy-Bot")
   - **Public Bot**: Leave ON (checked) - **IMPORTANT: Must be enabled to generate invite URLs**
   - **Requires OAuth2 Code Grant**: Leave OFF (unchecked)

5. **Configure Privileged Gateway Intents** (scroll down to bottom of Bot page):
   - **Presence Intent**: Can be OFF (unchecked) - not needed for this bot
   - **Server Members Intent**: Must be OFF (unchecked) - not needed and requires verification for large bots
   - **Message Content Intent**: Turn ON (checked) - **CRITICAL: This is required for the bot to read messages!**

**IMPORTANT**: The Message Content Intent is absolutely required. Without it, the bot cannot see message content and won't work.

#### 1.4 Get Your Bot Token
1. In the **Token** section, click **"Reset Token"**
2. Click **"Yes, do it!"** to confirm
3. Click **"Copy"** to copy your bot token
4. **IMPORTANT**: Save this token somewhere secure - you'll need it later and it won't be shown again

### Step 2: Set Bot Permissions & Invite to Server

#### 2.1 Generate Invite URL
1. Click on the **"OAuth2"** tab in the left sidebar
2. Click on **"URL Generator"** sub-tab
3. In the **Scopes** section, check:
   - ✅ `bot`
4. In the **Bot Permissions** section, check:
   - ✅ `Send Messages`
   - ✅ `Embed Links`
   - ✅ `Read Message History`
   - ✅ `Use External Emojis` (optional, for enhanced display)
   - ✅ `Add Reactions` (optional, for enhanced interactivity)

#### 2.2 Invite Bot to Your Server
1. Copy the generated URL at the bottom of the page
2. Open the URL in a new tab
3. Select the Discord server where you want to add the bot
4. Click **"Continue"**
5. Review permissions and click **"Authorize"**
6. Complete any CAPTCHA if prompted
7. You should see "Authorized" and the bot will appear in your server (offline initially)

### Step 3: Install and Configure the Bot

#### 3.1 Navigate to Bot Directory
Open your terminal/command prompt and navigate to the discord-bot folder:

```bash
# Windows Command Prompt
cd C:\Users\howar_0dcfaas\Repos\witches-and-snitches\discord-bot

# Windows PowerShell
cd "C:\Users\howar_0dcfaas\Repos\witches-and-snitches\discord-bot"

# Mac/Linux
cd /path/to/witches-and-snitches/discord-bot
```

#### 3.2 Install Dependencies
```bash
npm install
```

You should see output similar to:
```
added 15 packages, and audited 16 packages in 3s
found 0 vulnerabilities
```

#### 3.3 Create Environment File
```bash
# Copy the example file
cp .env.example .env
```

#### 3.4 Configure Environment Variables
Open the `.env` file in your text editor and replace the placeholder values:

```env
# Discord Bot Configuration
DISCORD_BOT_TOKEN=YOUR_ACTUAL_BOT_TOKEN_HERE

# Optional: Bot settings (defaults shown)
QUESTION_TIMEOUT=60000
MAX_PLAYERS=50
```

**Replace `YOUR_ACTUAL_BOT_TOKEN_HERE` with the token you copied in Step 1.4**

### Step 4: Test the Bot

#### 4.1 Start the Bot
```bash
# For development (auto-restarts on file changes)
npm run dev

# OR for production
npm start
```

#### 4.2 Verify Bot is Online
You should see output like:
```
Discord bot logged in as: HP-Jeopardy-Bot#1234
Bot is ready and listening for commands!
```

In your Discord server, the bot's status should change from offline to online.

#### 4.3 Test Basic Functionality
In any text channel where the bot has permissions, try:

```
!jeopardy help
```

You should receive a help message with all available commands.

### Step 5: Start Your First Game

#### 5.1 Start a Game
```
!jeopardy start
```

The bot will display the game board and instructions.

#### 5.2 Pick a Question
```
!jeopardy pick 1 1
```

This selects the first category, $100 question.

#### 5.3 Answer the Question
Simply type your answer in the chat (no special command needed):
```
Expecto Patronum
```

#### 5.4 Check Scores
```
!jeopardy scores
```

## Complete Command Reference

### Game Commands

#### `!jeopardy start`
- **Purpose**: Starts a new Jeopardy game
- **Usage**: `!jeopardy start`
- **Example**:
  ```
  User: !jeopardy start
  Bot: 🎮 HARRY POTTER JEOPARDY GAME STARTED! 🎮
       [Displays full game board with all categories and dollar amounts]
  ```
- **Notes**: Only one game can be active at a time. Use `!jeopardy reset` to clear existing games.

#### `!jeopardy board`
- **Purpose**: Displays the current game board
- **Usage**: `!jeopardy board`
- **Shows**: All categories, available questions (✅ for completed questions)
- **Example**:
  ```
  User: !jeopardy board
  Bot: [Displays current board state with completed questions marked]
  ```

#### `!jeopardy pick [category] [points]`
- **Purpose**: Select a specific question to answer
- **Usage**: `!jeopardy pick <category_number> <difficulty_level>`
- **Parameters**:
  - `category_number`: 1-6
    - 1 = SPELLS & MAGIC
    - 2 = HOGWARTS HISTORY
    - 3 = MAGICAL CREATURES
    - 4 = POTIONS
    - 5 = DEFENSE AGAINST DARK ARTS
    - 6 = WIZARDING WORLD
  - `difficulty_level`: 1-5
    - 1 = $100 (easiest)
    - 2 = $200
    - 3 = $300
    - 4 = $400
    - 5 = $500 (hardest)
- **Examples**:
  ```
  !jeopardy pick 1 1    # SPELLS & MAGIC, $100
  !jeopardy pick 3 5    # MAGICAL CREATURES, $500
  !jeopardy pick 6 2    # WIZARDING WORLD, $200
  ```
- **Notes**: Cannot pick already-answered questions. Game must be started first.

#### `!jeopardy end`
- **Purpose**: Ends the current game and shows final scores
- **Usage**: `!jeopardy end`
- **Result**: Displays final leaderboard and clears game state

#### `!jeopardy reset`
- **Purpose**: Immediately clears/resets the current game
- **Usage**: `!jeopardy reset`
- **Warning**: This will erase all progress and scores!

### Information Commands

#### `!jeopardy scores`
- **Purpose**: Shows current leaderboard
- **Usage**: `!jeopardy scores`
- **Displays**: Top players with their current scores, sorted by points
- **Example Output**:
  ```
  🏆 CURRENT LEADERBOARD 🏆
  1. PlayerName - $800
  2. AnotherPlayer - $500
  3. ThirdPlayer - $300
  ```

#### `!jeopardy help`
- **Purpose**: Shows comprehensive help message
- **Usage**: `!jeopardy help`
- **Displays**: All commands, categories, and basic game rules

### Answering Questions

#### How to Answer
- **No special command needed** - just type your answer in chat
- **Timer**: You have 60 seconds to answer (configurable)
- **Multiple attempts**: Players can try different answers until timeout
- **Answer format**: Case-insensitive, flexible matching (e.g., "patronus" matches "Patronus")

#### Answer Examples
```
Bot: 🎯 SPELLS & MAGIC - $300
     What spell creates a Patronus?

✅ Correct answers:
- Expecto Patronum
- expecto patronum
- EXPECTO PATRONUM
- Patronus Charm

❌ Incorrect examples:
- Protego
- Lumos
```

## Complete Game Flow Example

```
Player1: !jeopardy start
Bot: 🎮 HARRY POTTER JEOPARDY GAME STARTED! 🎮
     [Shows complete 6x5 board with all categories and dollar amounts]

Player1: !jeopardy pick 1 1
Bot: 🎯 SPELLS & MAGIC - $100
     📝 What is the most basic lighting spell?
     ⏰ You have 60 seconds to answer!

Player2: Lumos
Bot: 🎉 Correct! Player2 earned $100!
     💰 Player2's total: $100

Player1: !jeopardy pick 2 3
Bot: 🎯 HOGWARTS HISTORY - $300
     📝 Which Hogwarts founder created the Chamber of Secrets?

Player1: Salazar Slytherin
Bot: 🎉 Correct! Player1 earned $300!
     💰 Player1's total: $300

Player2: !jeopardy scores
Bot: 🏆 CURRENT LEADERBOARD 🏆
     1. Player1 - $300
     2. Player2 - $100

Player1: !jeopardy board
Bot: 📋 CURRENT GAME BOARD 📋
     [Shows board with completed questions marked with ✅]

Player1: !jeopardy end
Bot: 🏁 GAME ENDED! 🏁
     🏆 FINAL STANDINGS 🏆
     1. Player1 - $300
     2. Player2 - $100

     Thanks for playing Harry Potter Jeopardy!
```

## Categories

1. **SPELLS & MAGIC** - Spells, charms, curses, and magical concepts
2. **HOGWARTS HISTORY** - School history, founders, events, traditions
3. **MAGICAL CREATURES** - Animals, beings, and creatures from the series
4. **POTIONS** - Potions, ingredients, brewing, and effects
5. **DEFENSE AGAINST DARK ARTS** - DADA teachers, dark magic, protection
6. **WIZARDING WORLD** - General wizarding world knowledge, locations, culture

## Difficulty Levels

- **$100** - Basic facts and common knowledge
- **$200** - Intermediate questions
- **$300** - Moderate difficulty
- **$400** - Advanced knowledge required
- **$500** - Expert level, complex concepts

## Advanced Configuration

### Environment Variables

The `.env` file supports these configuration options:

```env
# Required: Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token_here

# Optional: Game Settings
QUESTION_TIMEOUT=60000        # Time limit per question (milliseconds)
MAX_PLAYERS=50               # Maximum players per game
```

### Customizing Game Settings

#### Question Timeout
- **Default**: 60 seconds (60000 ms)
- **Range**: 10-300 seconds (10000-300000 ms)
- **Example**: Set to 30 seconds: `QUESTION_TIMEOUT=30000`

#### Maximum Players
- **Default**: 50 players
- **Range**: 1-100 players
- **Example**: Limit to 20 players: `MAX_PLAYERS=20`

### Running in Production

#### Using PM2 (Recommended)
```bash
# Install PM2 globally
npm install -g pm2

# Start bot with PM2
pm2 start bot.js --name "hp-jeopardy-bot"

# View logs
pm2 logs hp-jeopardy-bot

# Restart bot
pm2 restart hp-jeopardy-bot

# Stop bot
pm2 stop hp-jeopardy-bot
```

#### Using Docker (Optional)
Create a `Dockerfile` in the discord-bot directory:

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["npm", "start"]
```

## Web Interface Integration

### Real-time Sync with Web Board

The Discord bot automatically syncs with the web interface when both are running:

1. **Start the web application** (main React app)
2. **Start the Discord bot**
3. **Enable Discord Sync** in the web interface
4. **Game state syncs automatically** between Discord and web

#### Sync Features
- ✅ Completed questions sync between platforms
- ✅ Current game state displays on web
- ✅ Player scores visible on web interface
- ✅ Real-time updates every 2 seconds

#### Using Both Platforms
- **Discord**: Players can answer questions and interact with the bot
- **Web**: Game master can monitor progress and see visual board
- **Automatic**: No manual sync required - everything updates automatically

## Comprehensive Troubleshooting

### Bot Issues

#### ❌ Bot Not Responding to Commands

**Symptoms**: Bot is online but doesn't respond to `!jeopardy` commands

**Possible Causes & Solutions**:

1. **Missing Message Content Intent**
   ```
   Solution: Go to Discord Developer Portal > Your App > Bot
   Scroll down to "Privileged Gateway Intents"
   ✅ Enable "Message Content Intent"
   Save changes and restart the bot
   ```

2. **Incorrect Permissions**
   ```
   Solution: Check bot permissions in Discord server
   Required: Send Messages, Embed Links, Read Message History
   Re-invite bot with correct permissions if needed
   ```

3. **Bot Token Issues**
   ```
   Check console for "Invalid Token" error
   Solution: Generate new token in Developer Portal
   Update .env file with new token
   ```

#### ❌ "Used disallowed intents" Error

**Symptoms**: Bot fails to start with "Error: Used disallowed intents"

**Solution**:
```
1. Go to Discord Developer Portal > Your App > Bot
2. Scroll to "Privileged Gateway Intents" section at bottom
3. Configure intents exactly as follows:
   ❌ Presence Intent: OFF (unchecked)
   ❌ Server Members Intent: OFF (unchecked)
   ✅ Message Content Intent: ON (checked)
4. Save changes
5. Restart the bot
```

**Note**: Server Members Intent requires Discord verification for bots in 100+ servers. This bot doesn't need it.

#### ❌ Bot Appears Offline

**Symptoms**: Bot shows as offline in Discord

**Solutions**:
```bash
# Check if bot process is running
ps aux | grep node  # Linux/Mac
tasklist | findstr node  # Windows

# Check for errors in console output
npm start  # Look for connection errors

# Common fixes:
1. Verify DISCORD_BOT_TOKEN in .env is correct
2. Check internet connection
3. Verify Discord service status
4. Restart the bot process
```

#### ❌ "Private application cannot have a default authorization link"

**Symptoms**: Error when trying to generate OAuth2 invite URL

**Solution**:
```
1. Go to Discord Developer Portal > Your App > Bot
2. Find "Public Bot" setting
3. ✅ Turn ON "Public Bot" (must be checked)
4. Save changes
5. Go back to OAuth2 > URL Generator
6. Generate new invite URL
```

**Note**: "Public Bot" doesn't mean everyone can use your bot - it just allows you to generate invite links. You still control which servers it joins.

#### ❌ "Missing Access" Error

**Symptoms**: Bot says it can't send messages or see channel

**Solution**:
```
1. Right-click on text channel → Edit Channel
2. Go to Permissions tab
3. Add your bot role
4. Grant permissions:
   ✅ View Channel
   ✅ Send Messages
   ✅ Embed Links
   ✅ Read Message History
```

### Game Issues

#### ❌ "No active game" Error

**Symptoms**: Commands fail with "No active game found"

**Solutions**:
```
1. Start a new game: !jeopardy start
2. If that fails: !jeopardy reset then !jeopardy start
3. Check console for errors loading trivia data
```

#### ❌ Questions Not Loading/Displaying

**Symptoms**: Board shows but questions don't appear when picked

**Check These**:
```bash
# 1. Verify trivia data file exists
ls ../src/Components/JeopardyBoard/Data/harry_potter_qa.json

# 2. Check JSON format is valid
node -e "console.log(JSON.parse(require('fs').readFileSync('../src/Components/JeopardyBoard/Data/harry_potter_qa.json')))"

# 3. Check file permissions
chmod 644 ../src/Components/JeopardyBoard/Data/harry_potter_qa.json
```

#### ❌ Answer Not Being Recognized

**Symptoms**: Correct answers marked as wrong

**Debug Steps**:
```
1. Check answer format in trivia JSON file
2. Try exact answer from JSON file
3. Check for special characters or formatting
4. Look for console output showing answer comparison
```

### Technical Issues

#### ❌ "EADDRINUSE" or Port Conflicts

**Symptoms**: Error about port already in use

**Solutions**:
```bash
# Find process using the port
lsof -i :PORT_NUMBER  # Mac/Linux
netstat -ano | findstr :PORT_NUMBER  # Windows

# Kill the process
kill -9 PID  # Mac/Linux
taskkill /PID PID /F  # Windows

# Or use different port in code
```

#### ❌ "Cannot find module" Errors

**Symptoms**: Import/require errors when starting bot

**Solutions**:
```bash
# Clean install dependencies
rm -rf node_modules package-lock.json
npm install

# Verify Node.js version
node --version  # Should be 16.0.0 or higher

# Check file paths
ls -la  # Verify bot.js exists
ls -la ../src/services/  # Verify service files exist
```

#### ❌ JSON Parse Errors

**Symptoms**: Errors loading trivia data

**Solutions**:
```bash
# Validate JSON file
node -e "JSON.parse(require('fs').readFileSync('../src/Components/JeopardyBoard/Data/harry_potter_qa.json'))"

# Check file encoding (should be UTF-8)
file ../src/Components/JeopardyBoard/Data/harry_potter_qa.json

# Re-download or recreate JSON file if corrupted
```

### Network Issues

#### ❌ Discord API Rate Limits

**Symptoms**: Bot stops responding, "Rate limited" in console

**Solutions**:
```
1. Wait 60 seconds for rate limit to reset
2. Reduce command frequency
3. Implement longer delays between API calls
4. Check for command spam
```

#### ❌ Connection Timeout Errors

**Symptoms**: Bot disconnects frequently

**Solutions**:
```
1. Check internet connection stability
2. Verify firewall isn't blocking connections
3. Try different network/VPN
4. Check Discord service status: https://discordstatus.com/
```

### Debugging Tools

#### Enable Debug Logging
Add to your `.env` file:
```env
DEBUG=true
LOG_LEVEL=debug
```

#### Check Bot Logs
```bash
# View recent logs
npm start | tee bot.log

# Monitor logs in real-time
tail -f bot.log

# Search for specific errors
grep -i "error" bot.log
```

#### Test Bot Connection
```bash
# Simple connection test
node -e "
const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });
client.login('YOUR_BOT_TOKEN');
client.on('ready', () => { console.log('✅ Connection successful!'); process.exit(0); });
client.on('error', (err) => { console.error('❌ Connection failed:', err); process.exit(1); });
"
```

### Getting Help

If you're still experiencing issues:

1. **Check Console Output**: Always look at the terminal/console where the bot is running
2. **Enable Debug Mode**: Add `DEBUG=true` to your `.env` file
3. **Test Step by Step**:
   - Can you see the bot online in Discord?
   - Does `!jeopardy help` work?
   - Can you start a game?
   - Can you pick a question?
4. **Check Dependencies**: Ensure all npm packages are installed correctly
5. **Verify Permissions**: Double-check all Discord permissions are set correctly

#### Common Error Messages & Solutions

| Error Message | Solution |
|---------------|----------|
| `Invalid Token` | Check DISCORD_BOT_TOKEN in .env file |
| `Missing Intent` | Enable Message Content Intent in Developer Portal |
| `Missing Permissions` | Grant bot proper channel permissions |
| `Cannot find module` | Run `npm install` in discord-bot directory |
| `ENOTFOUND discord.com` | Check internet connection |
| `Rate limited` | Wait 60 seconds, reduce command frequency |
| `JSON parse error` | Check trivia data file format |

## Development

### Project File Structure
```
witches-and-snitches/
├── discord-bot/                           # Discord bot directory
│   ├── bot.js                            # Main bot application
│   ├── package.json                      # Node.js dependencies
│   ├── .env.example                      # Environment template
│   ├── .env                              # Your configuration (create this)
│   └── README.md                         # This documentation
│
├── src/
│   ├── Components/JeopardyBoard/
│   │   ├── JeopardyBoard.js              # Web interface component
│   │   ├── DiscordSync.js                # Discord sync component
│   │   └── Data/harry_potter_qa.json     # Trivia questions database
│   │
│   └── services/
│       ├── discordBotService.js          # Core game logic
│       └── discordBotCommands.js         # Discord command handlers
```

### Adding New Features

#### Adding New Game Commands
1. **Add command handler** in `src/services/discordBotCommands.js`:
```javascript
export const handleNewCommand = (args) => {
  // Command logic here
  return { success: true, message: "Command executed!" };
};
```

2. **Register command** in `discord-bot/bot.js`:
```javascript
if (command === 'newcommand') {
  const result = discordCommands.handleNewCommand(args);
  // Handle result
}
```

#### Modifying Game Logic
- **Game state**: Edit `src/services/discordBotService.js`
- **Question handling**: Modify the `handleAnswer()` function
- **Scoring system**: Update the `updatePlayerScore()` function

#### Adding New Trivia Categories
1. **Update trivia data** in `src/Components/JeopardyBoard/Data/harry_potter_qa.json`
2. **Modify category list** in both:
   - `src/Components/JeopardyBoard/JeopardyBoard.js`
   - `src/services/discordBotCommands.js`

### Testing Your Changes

#### Local Testing
```bash
# 1. Test JSON data integrity
node -e "console.log('✅ JSON valid:', !!require('../src/Components/JeopardyBoard/Data/harry_potter_qa.json'))"

# 2. Test bot connection
npm start

# 3. Test in Discord
!jeopardy help
!jeopardy start
```

#### Debug Mode
Enable detailed logging by adding to `.env`:
```env
DEBUG=true
LOG_LEVEL=debug
```

### Performance Considerations

#### Bot Performance
- **Memory usage**: ~50-100MB for typical game
- **Response time**: <2 seconds for most commands
- **Concurrent games**: Supports 1 active game per bot instance

#### Scaling for Multiple Servers
To support multiple Discord servers simultaneously:
1. Modify game state to be server-specific
2. Use server ID as key for game storage
3. Update all game functions to include server context

### Security Best Practices

#### Environment Security
- ✅ Never commit `.env` file to version control
- ✅ Use strong, unique bot tokens
- ✅ Regularly rotate bot tokens
- ✅ Limit bot permissions to minimum required

#### Code Security
- ✅ Validate all user inputs
- ✅ Sanitize answers before comparison
- ✅ Rate limit command usage
- ✅ Handle errors gracefully

### Deployment Options

#### Simple VPS/Server Deployment
```bash
# 1. Clone repository
git clone <your-repo>
cd witches-and-snitches/discord-bot

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your bot token

# 4. Start with PM2
npm install -g pm2
pm2 start bot.js --name hp-jeopardy

# 5. Set up auto-restart
pm2 startup
pm2 save
```

#### Docker Deployment
```bash
# Build image
docker build -t hp-jeopardy-bot .

# Run container
docker run -d --name hp-jeopardy --env-file .env hp-jeopardy-bot

# View logs
docker logs -f hp-jeopardy
```

#### Cloud Platform Deployment
- **Heroku**: Add `Procfile` with `web: node bot.js`
- **Railway**: Connect GitHub repo, set environment variables
- **DigitalOcean App Platform**: Use Node.js buildpack
- **AWS EC2**: Standard Node.js deployment

## Support & Resources

### Getting Help

#### Before Asking for Help
1. ✅ Check this README thoroughly
2. ✅ Look at console/terminal output for errors
3. ✅ Verify all prerequisites are installed
4. ✅ Test with simple commands first (`!jeopardy help`)
5. ✅ Check Discord service status at https://discordstatus.com/

#### When Reporting Issues
Please include:
- **Operating System** (Windows 10, macOS Big Sur, Ubuntu 20.04, etc.)
- **Node.js Version** (`node --version`)
- **Error Messages** (full console output)
- **Steps to Reproduce** (what you did before the error)
- **Expected vs Actual Behavior**

#### Community Resources
- **Discord.js Documentation**: https://discord.js.org/
- **Discord Developer Portal**: https://discord.com/developers/applications
- **Node.js Documentation**: https://nodejs.org/docs/

### FAQ

#### Q: Can I run multiple bots simultaneously?
A: Yes, but each needs a separate bot token and application in Discord Developer Portal.

#### Q: How do I backup my trivia questions?
A: The questions are stored in `src/Components/JeopardyBoard/Data/harry_potter_qa.json` - back up this file.

#### Q: Can I add my own questions?
A: Yes! Edit the JSON file following the existing format with categories and difficulty levels.

#### Q: Why does the bot sometimes not respond?
A: Usually due to missing Message Content Intent or incorrect permissions. Check the troubleshooting section.

#### Q: Can I change the command prefix from `!jeopardy`?
A: Yes, modify the command parsing in `discord-bot/bot.js` around line 20-30.

#### Q: How do I update the bot?
A: Pull latest changes from git, run `npm install`, and restart the bot with `pm2 restart hp-jeopardy` (if using PM2).

---

🎮 **Happy gaming!** If you encounter any issues not covered in this guide, please check the console output first, then refer to the troubleshooting section. The bot is designed to be robust and user-friendly for Harry Potter trivia enthusiasts!