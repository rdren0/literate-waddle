import { discordBot } from "./discordBotService.js";

// Discord bot command handlers
export class DiscordBotCommands {
  constructor() {
    this.prefix = "!trivia";
    this.categories = [
      "SPELLS & MAGIC",
      "HOGWARTS HISTORY",
      "MAGICAL CREATURES",
      "POTIONS",
      "DEFENSE AGAINST DARK ARTS",
      "WIZARDING WORLD",
    ];
  }

  // Parse and handle commands
  async handleCommand(message, args) {
    const command = args[0]?.toLowerCase();

    switch (command) {
      case "solo":
        return this.startSoloGame(message);
      case "create":
        return this.createGame(message);
      case "join":
      case "register":
        return this.joinGame(message);
      case "players":
      case "waiting":
        return this.showWaitingPlayers(message);
      case "start":
        return this.startGame(message);
      case "board":
      case "status":
        return this.showBoard(message);
      case "pick":
      case "select":
        return this.selectQuestion(message, args);
      case "scores":
      case "leaderboard":
        return this.showScores(message);
      case "help":
        return this.showHelp(message);
      case "end":
        return this.endGame(message);
      case "reset":
        return this.resetGame(message);
      default:
        return this.showHelp(message);
    }
  }

  // Start solo game immediately
  async startSoloGame(message) {
    const userId = message.author.id;

    // Try to create a new user session
    const sessionResult = discordBot.createUserSession(
      userId,
      message.channel.id,
      message.guild?.id
    );

    if (sessionResult.error) {
      return {
        type: "error",
        content: `❌ ${sessionResult.error}`,
      };
    }

    // Start solo mode for this user's session
    const result = discordBot.startSoloModeForUser(
      userId,
      message.author.username,
      message.member?.displayName
    );

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    const embed = {
      title: "📚 Solo Trivia Challenge!",
      description: `**${result.player.displayName}**, you're about to take on 10 Harry Potter questions with increasing difficulty!`,
      color: 0x7c3aed, // Purple color
      fields: [
        {
          name: "📝 How It Works",
          value:
            "• 10 questions total with increasing difficulty\n" +
            "• Questions 1-2: Easy ($100 each)\n" +
            "• Questions 3-4: Medium-Easy ($200 each)\n" +
            "• Questions 5-6: Medium ($300 each)\n" +
            "• Questions 7-8: Medium-Hard ($400 each)\n" +
            "• Questions 9-10: Hard ($500 each)",
          inline: false,
        },
        {
          name: "🎯 Scoring",
          value:
            "• **Full Points**: Exact correct answer\n" +
            "• **Half Points**: Close/partial answer\n" +
            "• **No Points**: Wrong answer\n" +
            "• **One guess** per question only!",
          inline: false,
        },
        {
          name: "🏆 Your Goal",
          value: `**Maximum Score**: $3,000\n**Good Score**: $2,000+\n**Great Score**: $2,500+`,
          inline: false,
        },
      ],
      footer: {
        text: "Question 1 of 10 coming up next!",
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "success",
      content: `🎮 **Solo Mode Started!**`,
      embed,
      nextQuestion: result.question,
      questionNumber: result.questionNumber,
      totalQuestions: result.totalQuestions,
      player: result.player,
      isSinglePlayer: true,
    };
  }

  // Handle answer submissions (when no command prefix)
  async handleAnswer(message) {
    const userId = message.author.id;
    const username = message.author.username;
    const answer = message.content.trim();

    // Check if user has an active solo session first
    const userSession = discordBot.getUserSession(userId);
    if (userSession && userSession.answering) {
      const result = discordBot.submitUserAnswer(userId, username, answer);

      if (result.error) {
        return {
          type: "error",
          content: `❌ ${result.error}`,
        };
      }

      return this.handleSinglePlayerResponse(result);
    }

    // Fall back to multiplayer answer handling
    const result = discordBot.submitAnswer(userId, username, answer);

    if (result.error) {
      // Don't show "not your turn" errors to avoid spam
      if (result.notYourTurn) {
        return null; // Silent fail for wrong turn
      }
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    // Handle single player mode
    if (result.questionNumber) {
      return this.handleSinglePlayerResponse(result);
    }

    // Multi-player mode
    if (result.correct) {
      const nextPlayer = discordBot.getCurrentPlayer();
      const isDailyDouble = discordBot.currentQuestion?.isDailyDouble;

      let correctMessage = isDailyDouble
        ? `🎊 **DAILY DOUBLE CORRECT!** 🎊 ${result.winner.displayName} earned **$${result.points}** (DOUBLE POINTS)!`
        : `🎉 **Correct!** ${result.winner.displayName} earned **$${result.points}**!`;

      return {
        type: "correct",
        content:
          `${correctMessage}\n` +
          `**Answer:** ${result.answer}\n` +
          `**New Score:** $${result.newScore}\n\n` +
          `<@${result.winner.userId}>, pick the next question!`,
        embed: this.createScoreEmbed(result.winner),
      };
    } else {
      // Wrong answer
      if (result.openToAll) {
        // Current player got it wrong, now everyone can answer
        const allPlayers = Array.from(discordBot.players.values())
          .filter((p) => p.userId !== result.currentPlayer.userId)
          .map((p) => `<@${p.userId}>`)
          .join(" ");

        return {
          type: "incorrect",
          content:
            `❌ **${result.currentPlayer.displayName}** got it wrong!\n` +
            `**Their answer:** ${result.yourAnswer}\n\n` +
            `🚨 **OPEN TO ALL PLAYERS!** ${allPlayers}\n` +
            `First correct answer wins the points!`,
        };
      } else {
        // Someone else got it wrong during open answering
        return {
          type: "incorrect",
          content: `❌ Sorry ${username}, that's not correct. Keep trying!`,
        };
      }
    }
  }

  // Handle single player response
  handleSinglePlayerResponse(result) {
    if (result.gameComplete) {
      // Game finished
      const playerDisplayName = result.player?.displayName || "Player";
      const embed = {
        title: "🏁 Traditional Trivia Complete!",
        description: `**${playerDisplayName}**, here are your final results!`,
        color:
          result.percentage >= 80
            ? 0x10b981
            : result.percentage >= 60
            ? 0xf59e0b
            : 0xef4444,
        fields: [
          {
            name: "📊 Final Score",
            value: `**${result.finalScore}** out of ${result.maxPossibleScore} questions`,
            inline: true,
          },
          {
            name: "📈 Percentage",
            value: `**${result.percentage}%**`,
            inline: true,
          },
          {
            name: "🎯 Performance",
            value:
              result.percentage >= 90
                ? "🏆 EXCELLENT!"
                : result.percentage >= 80
                ? "🥇 GREAT!"
                : result.percentage >= 70
                ? "🥈 GOOD!"
                : result.percentage >= 60
                ? "🥉 FAIR"
                : result.percentage >= 50
                ? "📚 NEEDS STUDY"
                : "💪 KEEP TRYING!",
            inline: true,
          },
        ],
        footer: {
          text: "Thanks for playing Traditional Trivia!",
        },
        timestamp: new Date().toISOString(),
      };

      let answerMessage = "";
      if (result.correct) {
        if (result.fullPoints) {
          answerMessage = `✅ **Question ${result.questionNumber}: CORRECT!** (+${result.points} point)\n**Answer:** ${result.answer}\n\n`;
        } else if (result.halfPoints) {
          answerMessage = `🟡 **Question ${result.questionNumber}: CLOSE!** (+${result.points} point)\n**Your answer:** ${result.userAnswer}\n**Correct answer:** ${result.answer}\n\n`;
        }
      } else {
        answerMessage = `❌ **Question ${result.questionNumber}: WRONG** (+0 points)\n**Your answer:** ${result.userAnswer}\n**Correct answer:** ${result.answer}\n\n`;
      }

      return {
        type: "embed",
        content:
          answerMessage +
          `🏁 **GAME COMPLETE!** Final Score: ${result.totalScore} points`,
        embed,
      };
    } else {
      // Continue to next question - send answer feedback first
      let answerMessage = "";
      if (result.correct) {
        if (result.fullPoints) {
          answerMessage = `✅ **CORRECT!** (+${result.points} point)\n**Answer:** ${result.answer}`;
        } else if (result.halfPoints) {
          answerMessage = `🟡 **CLOSE!** (+${result.points} point)\n**Your answer:** ${result.userAnswer}\n**Correct answer:** ${result.answer}`;
        }
      } else {
        answerMessage = `❌ **WRONG** (+0 points)\n**Your answer:** ${result.userAnswer}\n**Correct answer:** ${result.answer}`;
      }

      // Return answer feedback first, then trigger next question
      return {
        type: "success",
        content: `${answerMessage}\n**Current Score:** ${result.totalScore} points`,
        nextQuestion: result.nextQuestion,
        questionNumber: result.questionNumber,
        totalQuestions: result.totalQuestions,
        player: result.player,
        isSinglePlayer: true,
      };
    }
  }

  // Create a new game and open registration
  async createGame(message) {
    const result = discordBot.createGame(message.channel.id, message.guild?.id);

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    const embed = {
      title: "🎯 Harry Potter Trivia - Registration Open!",
      description: "A new trivia game is being set up. Players can now join!",
      color: 0x7c3aed,
      fields: [
        {
          name: "🎮 How to Join",
          value: "Use `!trivia join` to register for the game!",
          inline: false,
        },
        {
          name: "📝 Game Rules",
          value:
            "• Players take turns answering questions\n" +
            "• If you get it wrong, everyone can answer\n" +
            "• First correct answer wins the points\n" +
            "• Winner picks the next question",
          inline: false,
        },
        {
          name: "⚡ Ready to Start?",
          value: "Once everyone has joined, use `!trivia start` to begin!",
          inline: false,
        },
      ],
      footer: {
        text: "Minimum 2 players required to start",
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "embed",
      content: "🚀 **New Trivia Game Created!**",
      embed,
    };
  }

  // Join the game
  async joinGame(message) {
    const result = discordBot.registerPlayer(
      message.author.id,
      message.author.username,
      message.member?.displayName
    );

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    return {
      type: "success",
      content:
        `✅ **${result.playerName}** joined the game! (${result.playerCount} players registered)\n` +
        `Use \`!trivia players\` to see who's joined.`,
    };
  }

  // Show waiting players
  async showWaitingPlayers(message) {
    const result = discordBot.getRegistrationStatus();

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    const embed = {
      title: "🎯 Players Waiting to Play",
      description: `**${result.playerCount}** players have joined the game`,
      color: 0x3b82f6,
      fields: [
        {
          name: "👥 Registered Players",
          value:
            result.players.length > 0
              ? result.players
                  .map((p, i) => `${i + 1}. ${p.displayName}`)
                  .join("\n")
              : "No players yet - use `!trivia join` to be first!",
          inline: false,
        },
      ],
      footer: {
        text:
          result.playerCount >= 2
            ? "Ready to start! Use !trivia start to begin the game"
            : `Need ${2 - result.playerCount} more player(s) to start`,
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "embed",
      content: "🎮 **Game Registration Status**",
      embed,
    };
  }

  // Start the registered game
  async startGame(message) {
    const result = discordBot.startRegisteredGame();

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    // Multi-player mode only now

    // Multi-player mode
    // Get initial board status
    const status = discordBot.getGameStatus();
    const boardDisplay = this.createBoardDisplay(status.boardStatus);

    const embed = {
      title: "🎯 Harry Potter Trivia Game Started!",
      description: `**${result.playerOrder.length}** players are ready to compete!`,
      color: 0x10b981, // Green color
      fields: [
        {
          name: "🎲 Player Order",
          value: result.playerOrder
            .map(
              (p, i) =>
                `${i + 1}. ${p.displayName}${i === 0 ? " **← FIRST UP!**" : ""}`
            )
            .join("\n"),
          inline: false,
        },
        {
          name: "📋 Game Board",
          value: boardDisplay,
          inline: false,
        },
        {
          name: "🎯 How to Play",
          value:
            "• Current player picks: `!trivia pick [category] [points]`\n" +
            "• If wrong, everyone can answer!\n" +
            "• Winner picks next question\n" +
            "• Example: `!trivia pick 1 3` = Spells & Magic, $300",
          inline: false,
        },
      ],
      footer: {
        text: `${result.firstPlayer.displayName}'s turn to pick a question!`,
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "embed",
      content: `🎮 **Game Started!** <@${result.firstPlayer.userId}>, you're up first!`,
      embed,
    };
  }

  // Show the current board
  async showBoard(message) {
    const status = discordBot.getGameStatus();

    if (status.error) {
      return {
        type: "error",
        content: `❌ ${status.error}`,
      };
    }

    const boardDisplay = this.createBoardDisplay(status.boardStatus);
    const completedCount = status.gameState.selectedQuestions.size;

    const embed = {
      title: "📋 Current Trivia Board",
      description: `**Questions Completed:** ${completedCount}/30`,
      color: 0x7c3aed,
      fields: [
        {
          name: "🎯 Game Board",
          value: boardDisplay,
          inline: false,
        },
        {
          name: "📝 Legend",
          value: "💰 = Available Question | ❌ = Already Answered",
          inline: false,
        },
      ],
      footer: {
        text: "Use !trivia pick [category] [points] to select a question",
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "embed",
      content: "📋 **Current Game Status**",
      embed,
    };
  }

  // Select a question
  async selectQuestion(message, args) {
    // Check if it's the current player's turn
    const currentPlayer = discordBot.getCurrentPlayer();
    if (!currentPlayer || currentPlayer.userId !== message.author.id) {
      return {
        type: "error",
        content: `❌ It's not your turn! <@${currentPlayer?.userId}> should pick the question.`,
      };
    }

    if (args.length < 3) {
      return {
        type: "error",
        content:
          "❌ Usage: `!trivia pick [category 1-6] [points 1-5]`\n" +
          "Example: `!trivia pick 1 3` (Spells & Magic, $300)",
      };
    }

    const categoryIndex = parseInt(args[1]);
    const pointsIndex = parseInt(args[2]);

    if (
      !categoryIndex ||
      !pointsIndex ||
      categoryIndex < 1 ||
      categoryIndex > 6 ||
      pointsIndex < 1 ||
      pointsIndex > 5
    ) {
      return {
        type: "error",
        content:
          "❌ Invalid selection. Category must be 1-6, Points must be 1-5",
      };
    }

    const result = discordBot.getQuestion(categoryIndex, pointsIndex);

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    const questionEmbed = this.createQuestionEmbed(
      result.question,
      currentPlayer
    );

    // Create content with Daily Double announcement if needed
    let content = `🎯 **${result.question.category} - $${
      result.question.originalPoints || result.question.points
    }**`;

    if (result.isDailyDouble) {
      content =
        `🎊 **DAILY DOUBLE!** 🎊\n` +
        `🎯 **${result.question.category} - $${result.question.originalPoints} (Worth $${result.question.points}!)**\n` +
        `<@${currentPlayer.userId}>, this question is worth **DOUBLE POINTS**!`;
    } else {
      content += `\n<@${currentPlayer.userId}>, this is your question!`;
    }

    return {
      type: "question",
      content,
      embed: questionEmbed,
      isDailyDouble: result.isDailyDouble,
    };
  }

  // Show scores/leaderboard
  async showScores(message) {
    const leaderboard = discordBot.getLeaderboard();

    if (leaderboard.length === 0) {
      return {
        type: "info",
        content:
          "📊 No players have joined yet! Answer a question to get on the board.",
      };
    }

    const embed = {
      title: "🏆 Leaderboard",
      color: 0xffd700, // Gold color
      fields: leaderboard.map((player, index) => ({
        name: `${this.getRankEmoji(index)} ${
          player.displayName || player.username
        }`,
        value: `**Score:** $${player.score}\n**Correct:** ${player.correctAnswers}/${player.questionsAnswered}`,
        inline: true,
      })),
      footer: {
        text: `${leaderboard.length} players participating`,
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "embed",
      content: "🏆 **Current Standings**",
      embed,
    };
  }

  // Show help
  async showHelp(message) {
    const embed = {
      title: "❓ Trivia Bot Commands",
      color: 0x3b82f6, // Blue color
      fields: [
        {
          name: "📚 Solo Mode",
          value:
            "`!trivia solo` - Start solo trivia (10 questions, increasing difficulty)",
          inline: false,
        },
        {
          name: "🎮 Multi-Player Setup",
          value:
            "`!trivia create` - Create new game (2+ players)\n" +
            "`!trivia join` - Join the game\n" +
            "`!trivia players` - Show registered players\n" +
            "`!trivia start` - Start the game",
          inline: true,
        },
        {
          name: "🎯 Multi-Player Gameplay",
          value:
            "`!trivia board` - Show current board\n" +
            "`!trivia pick [cat] [pts]` - Select question\n" +
            "`!trivia scores` - Show leaderboard\n" +
            "`!trivia end` - End current game",
          inline: true,
        },
        {
          name: "🎲 Multi-Player Rules",
          value:
            "• Players take turns picking questions\n" +
            "• If you get it wrong, everyone can answer\n" +
            "• First correct answer wins the points\n" +
            "• Winner picks the next question",
          inline: false,
        },
        {
          name: "📚 Solo Rules",
          value:
            "• 10 questions with increasing difficulty\n" +
            "• One guess per question only\n" +
            "• Full points for exact answers\n" +
            "• Half points for close answers",
          inline: false,
        },
        {
          name: "🎯 How to Answer",
          value:
            "When a question appears, simply type your answer in chat!\n" +
            "No special command needed - just your answer.",
          inline: false,
        },
        {
          name: "📚 Categories",
          value: this.categories
            .map((cat, i) => `**${i + 1}.** ${cat}`)
            .join("\n"),
          inline: false,
        },
      ],
      footer: {
        text: "Solo: !trivia solo | Multi: !trivia create → !trivia join → !trivia start",
      },
    };

    return {
      type: "embed",
      embed,
    };
  }

  // End game
  async endGame(message) {
    const userId = message.author.id;

    // Check if user has an active solo session
    const userSession = discordBot.getUserSession(userId);
    if (userSession) {
      const result = discordBot.endUserSession(userId);
      if (result.nextUser) {
        // Notify next user in queue
        // Note: This would require access to the Discord client to send a DM
        console.log(`Next user ${result.nextUser} can now start trivia`);
      }

      return {
        type: "success",
        content: `✅ Your solo trivia session has been ended. Thanks for playing!`,
      };
    }

    // Fall back to ending multiplayer game
    const result = discordBot.endGame();

    if (result.error) {
      return {
        type: "error",
        content: `❌ ${result.error}`,
      };
    }

    const embed = {
      title: "🏁 Game Ended!",
      color: 0xef4444, // Red color
      fields: result.finalScores.slice(0, 3).map((player, index) => ({
        name: `${this.getRankEmoji(index)} ${
          player.displayName || player.username
        }`,
        value: `**Final Score:** $${player.score}\n**Accuracy:** ${Math.round(
          (player.correctAnswers / player.questionsAnswered) * 100
        )}%`,
        inline: true,
      })),
      footer: {
        text: "Thanks for playing!",
      },
      timestamp: new Date().toISOString(),
    };

    return {
      type: "embed",
      content: "🎮 **Game Over!**",
      embed,
    };
  }

  // Reset game
  async resetGame(message) {
    discordBot.resetGame();

    return {
      type: "success",
      content: "🔄 **Game Reset!** Use `!trivia start` to begin a new game.",
    };
  }

  // Helper: Create compact board display for Discord
  createBoardDisplay(boardStatus) {
    let board = "```\n";

    // Compact header with shortened category names
    board += "    1     2     3     4     5     6\n";
    board += "SPELL HOGWA CREAT POTIO DEFEN WIZAR\n";
    board += "------------------------------------\n";

    // Add each dollar amount row
    const dollarAmounts = [100, 200, 300, 400, 500];
    const dailyDouble = discordBot.gameState?.dailyDouble;

    dollarAmounts.forEach((amount, pointIndex) => {
      const row = boardStatus.map((categoryRow, catIndex) => {
        const question = categoryRow.questions.find((q) => q.points === amount);

        if (question && question.completed) {
          return " ❌ ";
        } else {
          return `$${amount}`; // Don't show Daily Double location
        }
      });
      board += row.map((cell) => cell.padEnd(5)).join(" ") + "\n";
    });

    board += "```\n\n";

    // Add category legend below the board
    board += "**Categories:**\n";
    boardStatus.forEach((cat, index) => {
      board += `**${index + 1}.** ${cat.category}\n`;
    });

    // Don't show Daily Double legend - keep it hidden!

    return board;
  }

  // Helper: Create board embed (legacy format - keeping for compatibility)
  createBoardEmbed(boardStatus) {
    const embed = {
      title: "📋 Trivia Board",
      color: 0x7c3aed,
      fields: [],
      footer: {
        text: "Use !trivia pick [category] [points] to select a question",
      },
    };

    boardStatus.forEach((categoryRow, catIndex) => {
      const statusRow = categoryRow.questions
        .map((q) => {
          if (q.completed) return "❌";
          if (!q.available) return "❌";
          return `$${q.points}`;
        })
        .join(" | ");

      embed.fields.push({
        name: `${catIndex + 1}. ${categoryRow.category}`,
        value: statusRow,
        inline: false,
      });
    });

    return embed;
  }

  // Helper: Create question embed
  createQuestionEmbed(question, currentPlayer) {
    const isDailyDouble = question.isDailyDouble;

    return {
      title: isDailyDouble
        ? `🎊 ${question.category} - DAILY DOUBLE! 🎊`
        : `💡 ${question.category}`,
      description: isDailyDouble
        ? `**$${question.originalPoints} → $${question.points} (DOUBLE POINTS!)**\n\n${question.question}`
        : `**$${question.points}**\n\n${question.question}`,
      color: isDailyDouble ? 0xffd700 : 0x10b981, // Gold for Daily Double, Green for normal
      footer: {
        text: currentPlayer
          ? isDailyDouble
            ? `${currentPlayer.displayName}, this Daily Double is worth double points!`
            : `${currentPlayer.displayName}, type your answer in chat!`
          : "Type your answer in chat!",
      },
      timestamp: new Date().toISOString(),
    };
  }

  // Helper: Create score embed
  createScoreEmbed(player) {
    return {
      title: `🎉 ${player.displayName || player.username}`,
      description: `**Current Score:** $${player.score}`,
      color: 0x22c55e,
      fields: [
        {
          name: "Stats",
          value: `**Correct:** ${player.correctAnswers}/${
            player.questionsAnswered
          }\n**Accuracy:** ${Math.round(
            (player.correctAnswers / player.questionsAnswered) * 100
          )}%`,
          inline: true,
        },
      ],
      thumbnail: {
        url: "https://cdn.discordapp.com/emojis/emoji_id.png", // Optional: Add celebration emoji
      },
    };
  }

  // Helper: Get rank emoji
  getRankEmoji(index) {
    const emojis = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
    return emojis[index] || "📍";
  }
}

export const discordBotCommands = new DiscordBotCommands();
