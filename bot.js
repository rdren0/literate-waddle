import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { discordBotCommands } from "./services/discordBotCommands.js";
import { discordBot } from "./services/discordBotService.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const PREFIX = "!trivia";
const QUESTION_TIMEOUT = 60000;

client.once("ready", async () => {
  console.log(`🤖 Bot is online as ${client.user.tag}!`);
  console.log(`📊 Serving ${client.guilds.cache.size} servers`);
  console.log(`🚀 Railway deployment successful!`);

  client.user.setActivity("Harry Potter Jeopardy!", { type: "PLAYING" });

  // Register slash commands
  await registerSlashCommands();
});

async function registerSlashCommands() {
  const commands = [
    {
      name: 'trivia',
      description: 'Harry Potter Trivia Bot Commands',
      options: [
        {
          name: 'solo',
          description: 'Start a solo trivia game (10 questions)',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'create',
          description: 'Create a new multiplayer game',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'join',
          description: 'Join the current game',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'start',
          description: 'Start the registered game',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'board',
          description: 'Show the current game board',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'pick',
          description: 'Pick a question from the board',
          type: 1, // SUB_COMMAND
          options: [
            {
              name: 'category',
              description: 'Category number (1-6)',
              type: 4, // INTEGER
              required: true,
              choices: [
                { name: '1. Spells & Magic', value: 1 },
                { name: '2. Hogwarts History', value: 2 },
                { name: '3. Magical Creatures', value: 3 },
                { name: '4. Potions', value: 4 },
                { name: '5. Defense Against Dark Arts', value: 5 },
                { name: '6. Wizarding World', value: 6 },
              ],
            },
            {
              name: 'points',
              description: 'Point value (1-5)',
              type: 4, // INTEGER
              required: true,
              choices: [
                { name: '$100', value: 1 },
                { name: '$200', value: 2 },
                { name: '$300', value: 3 },
                { name: '$400', value: 4 },
                { name: '$500', value: 5 },
              ],
            },
          ],
        },
        {
          name: 'reply',
          description: 'Answer the current question',
          type: 1, // SUB_COMMAND
          options: [
            {
              name: 'answer',
              description: 'Your answer to the trivia question',
              type: 3, // STRING
              required: true,
            },
          ],
        },
        {
          name: 'scores',
          description: 'Show the current leaderboard',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'players',
          description: 'Show registered players',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'help',
          description: 'Show help information',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'end',
          description: 'End the current game',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'reset',
          description: 'Reset the game',
          type: 1, // SUB_COMMAND
        },
        {
          name: 'fix',
          description: 'Fix corrupted game state',
          type: 1, // SUB_COMMAND
        },
      ],
    },
  ];

  try {
    console.log('🔄 Started refreshing application (/) commands.');
    await client.application.commands.set(commands);
    console.log('✅ Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('❌ Error registering slash commands:', error);
  }
}

// Handle slash command interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "trivia") {
    const subcommand = interaction.options.getSubcommand();

    try {
      // Create a mock message object to work with existing command handlers
      const mockMessage = {
        author: interaction.user,
        member: interaction.member,
        channel: interaction.channel,
        guild: interaction.guild,
        reply: async (content) => {
          if (typeof content === 'string') {
            return await interaction.reply({ content, ephemeral: false });
          } else {
            return await interaction.reply({
              content: content.content,
              embeds: content.embeds || [],
              ephemeral: false
            });
          }
        }
      };

      let result;
      let args = [subcommand];

      // Handle subcommands with options
      if (subcommand === 'pick') {
        const category = interaction.options.getInteger('category');
        const points = interaction.options.getInteger('points');
        args = [subcommand, category.toString(), points.toString()];
      } else if (subcommand === 'reply') {
        const answer = interaction.options.getString('answer');
        args = [subcommand, ...answer.split(' ')];
      }

      result = await discordBotCommands.handleCommand(mockMessage, args);
      await handleSlashResponse(interaction, result);

    } catch (error) {
      console.error("Error handling slash command:", error);
      if (!interaction.replied) {
        await interaction.reply({
          content: `❌ An error occurred: ${error.message}`,
          ephemeral: true
        });
      }
    }
  }
});

async function handleSlashResponse(interaction, result) {
  if (!result) return;

  const responseData = {
    ephemeral: false
  };

  switch (result.type) {
    case "embed":
      responseData.content = result.content;
      responseData.embeds = [result.embed];
      break;
    case "success":
    case "error":
    case "info":
    case "correct":
    case "incorrect":
      responseData.content = result.content;
      if (result.embed) {
        responseData.embeds = [result.embed];
      }
      break;
    case "question":
      responseData.content = result.content + "\n\n**Use `/trivia reply` to respond!**";
      responseData.embeds = [result.embed];
      break;
    default:
      responseData.content = result.content;
      if (result.embed) {
        responseData.embeds = [result.embed];
      }
      break;
  }

  if (!interaction.replied) {
    await interaction.reply(responseData);
  } else {
    await interaction.followUp(responseData);
  }

  // Handle board display for slash commands
  if (result && (result.type === "correct" || (result.type === "incorrect" && result.content && result.content.includes("Moving to next player")))) {
    setTimeout(async () => {
      const boardStatus = discordBot.getGameStatus();
      if (boardStatus.success) {
        const boardEmbed = discordBotCommands.createBoardEmbed(
          boardStatus.boardStatus
        );
        const currentPlayer = discordBot.getCurrentPlayer();
        await interaction.followUp({
          content: `📋 **Updated Board** - <@${currentPlayer?.userId}>, choose your category and points!`,
          embeds: [boardEmbed],
        });
      }
    }, 1000);
  }
}

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    if (message.content.toLowerCase().startsWith(PREFIX)) {
      await handleCommand(message);
    }
  } catch (error) {
    console.error("Error handling message:", error);
    console.error("Error stack:", error.stack);
    console.error("Message content:", message.content);
    console.error("User ID:", message.author.id);
    // Only reply with error if it was a !trivia command
    if (message.content.toLowerCase().startsWith(PREFIX)) {
      message.reply(
        `❌ An error occurred while processing your request: ${error.message}`
      );
    }
  }
});

