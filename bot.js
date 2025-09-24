import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { discordBotCommands } from "./services/discordBotCommands.js";
import { discordBot } from "./services/discordBotService.js";
import dotenv from "dotenv";

dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const PREFIX = "!trivia";
const QUESTION_TIMEOUT = 60000;

client.once("ready", async () => {
  console.log(`🤖 Bot is online as ${client.user.tag}!`);
  console.log(`📜 Serving ${client.guilds.cache.size} servers`);
  console.log(`🚀 Railway deployment successful!`);

  client.user.setActivity("Harry Potter Jeopardy!", { type: "PLAYING" });

  await registerSlashCommands();
});

async function registerSlashCommands() {
  const commands = [
    {
      name: "solo",
      description: "Start a solo trivia game (10 questions)",
    },
    {
      name: "create",
      description: "Create a new multiplayer game",
    },
    {
      name: "join",
      description: "Join the current game",
    },
    {
      name: "start",
      description: "Start the registered game",
    },
    {
      name: "board",
      description: "Show the current game board",
    },
    {
      name: "pick",
      description: "Pick a question from the board",
      options: [
        {
          name: "category",
          description: "Category number (1-6)",
          type: 4,
          required: true,
          choices: [
            {
              name: "1. Slytherin House, Death Eaters and The Dark Arts",
              value: 1,
            },
            { name: "2. Objects & Artifacts", value: 2 },
            {
              name: "3. Animals, Magical Creatures & Magical Beings",
              value: 3,
            },
            { name: "4. Witches,Wizard, Ghosts, and Muggles", value: 4 },
            {
              name: "5. Hogwarts, Other Locations and Transportation",
              value: 5,
            },
            { name: "6. Spells, Potions, and other magic", value: 6 },
          ],
        },
        {
          name: "points",
          description: "Point value (1-5)",
          type: 4,
          required: true,
          choices: [
            { name: "$100", value: 1 },
            { name: "$200", value: 2 },
            { name: "$300", value: 3 },
            { name: "$400", value: 4 },
            { name: "$500", value: 5 },
          ],
        },
      ],
    },
    {
      name: "answer",
      description: "Answer the current question",
      options: [
        {
          name: "answer",
          description: "Your answer to the trivia question",
          type: 3,
          required: true,
        },
      ],
    },
    {
      name: "scores",
      description: "Show the current leaderboard",
    },
    {
      name: "players",
      description: "Show registered players",
    },
    {
      name: "help",
      description: "Show help information",
    },
    {
      name: "end",
      description: "End the current game",
    },
    {
      name: "reset",
      description: "Reset the game",
    },
    {
      name: "fix",
      description: "Fix corrupted game state",
    },
    {
      name: "finalbet",
      description: "Set your bet for Final Jeopardy",
      options: [
        {
          name: "amount",
          description: "Bet amount (cannot exceed your current score)",
          type: 4, // INTEGER
          required: true,
        },
      ],
    },
    {
      name: "finalanswer",
      description: "Submit your Final Jeopardy answer (private)",
      options: [
        {
          name: "answer",
          description: "Your answer to the Final Jeopardy question",
          type: 3, // STRING
          required: true,
        },
      ],
    },
    {
      name: "final",
      description: "Manually start Final Jeopardy (for testing)",
    },
  ];

  try {
    console.log("🌀 Started refreshing application (/) commands.");
    await client.application.commands.set(commands);
    console.log("✅ Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("❌ Error registering slash commands:", error);
  }
}

client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  try {
    // Create a mock message object for compatibility with existing command handlers
    const mockMessage = {
      author: interaction.user,
      member: interaction.member,
      channel: interaction.channel,
      guild: interaction.guild,
      reply: async () => {
        // This is a no-op - we handle replies through handleSlashResponse
        return null;
      },
    };

    let result;
    let args = [commandName];

    if (commandName === "pick") {
      const category = interaction.options.getInteger("category");
      const points = interaction.options.getInteger("points");
      args = [commandName, category.toString(), points.toString()];
    } else if (commandName === "answer") {
      const answer = interaction.options.getString("answer");
      args = ["answer", ...(answer ? answer.split(" ") : [])];
    } else if (commandName === "finalbet") {
      const amount = interaction.options.getInteger("amount");
      args = ["finalbet", amount.toString()];
    } else if (commandName === "finalanswer") {
      const answer = interaction.options.getString("answer");
      args = ["finalanswer", ...(answer ? answer.split(" ") : [])];
    }

    result = await discordBotCommands.handleCommand(mockMessage, args);
    await handleSlashResponse(interaction, result);
  } catch (error) {
    console.error("Error handling slash command:", error);
    if (!interaction.replied) {
      await interaction.reply({
        content: `❌ An error occurred: ${error.message}`,
        flags: 64, // MessageFlags.Ephemeral
      });
    }
  }
});

async function handleSlashResponse(interaction, result) {
  if (!result) return;

  const responseData = {};

  // Make Final Jeopardy answers private using flags
  if (interaction.commandName === "finalanswer") {
    responseData.flags = 64; // MessageFlags.Ephemeral
  }

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
      responseData.content =
        result.content + "\n\n**Use `/answer` to respond!**";
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

  // Handle solo mode - send first question after initial setup
  if (result.isSinglePlayer && result.nextQuestion && result.questionNumber === 1) {
    setTimeout(async () => {
      try {
        if (!result.nextQuestion || !result.nextQuestion.question) {
          console.error("Error: nextQuestion is missing required properties", result.nextQuestion);
          return;
        }

        const questionEmbed = discordBotCommands.createQuestionEmbed(
          result.nextQuestion,
          result.player
        );

        await interaction.followUp({
          content: `📚 **Question ${result.questionNumber} of ${result.totalQuestions}** - ${result.nextQuestion.category}\n\n**Use `/answer` to respond!**`,
          embeds: [questionEmbed],
        });
      } catch (error) {
        console.error("Error sending first solo question:", error);
      }
    }, 2000);
  }

  // Handle solo mode - send next question after answer
  if (result.isSinglePlayer && result.nextQuestion && result.questionNumber > 1) {
    setTimeout(async () => {
      try {
        if (!result.nextQuestion || !result.nextQuestion.question) {
          console.error("Error: nextQuestion is missing required properties", result.nextQuestion);
          return;
        }

        const questionEmbed = discordBotCommands.createQuestionEmbed(
          result.nextQuestion,
          result.player
        );

        await interaction.followUp({
          content: `📚 **Question ${result.questionNumber} of ${result.totalQuestions}** - ${result.nextQuestion.category}\n\n**Use `/answer` to respond!**`,
          embeds: [questionEmbed],
        });
      } catch (error) {
        console.error("Error sending next solo question:", error);
      }
    }, 3000);
  }

  if (
    result &&
    (result.type === "correct" ||
      (result.type === "incorrect" &&
        result.content &&
        result.content.includes("Moving to next player")))
  ) {
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
