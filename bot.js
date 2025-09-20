import { Client, GatewayIntentBits, EmbedBuilder } from 'discord.js';
import { discordBotCommands } from './services/discordBotCommands.js';
import { discordBot } from './services/discordBotService.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const PREFIX = '!trivia';
const QUESTION_TIMEOUT = 60000; // 60 seconds for questions

// Bot ready event
client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}!`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  console.log(`🚀 Railway deployment successful!`);

  // Set bot activity
  client.user.setActivity('Harry Potter Jeopardy!', { type: 'PLAYING' });
});

// Message handler
client.on('messageCreate', async (message) => {
  // Ignore bot messages
  if (message.author.bot) return;

  try {
    // Check if it's a command
    if (message.content.toLowerCase().startsWith(PREFIX)) {
      await handleCommand(message);
    } else {
      // Check if there's an active question and this might be an answer
      const gameStatus = discordBot.getGameStatus();
      if (gameStatus.success && gameStatus.gameState.answering) {
        await handleAnswer(message);
      }
    }
  } catch (error) {
    console.error('Error handling message:', error);
    console.error('Error stack:', error.stack);
    console.error('Message content:', message.content);
    console.error('User ID:', message.author.id);
    message.reply(`❌ An error occurred while processing your request: ${error.message}`);
  }
});

// Handle bot commands
async function handleCommand(message) {
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const result = await discordBotCommands.handleCommand(message, args);

  await sendResponse(message, result);
}

// Handle answer submissions
async function handleAnswer(message) {
  const result = await discordBotCommands.handleAnswer(message);

  if (result.ephemeral) {
    // Send ephemeral-like message (delete after delay)
    const reply = await message.reply(result.content);
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 5000);
  } else {
    await sendResponse(message, result);
  }

  // If question was answered correctly, show updated board after delay
  if (result.type === 'correct') {
    setTimeout(async () => {
      const boardStatus = discordBot.getGameStatus();
      if (boardStatus.success) {
        const boardEmbed = discordBotCommands.createBoardEmbed(boardStatus.boardStatus);
        message.channel.send({
          content: '📋 **Updated Board:**',
          embeds: [boardEmbed]
        });
      }
    }, 3000);
  }
}

// Send response based on result type
async function sendResponse(message, result) {
  if (!result) return;

  switch (result.type) {
    case 'embed':
      await message.channel.send({
        content: result.content,
        embeds: [result.embed]
      });
      break;

    case 'question':
      // Send question and start timeout
      const questionMessage = await message.channel.send({
        content: result.content,
        embeds: [result.embed]
      });

      // Set question timeout
      setTimeout(async () => {
        const timeoutResult = discordBot.endCurrentQuestion();
        if (timeoutResult.success && timeoutResult.timedOut) {
          questionMessage.reply({
            content: `⏰ **Time's up!**\n**Correct answer:** ${timeoutResult.correctAnswer}`,
            embeds: []
          });
        }
      }, QUESTION_TIMEOUT);
      break;

    case 'correct':
      await message.channel.send({
        content: result.content,
        embeds: result.embed ? [result.embed] : []
      });
      break;

    case 'error':
    case 'info':
      await message.reply(result.content);
      break;

    case 'success':
      await message.reply(result.content);

      // Handle single player next question
      if (result.isSinglePlayer && result.nextQuestion) {
        setTimeout(async () => {
          await message.channel.send(
            `**Question ${result.questionNumber} of ${result.totalQuestions}**\n\n` +
            `**${result.nextQuestion.question}**\n\n` +
            `<@${result.player.userId}>, type your answer!`
          );
        }, 1500); // Small delay for readability
      }
      break;

    default:
      await message.reply(result.content);
      break;
  }
}

// Error handling
client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.on('warn', (warning) => {
  console.warn('Discord client warning:', warning);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down bot...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('🛑 Shutting down bot...');
  client.destroy();
  process.exit(0);
});

// Login to Discord
const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error('❌ DISCORD_BOT_TOKEN not found in environment variables!');
  console.log('Available environment variables:', Object.keys(process.env).filter(key => key.includes('DISCORD') || key.includes('TOKEN')));
  console.log('Please add DISCORD_BOT_TOKEN=your_bot_token to your .env file or Railway environment variables');
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error('❌ Failed to login to Discord:', error);
  process.exit(1);
});

export default client;