async function handleCommand(message) {
  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const result = await discordBotCommands.handleCommand(message, args);

  await sendResponse(message, result);

  // Show board after correct answers or max attempts reached (for !trivia reply commands)
  if (result && (result.type === "correct" || (result.type === "incorrect" && result.content && result.content.includes("Moving to next player")))) {
    setTimeout(async () => {
      const boardStatus = discordBot.getGameStatus();
      if (boardStatus.success) {
        const boardEmbed = discordBotCommands.createBoardEmbed(
          boardStatus.boardStatus
        );
        const currentPlayer = discordBot.getCurrentPlayer();
        message.channel.send({
          content: `📋 **Updated Board** - <@${currentPlayer?.userId}>, choose your category and points!`,
          embeds: [boardEmbed],
        });
      }
    }, 1000);
  }
}

async function handleAnswer(message) {
  const result = await discordBotCommands.handleAnswer(message);

  if (result.ephemeral) {
    const reply = await message.reply(result.content);
    setTimeout(() => {
      reply.delete().catch(() => {});
      message.delete().catch(() => {});
    }, 5000);
  } else {
    await sendResponse(message, result);
  }

  if (result.type === "correct" || (result.type === "incorrect" && result.content && result.content.includes("Moving to next player"))) {
    setTimeout(async () => {
      const boardStatus = discordBot.getGameStatus();
      if (boardStatus.success) {
        const boardEmbed = discordBotCommands.createBoardEmbed(
          boardStatus.boardStatus
        );
        const currentPlayer = discordBot.getCurrentPlayer();
        message.channel.send({
          content: `📋 **Updated Board** - <@${currentPlayer?.userId}>, choose your category and points!`,
          embeds: [boardEmbed],
        });
      }
    }, 1000);
  }
}

async function sendResponse(message, result) {
  if (!result) return;

  switch (result.type) {
    case "embed":
      await message.channel.send({
        content: result.content,
        embeds: [result.embed],
      });

      // If this is a game start, show the board again as a separate message for clarity
      if (result.content && result.content.includes("Game Started!")) {
        const boardStatus = discordBot.getGameStatus();
        if (boardStatus.success) {
          const boardEmbed = discordBotCommands.createBoardEmbed(
            boardStatus.boardStatus
          );
          const currentPlayer = discordBot.getCurrentPlayer();
          message.channel.send({
            content: `📋 **Current Board** - <@${currentPlayer?.userId}>, choose your category and points!`,
            embeds: [boardEmbed],
          });
        }
      }
      break;

    case "question":
      const questionMessage = await message.channel.send({
        content:
          result.content +
          "\n\n**Use `!trivia reply [your answer]` to respond!**",
        embeds: [result.embed],
      });

      setTimeout(async () => {
        const timeoutResult = discordBot.endCurrentQuestion();
        if (timeoutResult.success && timeoutResult.timedOut) {
          questionMessage.reply({
            content: `⏰ **Time's up!**\n**Correct answer:** ${timeoutResult.correctAnswer}`,
            embeds: [],
          });
        }
      }, QUESTION_TIMEOUT);
      break;

    case "correct":
      await message.channel.send({
        content: result.content,
        embeds: result.embed ? [result.embed] : [],
      });
      break;

    case "error":
    case "info":
      await message.reply(result.content);
      break;

    case "success":
      if (result.isSinglePlayer && result.nextQuestion) {
        const userId = result.player?.userId || message.author.id;
        await message.reply(
          result.content +
            `\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `**Question ${result.questionNumber} of ${result.totalQuestions}**\n\n` +
            `**${result.nextQuestion.question}**\n\n` +
            `<@${userId}>, use \`!trivia reply [your answer]\` to respond!`
        );
      } else {
        await message.reply(result.content);
      }
      break;

    default:
      await message.reply(result.content);
      break;
  }
}

client.on("error", (error) => {
  console.error("Discord client error:", error);
});

client.on("warn", (warning) => {
  console.warn("Discord client warning:", warning);
});

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("SIGINT", () => {
  console.log("🛑 Shutting down bot...");
  client.destroy();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("🛑 Shutting down bot...");
  client.destroy();
  process.exit(0);
});

const token = process.env.DISCORD_BOT_TOKEN;
if (!token) {
  console.error("❌ DISCORD_BOT_TOKEN not found in environment variables!");
  console.log(
    "Available environment variables:",
    Object.keys(process.env).filter(
      (key) => key.includes("DISCORD") || key.includes("TOKEN")
    )
  );
  console.log(
    "Please add DISCORD_BOT_TOKEN=your_bot_token to your .env file or Railway environment variables"
  );
  process.exit(1);
}

client.login(token).catch((error) => {
  console.error("❌ Failed to login to Discord:", error);
  process.exit(1);
});

export default client;
