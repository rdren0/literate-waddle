import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Helper function to load trivia data
function loadTriviaData() {
  try {
    const triviaDataPath = join(__dirname, '../data/data.json');
    const triviaDataRaw = readFileSync(triviaDataPath, 'utf8');
    const rawData = JSON.parse(triviaDataRaw);

    console.log(`Loaded questions from data.json`);

    // Map the 6 categories from data.json to the expected category names
    const categoryMapping = {
      'category_1': 'SPELLS & MAGIC',
      'category_2': 'HOGWARTS HISTORY',
      'category_3': 'MAGICAL CREATURES',
      'category_4': 'POTIONS',
      'category_5': 'DEFENSE AGAINST DARK ARTS',
      'category_6': 'WIZARDING WORLD'
    };

    // Convert to the expected format for the bot
    const formattedData = {
      'SPELLS & MAGIC': {},
      'HOGWARTS HISTORY': {},
      'MAGICAL CREATURES': {},
      'POTIONS': {},
      'DEFENSE AGAINST DARK ARTS': {},
      'WIZARDING WORLD': {}
    };

    const pointValues = [100, 200, 300, 400, 500];

    // Initialize all categories with empty arrays for each point value
    Object.keys(formattedData).forEach(category => {
      pointValues.forEach(points => {
        formattedData[category][points] = [];
      });
    });

    // Distribute questions from data.json across point values
    Object.keys(categoryMapping).forEach(dataCategory => {
      const mappedCategory = categoryMapping[dataCategory];
      const questions = rawData[dataCategory] || [];

      console.log(`Processing ${dataCategory} -> ${mappedCategory}: ${questions.length} questions`);

      // Distribute questions across the 5 difficulty levels
      const questionsPerLevel = Math.ceil(questions.length / pointValues.length);

      pointValues.forEach((points, levelIndex) => {
        const startIndex = levelIndex * questionsPerLevel;
        const endIndex = Math.min(startIndex + questionsPerLevel, questions.length);
        const levelQuestions = questions.slice(startIndex, endIndex);

        formattedData[mappedCategory][points] = levelQuestions.map(q => ({
          question: q.question,
          answer: q.answer
        }));

        console.log(`${mappedCategory} $${points}: ${levelQuestions.length} questions`);
      });
    });

    console.log(`Distributed questions across ${Object.keys(formattedData).length} categories and ${pointValues.length} difficulty levels`);
    console.log('Sample data structure:', Object.keys(formattedData));
    console.log('SPELLS & MAGIC 100 questions:', formattedData['SPELLS & MAGIC'][100]?.length || 0);
    return formattedData;
  } catch (error) {
    console.error('Error loading trivia data:', error);
    console.error('Stack trace:', error.stack);
    // Fallback to empty data structure
    return {
      'SPELLS & MAGIC': { 100: [], 200: [], 300: [], 400: [], 500: [] },
      'HOGWARTS HISTORY': { 100: [], 200: [], 300: [], 400: [], 500: [] },
      'MAGICAL CREATURES': { 100: [], 200: [], 300: [], 400: [], 500: [] },
      'POTIONS': { 100: [], 200: [], 300: [], 400: [], 500: [] },
      'DEFENSE AGAINST DARK ARTS': { 100: [], 200: [], 300: [], 400: [], 500: [] },
      'WIZARDING WORLD': { 100: [], 200: [], 300: [], 400: [], 500: [] }
    };
  }
}

class DiscordBotService {
  constructor() {
    this.gameState = null;
    this.players = new Map(); // Discord user ID -> player data
    this.registeredPlayers = new Map(); // Players waiting for game to start
    this.playerOrder = []; // Order of players for turns
    this.currentPlayerIndex = 0;
    this.currentQuestion = null;
    this.questionTimeout = null;
    this.waitingForRegistration = false;
    this.categories = [
      'SPELLS & MAGIC',
      'HOGWARTS HISTORY',
      'MAGICAL CREATURES',
      'POTIONS',
      'DEFENSE AGAINST DARK ARTS',
      'WIZARDING WORLD'
    ];
    this.pointValues = [100, 200, 300, 400, 500];

    // Load trivia data
    this.triviaData = loadTriviaData();
    console.log('DiscordBotService initialized with trivia data:', !!this.triviaData);
  }

