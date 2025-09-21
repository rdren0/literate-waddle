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
          key_words: q.key_words || [],
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
    this.activeSessions = new Map();
    this.sessionQueue = [];
    this.maxSessions = 10;
    this.sessionTimeout = 2 * 60 * 60 * 1000;

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

    this.startSessionCleanup();
  }

  startSessionCleanup() {
    setInterval(() => {
      this.cleanupExpiredSessions();
    }, 5 * 60 * 1000);
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [userId, session] of this.activeSessions.entries()) {
      if (now - session.startTime > this.sessionTimeout) {
        console.log(`Cleaning up expired session for user ${userId}`);
        this.activeSessions.delete(userId);
        this.processQueue();
      }
    }
  }

  canStartSession(userId) {
    return (
      this.activeSessions.size < this.maxSessions &&
      !this.activeSessions.has(userId)
    );
  }

  addToQueue(userId) {
    if (!this.sessionQueue.includes(userId)) {
      this.sessionQueue.push(userId);
    }
  }

  processQueue() {
    if (
      this.activeSessions.size < this.maxSessions &&
      this.sessionQueue.length > 0
    ) {
      const nextUserId = this.sessionQueue.shift();
      return nextUserId;
    }
    return null;
  }

  createUserSession(userId, channelId, guildId) {
    if (!this.canStartSession(userId)) {
      if (this.activeSessions.has(userId)) {
        return { error: "You already have an active trivia session!" };
      } else {
        this.addToQueue(userId);
        return {
          error: `All ${
            this.maxSessions
          } trivia slots are full! You've been added to the queue. Position: ${
            this.sessionQueue.indexOf(userId) + 1
          }`,
        };
      }
    }

    const session = {
      userId,
      channelId,
      guildId,
      startTime: Date.now(),
      isActive: false,
      isSinglePlayer: true,
      singlePlayerQuestions: [],
      currentQuestionNumber: 1,
      totalQuestions: 10,
      singlePlayerScore: 0,
      currentQuestion: null,
      answering: false,
      hasAnsweredCurrent: false,
      selectedQuestions: new Set(),
      board: this.createEmptyBoard(),
    };

    this.activeSessions.set(userId, session);
    return { success: true, session };
  }

  getUserSession(userId) {
    return this.activeSessions.get(userId);
  }

  endUserSession(userId) {
    if (this.activeSessions.has(userId)) {
      this.activeSessions.delete(userId);

      const nextUserId = this.processQueue();
      if (nextUserId) {
        return { success: true, nextUser: nextUserId };
      }
      return { success: true };
    }
    return { error: "No active session found" };
  }

  createEmptyBoard() {
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

  startSoloModeForUser(userId, username, displayName) {
    const session = this.getUserSession(userId);
    if (!session) {
      return { error: "No active session found for user" };
    }

    session.singlePlayerQuestions = this.generateSinglePlayerQuestions();
    session.isActive = true;
    session.currentQuestion = session.singlePlayerQuestions[0];
    session.answering = true;

    const player = {
      userId,
      username,
      displayName: displayName || username,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
    };

    // Store player info in session for later use
    session.player = player;

    return {
      success: true,
      session: session,
      player: player,
      question: session.currentQuestion,
      isSinglePlayer: true,
      questionNumber: 1,
      totalQuestions: 10,
    };
  }

  submitUserAnswer(userId, username, answer) {
    const session = this.getUserSession(userId);
    if (!session) {
      return { error: "No active session found for user" };
    }

    if (!session.isActive || !session.answering) {
      return { error: "No question is currently being answered." };
    }

    // Ensure session has player info
    if (!session.player) {
      session.player = {
        userId,
        username,
        displayName: username,
        score: 0,
        questionsAnswered: 0,
        correctAnswers: 0,
      };
    }

    if (session.hasAnsweredCurrent) {
      return { error: "You already answered this question!" };
    }

    const question = session.currentQuestion;
    session.hasAnsweredCurrent = true;

    const exactMatch = this.checkAnswer(
      answer,
      question.answer,
      question.key_words
    );
    const closeMatch =
      !exactMatch &&
      this.checkCloseAnswer(answer, question.answer, question.key_words);

    let pointsEarned = 0;
    let result = null;

    if (exactMatch) {
      pointsEarned = 1;
      session.singlePlayerScore += pointsEarned;
      result = {
        correct: true,
        points: pointsEarned,
        answer: question.answer,
        fullPoints: true,
      };
    } else if (closeMatch) {
      pointsEarned = 1;
      session.singlePlayerScore += pointsEarned;
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

    result.questionNumber = session.currentQuestionNumber;
    result.totalScore = session.singlePlayerScore;
    result.totalQuestions = session.totalQuestions;
    result.isSinglePlayer = true;
    result.player = session.player;

    if (session.currentQuestionNumber >= session.totalQuestions) {
      result.gameComplete = true;
      result.finalScore = session.singlePlayerScore;
      result.maxPossibleScore = session.totalQuestions;
      result.percentage = Math.round((session.singlePlayerScore / session.totalQuestions) * 100);

      // Automatically end the session
      this.endUserSession(userId);
    } else {
      session.currentQuestionNumber++;
      session.currentQuestion =
        session.singlePlayerQuestions[session.currentQuestionNumber - 1];
      session.hasAnsweredCurrent = false;

      result.nextQuestion = session.currentQuestion;
    }

    return result;
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

    // Maintain join order - no shuffling
    this.playerOrder = Array.from(this.players.keys());
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

    const difficultyPool = [100, 100, 200, 200, 300, 300, 400, 400, 500, 500];

    this.shuffleArray(difficultyPool);

    const shuffledCategories = [...this.categories];
    this.shuffleArray(shuffledCategories);

    let questionsFromEachCategory = 0;
    const categoryUsed = new Set();

    for (let i = 0; i < Math.min(10, this.categories.length); i++) {
      const category = shuffledCategories[i % this.categories.length];

      if (categoryUsed.has(category)) continue;

      const difficulty = difficultyPool[i];
      const question = this.getRandomQuestionFromCategory(
        category,
        difficulty,
        usedQuestions
      );

      if (question) {
        questions.push({
          ...question,
          questionNumber: questions.length + 1,
          points: difficulty,
          maxPoints: difficulty,
          halfPoints: Math.floor(difficulty / 2),
        });
        usedQuestions.add(
          `${question.category}-${difficulty}-${question.question}`
        );
        categoryUsed.add(category);
        questionsFromEachCategory++;
      }
    }

    while (questions.length < 10 && questions.length < difficultyPool.length) {
      const difficulty = difficultyPool[questions.length];
      const question = this.getRandomQuestionByDifficulty(
        difficulty,
        usedQuestions
      );

      if (question) {
        questions.push({
          ...question,
          questionNumber: questions.length + 1,
          points: difficulty,
          maxPoints: difficulty,
          halfPoints: Math.floor(difficulty / 2),
        });
        usedQuestions.add(
          `${question.category}-${difficulty}-${question.question}`
        );
      } else {
        console.warn(`Could not find question for difficulty ${difficulty}`);
        break;
      }
    }

    this.shuffleArray(questions);

    questions.forEach((q, index) => {
      q.questionNumber = index + 1;
    });

    console.log(
      `Generated ${questions.length} questions with categories:`,
      questions.map((q) => `${q.category}(${q.points})`)
    );

    return questions;
  }

  getRandomQuestionFromCategory(category, difficulty, usedQuestions) {
    console.log(
      `Getting question from ${category} at difficulty ${difficulty}`
    );

    const categoryData = this.triviaData[category];
    if (!categoryData || !categoryData[difficulty]) {
      console.log(
        `No questions available for ${category} at difficulty ${difficulty}`
      );
      return null;
    }

    const questions = categoryData[difficulty];
    const availableQuestions = questions.filter(
      (q) => !usedQuestions.has(`${category}-${difficulty}-${q.question}`)
    );

    if (availableQuestions.length === 0) {
      console.log(
        `No unused questions available for ${category} at difficulty ${difficulty}`
      );
      return null;
    }

    const randomQuestion =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    return {
      ...randomQuestion,
      category,
      difficulty,
    };
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
    this.gameState.openAnsweringAttempts = 0;
    this.gameState.maxOpenAttempts = 3;
    this.gameState.attemptingPlayers = new Set();

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

    const isCorrect = this.checkAnswer(
      answer,
      this.currentQuestion.answer,
      this.currentQuestion.key_words
    );

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
        // During open answering, always move to next player regardless of who answered correctly
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
      }

      const nextPlayer = this.getCurrentPlayer();

      return {
        correct: true,
        points: completedQuestion.points,
        answer: completedQuestion.answer,
        newScore: player.score,
        winner: player,
        wasOpenAnswering: isOpenAnswering,
        turnAdvanced: !isCurrentPlayersTurn,
        nextPlayer: nextPlayer,
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
        // Open answering mode - track attempts
        this.gameState.openAnsweringAttempts++;
        this.gameState.attemptingPlayers.add(userId);

        if (this.gameState.openAnsweringAttempts >= this.gameState.maxOpenAttempts) {
          // Max attempts reached, move to next player
          this.gameState.answering = false;
          this.gameState.openAnswering = false;
          const completedQuestion = this.currentQuestion;
          this.currentQuestion = null;
          this.gameState.currentQuestion = null;

          // Move to next player
          this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
          const nextPlayer = this.getCurrentPlayer();

          return {
            correct: false,
            yourAnswer: answer,
            wasOpenAnswering: true,
            maxAttemptsReached: true,
            correctAnswer: completedQuestion.answer,
            nextPlayer: nextPlayer,
            attemptsUsed: this.gameState.openAnsweringAttempts,
          };
        }

        return {
          correct: false,
          yourAnswer: answer,
          wasOpenAnswering: true,
          attemptsRemaining: this.gameState.maxOpenAttempts - this.gameState.openAnsweringAttempts,
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

    const exactMatch = this.checkAnswer(
      answer,
      question.answer,
      question.key_words
    );
    const closeMatch =
      !exactMatch &&
      this.checkCloseAnswer(answer, question.answer, question.key_words);

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

  checkCloseAnswer(userAnswer, correctAnswer, keyWords = []) {
    const userNorm = this.normalizeAnswer(userAnswer);
    const correctNorm = this.normalizeAnswer(correctAnswer);

    if (keyWords && keyWords.length > 0) {
      for (const keyword of keyWords) {
        const keywordNorm = this.normalizeAnswer(keyword);

        const maxLength = Math.max(userNorm.length, keywordNorm.length);
        const distance = this.levenshteinDistance(userNorm, keywordNorm);
        const similarity = 1 - distance / maxLength;

        if (similarity >= 0.8) {
          return true;
        }

        const userWords = userNorm.split(" ").filter((w) => w.length > 2);
        const keywordWords = keywordNorm.split(" ").filter((w) => w.length > 2);

        for (const userWord of userWords) {
          for (const keywordWord of keywordWords) {
            if (
              userWord.includes(keywordWord) ||
              keywordWord.includes(userWord)
            ) {
              if (keywordWord.length > 2) {
                return true;
              }
            }
          }
        }
      }
    }

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

  checkAnswer(userAnswer, correctAnswer, keyWords = []) {
    const userNorm = this.normalizeAnswer(userAnswer);
    const correctNorm = this.normalizeAnswer(correctAnswer);

    if (userNorm === correctNorm) return true;

    if (keyWords && keyWords.length > 0) {
      for (const keyword of keyWords) {
        const keywordNorm = this.normalizeAnswer(keyword);
        if (userNorm === keywordNorm) return true;

        if (userNorm.includes(keywordNorm) || keywordNorm.includes(userNorm)) {
          if (keywordNorm.length > 3) {
            return true;
          }
        }
      }
    }

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
