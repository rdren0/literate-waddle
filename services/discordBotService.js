import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function loadTriviaData() {
  try {
    const triviaDataPath = join(__dirname, "../data/data.json");
    const triviaDataRaw = readFileSync(triviaDataPath, "utf8");
    const rawData = JSON.parse(triviaDataRaw);

    console.log(`Loaded questions from data.json`);

    const categoryMapping = {
      category_1: "SPELLS & MAGIC",
      category_2: "HOGWARTS HISTORY",
      category_3: "MAGICAL CREATURES",
      category_4: "POTIONS",
      category_5: "DEFENSE AGAINST DARK ARTS",
      category_6: "WIZARDING WORLD",
    };

    const formattedData = {
      "SPELLS & MAGIC": {},
      "HOGWARTS HISTORY": {},
      "MAGICAL CREATURES": {},
      POTIONS: {},
      "DEFENSE AGAINST DARK ARTS": {},
      "WIZARDING WORLD": {},
    };

    const pointValues = [100, 200, 300, 400, 500];

    Object.keys(formattedData).forEach((category) => {
      pointValues.forEach((points) => {
        formattedData[category][points] = [];
      });
    });

    Object.keys(categoryMapping).forEach((dataCategory) => {
      const mappedCategory = categoryMapping[dataCategory];
      const questions = rawData[dataCategory] || [];

      console.log(
        `Processing ${dataCategory} -> ${mappedCategory}: ${questions.length} questions`
      );

      const questionsPerLevel = Math.ceil(
        questions.length / pointValues.length
      );

      pointValues.forEach((points, levelIndex) => {
        const startIndex = levelIndex * questionsPerLevel;
        const endIndex = Math.min(
          startIndex + questionsPerLevel,
          questions.length
        );
        const levelQuestions = questions.slice(startIndex, endIndex);

        formattedData[mappedCategory][points] = levelQuestions.map((q) => ({
          question: q.question,
          answer: q.answer,
        }));

        console.log(
          `${mappedCategory} $${points}: ${levelQuestions.length} questions`
        );
      });
    });

    console.log(
      `Distributed questions across ${
        Object.keys(formattedData).length
      } categories and ${pointValues.length} difficulty levels`
    );
    console.log("Sample data structure:", Object.keys(formattedData));
    console.log(
      "SPELLS & MAGIC 100 questions:",
      formattedData["SPELLS & MAGIC"][100]?.length || 0
    );
    return formattedData;
  } catch (error) {
    console.error("Error loading trivia data:", error);
    console.error("Stack trace:", error.stack);

    return {
      "SPELLS & MAGIC": { 100: [], 200: [], 300: [], 400: [], 500: [] },
      "HOGWARTS HISTORY": { 100: [], 200: [], 300: [], 400: [], 500: [] },
      "MAGICAL CREATURES": { 100: [], 200: [], 300: [], 400: [], 500: [] },
      POTIONS: { 100: [], 200: [], 300: [], 400: [], 500: [] },
      "DEFENSE AGAINST DARK ARTS": {
        100: [],
        200: [],
        300: [],
        400: [],
        500: [],
      },
      "WIZARDING WORLD": { 100: [], 200: [], 300: [], 400: [], 500: [] },
    };
  }
}

class DiscordBotService {
  constructor() {
    this.gameState = null;
    this.players = new Map();
    this.registeredPlayers = new Map();
    this.playerOrder = [];
    this.currentPlayerIndex = 0;
    this.currentQuestion = null;
    this.questionTimeout = null;
    this.waitingForRegistration = false;
    this.categories = [
      "SPELLS & MAGIC",
      "HOGWARTS HISTORY",
      "MAGICAL CREATURES",
      "POTIONS",
      "DEFENSE AGAINST DARK ARTS",
      "WIZARDING WORLD",
    ];
    this.pointValues = [100, 200, 300, 400, 500];

    this.triviaData = loadTriviaData();
    console.log(
      "DiscordBotService initialized with trivia data:",
      !!this.triviaData
    );
  }