  // Create a new game and open registration
  createGame(channelId, guildId) {
    if (this.waitingForRegistration || (this.gameState && this.gameState.isActive)) {
      return { error: 'A game is already running or waiting for players!' };
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
      openAnswering: false, // When wrong answer, everyone can answer
      scores: new Map(),
      startTime: null,
      board: this.initializeBoard(),
      registrationOpen: true,
      dailyDouble: null // Will be set when game starts
    };

    return { success: true, gameState: this.gameState };
  }

  // Register a player for the game
  registerPlayer(userId, username, displayName) {
    if (!this.waitingForRegistration) {
      return { error: 'No game is currently accepting registrations. Use `!trivia create` first!' };
    }

    if (this.registeredPlayers.has(userId)) {
      return { error: 'You are already registered for this game!' };
    }

    this.registeredPlayers.set(userId, {
      userId,
      username,
      displayName: displayName || username,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      registrationTime: new Date()
    });

    return {
      success: true,
      playerCount: this.registeredPlayers.size,
      playerName: displayName || username
    };
  }

  // Start solo mode directly (bypasses registration)
  startSoloMode(userId, username, displayName, channelId, guildId) {
    // Clean up any existing state
    this.resetGame();

    // Create player
    this.players = new Map();
    this.players.set(userId, {
      userId,
      username,
      displayName: displayName || username,
      score: 0,
      questionsAnswered: 0,
      correctAnswers: 0
    });

    // Set up solo game state
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
      registrationOpen: false
    };