  createGame(channelId, guildId) {
    if (
      this.waitingForRegistration ||
      (this.gameState && this.gameState.isActive)
    ) {
      return { error: "A game is already running or waiting for players!" };
    }

    this.waitingForRegistration = true;
    this.registeredPlayers.clear();
    this.gameState = {
      channelId,
      guildId,
      isActive: false,
      selectedQuestions: new Set(),
      currentQuestion: null,
      answering: false,
      openAnswering: false,
      scores: new Map(),
      startTime: null,
      board: this.initializeBoard(),
      registrationOpen: true,
      dailyDouble: null,
    };

    return { success: true, gameState: this.gameState };
  }

  registerPlayer(userId, username, displayName) {
    if (!this.waitingForRegistration) {
      return {
        error:
          "No game is currently accepting registrations. Use `!trivia create` first!",
      };
    }

    if (this.registeredPlayers.has(userId)) {
      return { error: "You are already registered for this game!" };
    }

    this.registeredPlayers.set(userId, {
      userId,
      username,
      displayName: displayName || username,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      registrationTime: new Date(),
    });

    return {
      success: true,
      playerCount: this.registeredPlayers.size,
      playerName: displayName || username,
    };
  }

  startSoloMode(userId, username, displayName, channelId, guildId) {
    this.resetGame();

    this.players = new Map();
    this.players.set(userId, {
      userId,
      username,
      displayName: displayName || username,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
    });

    this.gameState = {
      channelId,
      guildId,
      isActive: true,
      startTime: new Date(),
      isSinglePlayer: true,
      currentQuestionNumber: 1,
      totalQuestions: 10,
      singlePlayerQuestions: this.generateSinglePlayerQuestions(),
      singlePlayerScore: 0,
      hasAnsweredCurrent: false,
      registrationOpen: false,
    };

    this.currentQuestion = this.gameState.singlePlayerQuestions[0];
    this.gameState.currentQuestion = this.currentQuestion;
    this.gameState.answering = true;

    const player = this.players.get(userId);

    return {
      success: true,
      gameState: this.gameState,
      player: player,
      question: this.currentQuestion,
      isSinglePlayer: true,
      questionNumber: 1,
      totalQuestions: 10,
    };
  }

  startRegisteredGame() {
    if (!this.waitingForRegistration) {
      return { error: "No game waiting to start. Use `!trivia create` first!" };
    }

    if (this.registeredPlayers.size < 2) {
      return {
        error:
          "Need at least 2 players to start the game! For solo play, use `!trivia solo`.",
      };
    }

    this.players = new Map(this.registeredPlayers);

    this.playerOrder = Array.from(this.players.keys());
    this.shuffleArray(this.playerOrder);
    this.currentPlayerIndex = 0;

    this.gameState.dailyDouble = this.selectDailyDouble();

    this.gameState.isActive = true;
    this.gameState.startTime = new Date();
    this.gameState.registrationOpen = false;
    this.waitingForRegistration = false;

    return {
      success: true,
      gameState: this.gameState,
      playerOrder: this.playerOrder.map((id) => this.players.get(id)),
      firstPlayer: this.players.get(this.playerOrder[0]),
      dailyDouble: this.gameState.dailyDouble,
      isMultiPlayer: true,
    };
  }

  generateSinglePlayerQuestions() {
    const questions = [];
    const usedQuestions = new Set();

    const difficultyLevels = [100, 100, 200, 200, 300, 300, 400, 400, 500, 500];

    for (let i = 0; i < 10; i++) {
      const difficulty = difficultyLevels[i];
      const question = this.getRandomQuestionByDifficulty(
        difficulty,
        usedQuestions
      );

      if (question) {
        questions.push({
          ...question,
          questionNumber: i + 1,
          points: difficulty,
          maxPoints: difficulty,
          halfPoints: Math.floor(difficulty / 2),
        });
        usedQuestions.add(
          `${question.category}-${difficulty}-${question.question}`
        );
      }
    }

    return questions;
  }

  getRandomQuestionByDifficulty(difficulty, usedQuestions) {
    console.log("Getting question for difficulty:", difficulty);
    console.log("this.triviaData available?", !!this.triviaData);
    console.log("this.triviaData keys:", Object.keys(this.triviaData || {}));

    const availableCategories = [...this.categories];
    this.shuffleArray(availableCategories);

    for (const category of availableCategories) {
      console.log("Checking category:", category);
      const categoryData = this.triviaData[category];
      console.log("Category data exists?", !!categoryData);
      if (categoryData && categoryData[difficulty]) {
        const questions = categoryData[difficulty];
        console.log("Questions at difficulty level:", questions.length);
        const availableQuestions = questions.filter(
          (q) => !usedQuestions.has(`${category}-${difficulty}-${q.question}`)
        );

        if (availableQuestions.length > 0) {
          const randomQuestion =
            availableQuestions[
              Math.floor(Math.random() * availableQuestions.length)
            ];
          return {
            ...randomQuestion,
            category,
            difficulty,
          };
        }
      }
    }

    return null;
  }

  selectDailyDouble() {
    const categoryIndex = Math.floor(Math.random() * this.categories.length);
    const pointIndex = Math.floor(Math.random() * this.pointValues.length);

    return {
      category: this.categories[categoryIndex],
      points: this.pointValues[pointIndex],
      categoryIndex: categoryIndex + 1,
      pointIndex: pointIndex + 1,
    };
  }

  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  getCurrentPlayer() {
    if (
      !this.gameState ||
      !this.gameState.isActive ||
      this.playerOrder.length === 0
    ) {
      return null;
    }
    return this.players.get(this.playerOrder[this.currentPlayerIndex]);
  }

  nextPlayerTurn() {
    this.currentPlayerIndex =
      (this.currentPlayerIndex + 1) % this.playerOrder.length;
    return this.getCurrentPlayer();
  }

  initializeBoard() {
    const board = {};
    this.categories.forEach((category) => {
      board[category] = {};
      this.pointValues.forEach((points) => {
        board[category][points] = {
          available: true,
          completed: false,
        };
      });
    });
    return board;
  }

  getQuestion(categoryIndex, pointsIndex) {
    if (!this.gameState || !this.gameState.isActive) {
      return { error: "No active game found. Use `!trivia start` to begin!" };
    }

    const category = this.categories[categoryIndex - 1];
    const points = this.pointValues[pointsIndex - 1];

    if (!category || !points) {
      return { error: "Invalid category or points selection." };
    }

    const questionKey = `${category}-${points}`;
    if (this.gameState.selectedQuestions.has(questionKey)) {
      return { error: "This question has already been answered!" };
    }

    const isDailyDouble =
      this.gameState.dailyDouble &&
      this.gameState.dailyDouble.categoryIndex === categoryIndex &&
      this.gameState.dailyDouble.pointIndex === pointsIndex;

    const categoryData = this.triviaData[category];
    if (!categoryData || !categoryData[points]) {
      return { error: "No questions found for this category and difficulty." };
    }

    const questions = categoryData[points];
    const randomQuestion =
      questions[Math.floor(Math.random() * questions.length)];

    const actualPoints = isDailyDouble ? points * 2 : points;

    this.currentQuestion = {
      ...randomQuestion,
      category,
      points: actualPoints,
      originalPoints: points,
      isDailyDouble,
      questionKey,
      startTime: new Date(),
    };

    this.gameState.currentQuestion = this.currentQuestion;
    this.gameState.answering = true;

    return {
      success: true,
      question: this.currentQuestion,
      isDailyDouble,
    };
  }