    // Set first question
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
      totalQuestions: 10
    };
  }

  // Start the actual game with registered players
  startRegisteredGame() {
    if (!this.waitingForRegistration) {
      return { error: 'No game waiting to start. Use `!trivia create` first!' };
    }

    if (this.registeredPlayers.size < 2) {
      return { error: 'Need at least 2 players to start the game! For solo play, use `!trivia solo`.' };
    }

    // Transfer registered players to active players
    this.players = new Map(this.registeredPlayers);

    // Multi-player mode (existing logic)
    // Randomize player order
    this.playerOrder = Array.from(this.players.keys());
    this.shuffleArray(this.playerOrder);
    this.currentPlayerIndex = 0;

    // Select random Daily Double location
    this.gameState.dailyDouble = this.selectDailyDouble();

    // Activate the game
    this.gameState.isActive = true;
    this.gameState.startTime = new Date();
    this.gameState.registrationOpen = false;
    this.waitingForRegistration = false;

    return {
      success: true,
      gameState: this.gameState,
      playerOrder: this.playerOrder.map(id => this.players.get(id)),
      firstPlayer: this.players.get(this.playerOrder[0]),
      dailyDouble: this.gameState.dailyDouble,
      isMultiPlayer: true
    };
  }

  // Generate 10 questions with increasing difficulty for single player
  generateSinglePlayerQuestions() {
    const questions = [];
    const usedQuestions = new Set();

    // Questions 1-2: $100 (Easy)
    // Questions 3-4: $200 (Medium-Easy)
    // Questions 5-6: $300 (Medium)
    // Questions 7-8: $400 (Medium-Hard)
    // Questions 9-10: $500 (Hard)

    const difficultyLevels = [100, 100, 200, 200, 300, 300, 400, 400, 500, 500];

    for (let i = 0; i < 10; i++) {
      const difficulty = difficultyLevels[i];
      const question = this.getRandomQuestionByDifficulty(difficulty, usedQuestions);

      if (question) {
        questions.push({
          ...question,
          questionNumber: i + 1,
          points: difficulty,
          maxPoints: difficulty,
          halfPoints: Math.floor(difficulty / 2)
        });
        usedQuestions.add(`${question.category}-${difficulty}-${question.question}`);
      }
    }

    return questions;
  }

  // Get a random question of specific difficulty, avoiding duplicates
  getRandomQuestionByDifficulty(difficulty, usedQuestions) {
    console.log('Getting question for difficulty:', difficulty);
    console.log('this.triviaData available?', !!this.triviaData);
    console.log('this.triviaData keys:', Object.keys(this.triviaData || {}));

    const availableCategories = [...this.categories];
    this.shuffleArray(availableCategories);

    for (const category of availableCategories) {
      console.log('Checking category:', category);
      const categoryData = this.triviaData[category];
      console.log('Category data exists?', !!categoryData);
      if (categoryData && categoryData[difficulty]) {
        const questions = categoryData[difficulty];
        console.log('Questions at difficulty level:', questions.length);
        const availableQuestions = questions.filter(q =>
          !usedQuestions.has(`${category}-${difficulty}-${q.question}`)
        );

        if (availableQuestions.length > 0) {
          const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
          return {
            ...randomQuestion,
            category,
            difficulty
          };
        }
      }
    }

    return null; // Fallback if no questions available
  }

  // Select a random Daily Double location
  selectDailyDouble() {
    const categoryIndex = Math.floor(Math.random() * this.categories.length);
    const pointIndex = Math.floor(Math.random() * this.pointValues.length);

    return {
      category: this.categories[categoryIndex],
      points: this.pointValues[pointIndex],
      categoryIndex: categoryIndex + 1,
      pointIndex: pointIndex + 1
    };
  }

  // Helper: Shuffle array (Fisher-Yates)
  shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  // Get current player whose turn it is
  getCurrentPlayer() {
    if (!this.gameState || !this.gameState.isActive || this.playerOrder.length === 0) {
      return null;
    }
    return this.players.get(this.playerOrder[this.currentPlayerIndex]);
  }

  // Move to next player's turn
  nextPlayerTurn() {
    this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.playerOrder.length;
    return this.getCurrentPlayer();
  }

  // Initialize the game board
  initializeBoard() {
    const board = {};
    this.categories.forEach(category => {
      board[category] = {};
      this.pointValues.forEach(points => {
        board[category][points] = {
          available: true,
          completed: false
        };
      });
    });
    return board;
  }

  // Get a question for a specific category and difficulty
  getQuestion(categoryIndex, pointsIndex) {
    if (!this.gameState || !this.gameState.isActive) {
      return { error: 'No active game found. Use `!trivia start` to begin!' };
    }

    const category = this.categories[categoryIndex - 1];
    const points = this.pointValues[pointsIndex - 1];

    if (!category || !points) {
      return { error: 'Invalid category or points selection.' };
    }

    // Check if question already used
    const questionKey = `${category}-${points}`;
    if (this.gameState.selectedQuestions.has(questionKey)) {
      return { error: 'This question has already been answered!' };
    }

    // Check if this is the Daily Double
    const isDailyDouble = this.gameState.dailyDouble &&
      this.gameState.dailyDouble.categoryIndex === categoryIndex &&
      this.gameState.dailyDouble.pointIndex === pointsIndex;

    // Get questions for this category and difficulty
    const categoryData = this.triviaData[category];
    if (!categoryData || !categoryData[points]) {
      return { error: 'No questions found for this category and difficulty.' };
    }

    const questions = categoryData[points];
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    // Calculate actual points (double for Daily Double)
    const actualPoints = isDailyDouble ? points * 2 : points;

    // Set current question and start answering period
    this.currentQuestion = {
      ...randomQuestion,
      category,
      points: actualPoints,
      originalPoints: points,
      isDailyDouble,
      questionKey,
      startTime: new Date()
    };

    this.gameState.currentQuestion = this.currentQuestion;
    this.gameState.answering = true;

    return {
      success: true,
      question: this.currentQuestion,
      isDailyDouble
    };
  }

  // Submit an answer (handles both single and multi-player)
  submitAnswer(userId, username, answer) {
    if (!this.gameState || !this.gameState.isActive) {
      return { error: 'No active game found.' };
    }

    if (!this.currentQuestion || !this.gameState.answering) {
      return { error: 'No question is currently being answered.' };
    }

    // Make sure this is a registered player
    if (!this.players.has(userId)) {
      return { error: 'You are not registered for this game!' };
    }

    // Handle single player mode
    if (this.gameState.isSinglePlayer) {
      return this.handleSinglePlayerAnswer(userId, username, answer);
    }

    // Multi-player mode (existing logic)
    const currentPlayer = this.getCurrentPlayer();
    const isCurrentPlayersTurn = currentPlayer && currentPlayer.userId === userId;
    const isOpenAnswering = this.gameState.openAnswering;

    // Check if this player is allowed to answer
    if (!isCurrentPlayersTurn && !isOpenAnswering) {
      return {
        error: `It's ${currentPlayer?.displayName || 'someone else'}'s turn to answer!`,
        notYourTurn: true
      };
    }

    const player = this.players.get(userId);
    player.questionsAnswered++;

    // Check if answer is correct
    const isCorrect = this.checkAnswer(answer, this.currentQuestion.answer);

    if (isCorrect) {
      // Award points
      player.score += this.currentQuestion.points;
      player.correctAnswers++;

      // Mark question as completed
      this.gameState.selectedQuestions.add(this.currentQuestion.questionKey);
      this.gameState.board[this.currentQuestion.category][this.currentQuestion.points].completed = true;
      this.gameState.board[this.currentQuestion.category][this.currentQuestion.points].available = false;

      // End answering period
      this.gameState.answering = false;
      this.gameState.openAnswering = false;
      const completedQuestion = this.currentQuestion;
      this.currentQuestion = null;
      this.gameState.currentQuestion = null;

      // Winner gets to pick next question, so they stay as current player
      if (!isCurrentPlayersTurn) {
        // If someone else answered during open answering, they become current player
        this.currentPlayerIndex = this.playerOrder.indexOf(userId);
      }

      return {
        correct: true,
        points: completedQuestion.points,
        answer: completedQuestion.answer,
        newScore: player.score,
        winner: player,
        wasOpenAnswering: isOpenAnswering
      };
    } else {
      // Wrong answer
      if (isCurrentPlayersTurn && !isOpenAnswering) {
        // Current player got it wrong, open it up to everyone
        this.gameState.openAnswering = true;
        return {
          correct: false,
          yourAnswer: answer,
          openToAll: true,
          currentPlayer: player
        };
      } else {
        // Someone else got it wrong during open answering
        return {
          correct: false,
          yourAnswer: answer,
          wasOpenAnswering: true
        };
      }
    }
  }

  // Handle single player answer with half points for close answers
  handleSinglePlayerAnswer(userId, username, answer) {
    if (this.gameState.hasAnsweredCurrent) {
      return { error: 'You already answered this question!' };
    }

    const player = this.players.get(userId);
    const question = this.currentQuestion;

    // Mark as answered
    this.gameState.hasAnsweredCurrent = true;
    player.questionsAnswered++;

    // Check answer quality
    const exactMatch = this.checkAnswer(answer, question.answer);
    const closeMatch = !exactMatch && this.checkCloseAnswer(answer, question.answer);

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
        fullPoints: true
      };
    } else if (closeMatch) {
      pointsEarned = 1;
      this.gameState.singlePlayerScore += pointsEarned;
      result = {
        correct: true,
        points: pointsEarned,
        answer: question.answer,
        halfPoints: true,
        userAnswer: answer
      };
    } else {
      result = {
        correct: false,
        points: 0,
        answer: question.answer,
        userAnswer: answer
      };
    }

    // Add common fields
    result.questionNumber = this.gameState.currentQuestionNumber;
    result.totalScore = this.gameState.singlePlayerScore;
    result.totalQuestions = this.gameState.totalQuestions;
    result.player = player;

    // Move to next question or end game
    if (this.gameState.currentQuestionNumber >= this.gameState.totalQuestions) {
      // Game over
      result.gameComplete = true;
      result.finalScore = this.gameState.singlePlayerScore;
      result.maxPossibleScore = this.gameState.totalQuestions;
      result.percentage = Math.round((result.finalScore / result.maxPossibleScore) * 100);

      this.gameState.isActive = false;
      this.gameState.answering = false;
      this.currentQuestion = null;
      this.gameState.currentQuestion = null;
    } else {
      // Next question
      this.gameState.currentQuestionNumber++;
      this.currentQuestion = this.gameState.singlePlayerQuestions[this.gameState.currentQuestionNumber - 1];
      this.gameState.currentQuestion = this.currentQuestion;
      this.gameState.hasAnsweredCurrent = false;
      result.nextQuestion = this.currentQuestion;
    }

    return result;
  }

  // Check for close answers that deserve half points
  checkCloseAnswer(userAnswer, correctAnswer) {
    const normalize = (str) => str.toLowerCase().trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');

    const userNormalized = normalize(userAnswer);
    const correctNormalized = normalize(correctAnswer);

    // If user answer is contained in correct answer or vice versa
    if (userNormalized.includes(correctNormalized) || correctNormalized.includes(userNormalized)) {
      return true;
    }

    // Check word overlap for multi-word answers
    const userWords = userNormalized.split(' ').filter(w => w.length > 2);
    const correctWords = correctNormalized.split(' ').filter(w => w.length > 2);

    if (correctWords.length > 1 && userWords.length > 0) {
      const matches = userWords.filter(word =>
        correctWords.some(cWord => cWord.includes(word) || word.includes(cWord))
      ).length;

      // At least 50% word match for half points
      return matches >= Math.ceil(correctWords.length * 0.5);
    }

    return false;
  }

  // Check if answer is correct (flexible matching)
  checkAnswer(userAnswer, correctAnswer) {
    const normalize = (str) => str.toLowerCase().trim()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ');

    const userNormalized = normalize(userAnswer);
    const correctNormalized = normalize(correctAnswer);

    // Exact match
    if (userNormalized === correctNormalized) return true;

    // Check if user answer contains the correct answer
    if (userNormalized.includes(correctNormalized)) return true;

    // Check if correct answer contains the user answer (for short answers)
    if (correctNormalized.includes(userNormalized) && userNormalized.length > 2) return true;

    // Split answers and check individual words for partial matches
    const userWords = userNormalized.split(' ');
    const correctWords = correctNormalized.split(' ');

    // If answers have multiple words, check for significant overlap
    if (correctWords.length > 1) {
      const matches = userWords.filter(word =>
        word.length > 2 && correctWords.some(cWord => cWord.includes(word) || word.includes(cWord))
      ).length;

      return matches >= Math.ceil(correctWords.length * 0.6); // 60% match threshold
    }

    return false;
  }

  // Get current leaderboard
  getLeaderboard() {
    return Array.from(this.players.values())
      .filter(player => player.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  // Get game status for web sync
  getGameStatus() {
    if (!this.gameState) {
      return {
        success: false,
        error: 'No active game found.'
      };
    }

    // For single player mode, return different status
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
          singlePlayerScore: this.gameState.singlePlayerScore
        }
      };
    }

    // Create board status for display (multi-player mode)
    const boardStatus = this.categories.map(category => ({
      category,
      questions: this.pointValues.map(points => ({
        points,
        available: this.gameState.board[category][points].available,
        completed: this.gameState.board[category][points].completed
      }))
    }));

    return {
      success: true,
      gameState: {
        isActive: this.gameState.isActive,
        selectedQuestions: this.gameState.selectedQuestions,
        currentQuestion: this.gameState.currentQuestion,
        answering: this.gameState.answering,
        startTime: this.gameState.startTime
      },
      players: Array.from(this.players.values()),
      boardStatus
    };
  }

  // End the current game
  endGame() {
    if (!this.gameState || !this.gameState.isActive) {
      return { error: 'No active game to end.' };
    }

    const finalScores = this.getLeaderboard();
    this.gameState.isActive = false;
    this.currentQuestion = null;

    return {
      success: true,
      finalScores,
      gameState: this.gameState
    };
  }

  // Get registration status
  getRegistrationStatus() {
    if (!this.waitingForRegistration) {
      return { error: 'No game is currently accepting registrations.' };
    }

    return {
      success: true,
      playerCount: this.registeredPlayers.size,
      players: Array.from(this.registeredPlayers.values())
    };
  }

  // Reset/clear game
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

  // Timeout current question
  timeoutQuestion() {
    if (this.currentQuestion && this.gameState && this.gameState.answering) {
      // Handle single player mode
      if (this.gameState.isSinglePlayer) {
        // For single player, just end the answering period
        this.gameState.answering = false;
        this.gameState.hasAnsweredCurrent = true;
        return;
      }

      // Multi-player mode: Mark question as completed but not awarded
      this.gameState.selectedQuestions.add(this.currentQuestion.questionKey);
      this.gameState.board[this.currentQuestion.category][this.currentQuestion.points].completed = true;
      this.gameState.board[this.currentQuestion.category][this.currentQuestion.points].available = false;

      // End answering period
      this.gameState.answering = false;
      const timedOutQuestion = this.currentQuestion;
      this.currentQuestion = null;
      this.gameState.currentQuestion = null;

      return {
        timeout: true,
        question: timedOutQuestion
      };
    }
    return null;
  }
}

export const discordBot = new DiscordBotService();