  submitAnswer(userId, username, answer) {
    if (!this.gameState || !this.gameState.isActive) {
      return { error: "No active game found." };
    }

    if (!this.currentQuestion || !this.gameState.answering) {
      return { error: "No question is currently being answered." };
    }

    if (!this.players.has(userId)) {
      return { error: "You are not registered for this game!" };
    }

    if (this.gameState.isSinglePlayer) {
      return this.handleSinglePlayerAnswer(userId, username, answer);
    }

    const currentPlayer = this.getCurrentPlayer();
    const isCurrentPlayersTurn =
      currentPlayer && currentPlayer.userId === userId;
    const isOpenAnswering = this.gameState.openAnswering;

    if (!isCurrentPlayersTurn && !isOpenAnswering) {
      return {
        error: `It's ${
          currentPlayer?.displayName || "someone else"
        }'s turn to answer!`,
        notYourTurn: true,
      };
    }

    const player = this.players.get(userId);
    player.questionsAnswered++;

    const isCorrect = this.checkAnswer(answer, this.currentQuestion.answer);

    if (isCorrect) {
      player.score += this.currentQuestion.points;
      player.correctAnswers++;

      this.gameState.selectedQuestions.add(this.currentQuestion.questionKey);
      this.gameState.board[this.currentQuestion.category][
        this.currentQuestion.points
      ].completed = true;
      this.gameState.board[this.currentQuestion.category][
        this.currentQuestion.points
      ].available = false;

      this.gameState.answering = false;
      this.gameState.openAnswering = false;
      const completedQuestion = this.currentQuestion;
      this.currentQuestion = null;
      this.gameState.currentQuestion = null;

      if (!isCurrentPlayersTurn) {
        this.currentPlayerIndex = this.playerOrder.indexOf(userId);
      }

      return {
        correct: true,
        points: completedQuestion.points,
        answer: completedQuestion.answer,
        newScore: player.score,
        winner: player,
        wasOpenAnswering: isOpenAnswering,
      };
    } else {
      if (isCurrentPlayersTurn && !isOpenAnswering) {
        this.gameState.openAnswering = true;
        return {
          correct: false,
          yourAnswer: answer,
          openToAll: true,
          currentPlayer: player,
        };
      } else {
        return {
          correct: false,
          yourAnswer: answer,
          wasOpenAnswering: true,
        };
      }
    }
  }

  handleSinglePlayerAnswer(userId, username, answer) {
    if (this.gameState.hasAnsweredCurrent) {
      return { error: "You already answered this question!" };
    }

    const player = this.players.get(userId);
    const question = this.currentQuestion;

    this.gameState.hasAnsweredCurrent = true;
    player.questionsAnswered++;

    const exactMatch = this.checkAnswer(answer, question.answer);
    const closeMatch =
      !exactMatch && this.checkCloseAnswer(answer, question.answer);

    let pointsEarned = 0;
    let result = null;

    if (exactMatch) {
      pointsEarned = 1;
      player.correctAnswers++;
      this.gameState.singlePlayerScore += pointsEarned;
      result = {
        correct: true,
        points: pointsEarned,
        answer: question.answer,
        fullPoints: true,
      };
    } else if (closeMatch) {
      pointsEarned = 1;
      this.gameState.singlePlayerScore += pointsEarned;
      result = {
        correct: true,
        points: pointsEarned,
        answer: question.answer,
        halfPoints: true,
        userAnswer: answer,
      };
    } else {
      result = {
        correct: false,
        points: 0,
        answer: question.answer,
        userAnswer: answer,
      };
    }

    result.questionNumber = this.gameState.currentQuestionNumber;
    result.totalScore = this.gameState.singlePlayerScore;
    result.totalQuestions = this.gameState.totalQuestions;
    result.player = player;

    if (this.gameState.currentQuestionNumber >= this.gameState.totalQuestions) {
      result.gameComplete = true;
      result.finalScore = this.gameState.singlePlayerScore;
      result.maxPossibleScore = this.gameState.totalQuestions;
      result.percentage = Math.round(
        (result.finalScore / result.maxPossibleScore) * 100
      );

      this.gameState.isActive = false;
      this.gameState.answering = false;
      this.currentQuestion = null;
      this.gameState.currentQuestion = null;
    } else {
      this.gameState.currentQuestionNumber++;
      this.currentQuestion =
        this.gameState.singlePlayerQuestions[
          this.gameState.currentQuestionNumber - 1
        ];
      this.gameState.currentQuestion = this.currentQuestion;
      this.gameState.hasAnsweredCurrent = false;
      result.nextQuestion = this.currentQuestion;
    }

    return result;
  }

  normalizeAnswer(str) {
    return str
      .toLowerCase()
      .trim()

      .replace(/^(the|a|an)\s+/i, "")
      .replace(/\s+(the|a|an)\s+/gi, " ")

      .replace(/[^\w\s']/g, "")

      .replace(/\s+/g, " ")
      .trim();
  }

  levenshteinDistance(str1, str2) {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + substitutionCost
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  checkAlternativeFormats(userAnswer, correctAnswer) {
    const userNorm = this.normalizeAnswer(userAnswer);
    const correctNorm = this.normalizeAnswer(correctAnswer);

    const variations = {
      "tom riddle": ["voldemort", "tom marvolo riddle", "lord voldemort"],
      voldemort: ["tom riddle", "tom marvolo riddle", "lord voldemort"],
      "lord voldemort": ["voldemort", "tom riddle", "tom marvolo riddle"],
      "hermione granger": ["hermione"],
      "harry potter": ["harry"],
      "ron weasley": ["ron"],
      "professor snape": ["snape", "severus snape"],
      "professor dumbledore": ["dumbledore", "albus dumbledore"],
      "professor mcgonagall": ["mcgonagall", "minerva mcgonagall"],

      "expecto patronum": ["patronus charm", "patronus"],
      "avada kedavra": ["killing curse", "the killing curse"],
      "wingardium leviosa": ["levitation charm"],
      stupefy: ["stunning spell", "stunning charm"],
      expelliarmus: ["disarming spell", "disarming charm"],

      hogwarts: [
        "hogwarts school",
        "hogwarts school of witchcraft and wizardry",
      ],
      "diagon alley": ["diagon ally"],
      hogsmeade: ["hogsmeade village"],
      "the three broomsticks": ["three broomsticks"],
      "grimmauld place": ["12 grimmauld place", "number 12 grimmauld place"],

      "invisibility cloak": ["cloak of invisibility"],
      "elder wand": ["the elder wand"],
      "philosophers stone": ["sorcerers stone"],
      "sorcerers stone": ["philosophers stone"],
    };

    if (variations[correctNorm]) {
      return variations[correctNorm].some(
        (variant) => this.normalizeAnswer(variant) === userNorm
      );
    }

    if (variations[userNorm]) {
      return variations[userNorm].some(
        (variant) => this.normalizeAnswer(variant) === correctNorm
      );
    }

    return false;
  }

  checkCloseAnswer(userAnswer, correctAnswer) {
    const userNorm = this.normalizeAnswer(userAnswer);
    const correctNorm = this.normalizeAnswer(correctAnswer);

    if (this.checkAlternativeFormats(userAnswer, correctAnswer)) {
      return true;
    }

    const maxLength = Math.max(userNorm.length, correctNorm.length);
    const distance = this.levenshteinDistance(userNorm, correctNorm);
    const similarity = 1 - distance / maxLength;

    if (similarity >= 0.7) {
      return true;
    }

    const userWords = userNorm.split(" ").filter((w) => w.length > 2);
    const correctWords = correctNorm.split(" ").filter((w) => w.length > 2);

    if (correctWords.length > 1 && userWords.length > 0) {
      let totalMatches = 0;

      for (const userWord of userWords) {
        for (const correctWord of correctWords) {
          if (userWord === correctWord) {
            totalMatches += 1;
          } else {
            const wordSimilarity =
              1 -
              this.levenshteinDistance(userWord, correctWord) /
                Math.max(userWord.length, correctWord.length);
            if (wordSimilarity >= 0.8) {
              totalMatches += wordSimilarity;
            }
          }
        }
      }

      return totalMatches >= correctWords.length * 0.6;
    }

    if (correctWords.length === 1 && userWords.length > 0) {
      const correctWord = correctWords[0];
      return userWords.some(
        (word) =>
          word.includes(correctWord) ||
          correctWord.includes(word) ||
          this.levenshteinDistance(word, correctWord) <= 2
      );
    }

    return false;
  }

  checkAnswer(userAnswer, correctAnswer) {
    const userNorm = this.normalizeAnswer(userAnswer);
    const correctNorm = this.normalizeAnswer(correctAnswer);

    if (userNorm === correctNorm) return true;

    if (this.checkAlternativeFormats(userAnswer, correctAnswer)) {
      return true;
    }

    const maxLength = Math.max(userNorm.length, correctNorm.length);
    const distance = this.levenshteinDistance(userNorm, correctNorm);
    const similarity = 1 - distance / maxLength;

    if (similarity >= 0.9) {
      return true;
    }

    if (
      userNorm.includes(correctNorm) ||
      (correctNorm.includes(userNorm) && userNorm.length > 3)
    ) {
      return true;
    }

    const userWords = userNorm.split(" ").filter((w) => w.length > 2);
    const correctWords = correctNorm.split(" ").filter((w) => w.length > 2);

    if (correctWords.length > 1) {
      let exactMatches = 0;

      for (const correctWord of correctWords) {
        if (
          userWords.some(
            (userWord) =>
              userWord === correctWord ||
              (userWord.includes(correctWord) && correctWord.length > 3) ||
              (correctWord.includes(userWord) && userWord.length > 3)
          )
        ) {
          exactMatches++;
        }
      }

      return exactMatches >= Math.ceil(correctWords.length * 0.8);
    }

    return false;
  }

  getLeaderboard() {
    return Array.from(this.players.values())
      .filter((player) => player.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  getGameStatus() {
    if (!this.gameState) {
      return {
        success: false,
        error: "No active game found.",
      };
    }

    if (this.gameState.isSinglePlayer) {
      return {
        success: true,
        gameState: {
          isActive: this.gameState.isActive,
          isSinglePlayer: true,
          currentQuestion: this.gameState.currentQuestion,
          answering: this.gameState.answering,
          currentQuestionNumber: this.gameState.currentQuestionNumber,
          totalQuestions: this.gameState.totalQuestions,
          singlePlayerScore: this.gameState.singlePlayerScore,
        },
      };
    }

    const boardStatus = this.categories.map((category) => ({
      category,
      questions: this.pointValues.map((points) => ({
        points,
        available: this.gameState.board[category][points].available,
        completed: this.gameState.board[category][points].completed,
      })),
    }));

    return {
      success: true,
      gameState: {
        isActive: this.gameState.isActive,
        selectedQuestions: this.gameState.selectedQuestions,
        currentQuestion: this.gameState.currentQuestion,
        answering: this.gameState.answering,
        startTime: this.gameState.startTime,
      },
      players: Array.from(this.players.values()),
      boardStatus,
    };
  }

  endGame() {
    if (!this.gameState || !this.gameState.isActive) {
      return { error: "No active game to end." };
    }

    const finalScores = this.getLeaderboard();
    this.gameState.isActive = false;
    this.currentQuestion = null;

    return {
      success: true,
      finalScores,
      gameState: this.gameState,
    };
  }

  getRegistrationStatus() {
    if (!this.waitingForRegistration) {
      return { error: "No game is currently accepting registrations." };
    }

    return {
      success: true,
      playerCount: this.registeredPlayers.size,
      players: Array.from(this.registeredPlayers.values()),
    };
  }

  resetGame() {
    this.gameState = null;
    this.players.clear();
    this.registeredPlayers.clear();
    this.playerOrder = [];
    this.currentPlayerIndex = 0;
    this.currentQuestion = null;
    this.waitingForRegistration = false;
    if (this.questionTimeout) {
      clearTimeout(this.questionTimeout);
      this.questionTimeout = null;
    }
  }

  timeoutQuestion() {
    if (this.currentQuestion && this.gameState && this.gameState.answering) {
      if (this.gameState.isSinglePlayer) {
        this.gameState.answering = false;
        this.gameState.hasAnsweredCurrent = true;
        return;
      }

      this.gameState.selectedQuestions.add(this.currentQuestion.questionKey);
      this.gameState.board[this.currentQuestion.category][
        this.currentQuestion.points
      ].completed = true;
      this.gameState.board[this.currentQuestion.category][
        this.currentQuestion.points
      ].available = false;

      this.gameState.answering = false;
      const timedOutQuestion = this.currentQuestion;
      this.currentQuestion = null;
      this.gameState.currentQuestion = null;

      return {
        timeout: true,
        question: timedOutQuestion,
      };
    }
    return null;
  }
}

export const discordBot = new DiscordBotService();
