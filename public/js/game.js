const gameStates = {
  MATCHMAKING: 0,
  RESOLVING: 1,
  PLAYER_TURN: 2,
  OPPONENT_TURN: 3,
  GAME_OVER: 4,
}

// TODO: change this
let currentState = gameStates.MATCHMAKING;
let opponentPlayed = false;

let selectedCard;
let playerScore = 0;
let opponentScore = 0;

const messageElem = document.getElementById('messages');
const turnElem = document.getElementById('currentTurn');

const socket = io.connect(window.location.origin);

function initGame() {
  initDeck();
  initOppDeck();
}

function initDeck() {
  const deckElem = document.getElementById('deck');

  for (let i = 1; i <= 8; i++) {
    const cardElem = document.createElement('img');
    cardElem.src = `assets/card${i}.png`;
    cardElem.id = `card_${i}`;
    cardElem.classList.add('playerCard', 'inDeck');

    cardElem.onmousedown = () => cardClick(cardElem, i);

    deckElem.appendChild(cardElem);
  }
}

function tearDownGame() {
  document.getElementById('playerScore').innerText = `you: 0`;
  document.getElementById('opponentScore').innerText = `them: 0`;

  playerScore = 0;
  opponentScore = 0;

  messageElem.innerText = 'Welcome to the game';

  const playerCards = document.getElementsByClassName('playerCard');

  while (playerCards[0]) {
    playerCards[0].remove();
  }

  const oppCards = document.getElementsByClassName('oppCard');

  while (oppCards[0]) {
    oppCards[0].remove();
  }

  setCurrentState(gameStates.MATCHMAKING);
}

function cardClick(cardElem, val) {
  if (currentState === gameStates.PLAYER_TURN) {
    selectedCard = cardElem;
    socket.emit('playCard', val);
    setCurrentState(gameStates.RESOLVING);
    // the actual animation / turn resolution happens in the "turnUpdate" socket.io event
  };
}

function initOppDeck() {
  const oppDeckEvenElem = document.getElementById('opponentEvenBox');
  const oppDeckOddElem = document.getElementById('opponentOddBox');

  for (var _ = 0; _ < 4; _++) {
    const evenCardElem = document.createElement('img');
    evenCardElem.src = 'assets/blank_card_even.png';
    evenCardElem.classList.add('oppCard', 'inOppDeck', 'even');
    oppDeckEvenElem.appendChild(evenCardElem);
  }

  for (var _ = 0; _ < 4; _++) {
    const oddCardElem = document.createElement('img');
    oddCardElem.src = 'assets/blank_card_odd.png';
    oddCardElem.classList.add('oppCard', 'inOppDeck', 'odd');
    oppDeckOddElem.appendChild(oddCardElem);
  }
}

socket.on('connect', () => {
  const loc = window.location.href.split('/').pop();
  socket.emit('joinGame', loc);
});

socket.on('foundGame', data => {
  initGame();

  const nextState = data.myTurn === 0 ? gameStates.PLAYER_TURN : gameStates.OPPONENT_TURN;
  setCurrentState(nextState);

});

socket.on('opponentDisconnect', () => tearDownGame());

socket.on('disconnect', () => tearDownGame());

socket.on('initVidChat', () => initVidChat());

socket.on('sessionFull', () => {
  const sessionName = window.location.href.split('/').pop();
  messageElem.innerText = `Game session with name "${sessionName}" is currently full - please try again later!`;
});

socket.on('turnUpdate', turnResult => {
  // turnResult = {
  //   winner: winner's socket id, or "tie", or null if round not over yet
  //   player: socket id of who played the last turn
  //   isEven: true if the last card played was event, false otherwise
  //   nextTurn: 0 or 1, indicates who plays next
  // }

  let moveAnim;

  if (turnResult.player === socket.id) {
    moveAnim = animatePlayerMove(selectedCard);
    selectedCard = null;
  } else {
    const evenOrOdd = turnResult.isEven ? 'even' : 'odd';
    moveAnim = animateOpponentMove(evenOrOdd);
  }

  Promise.all(moveAnim).then(() => handleTurnResult(turnResult));

});

async function handleTurnResult(turnResult) {
  if (turnResult.winner) {
    let nextState;

    if (turnResult.winner === socket.id) {
      document.getElementById('playerScore').innerText = `you: ${++playerScore}`;
      messageElem.innerText = 'You won the round!';
      nextState = gameStates.PLAYER_TURN;
    } else if (turnResult.winner === 'tie') {
      messageElem.innerText = 'Tie! you played the same card';
      nextState = turnResult.player === socket.id ? gameStates.OPPONENT_TURN : gameStates.PLAYER_TURN;
    } else {
      document.getElementById('opponentScore').innerText = `them: ${++opponentScore}`;
      messageElem.innerText = 'You lost the round!';
      nextState = gameStates.OPPONENT_TURN;
    }
    await sleep(1000);
    const animations = animateClearSpotlight();
    Promise.all(animations)
      .then(() => setCurrentState(nextState))
      .then(gameOverCheck);
  } else {
    const nextGameState = turnResult.player === socket.id ? gameStates.OPPONENT_TURN : gameStates.PLAYER_TURN;
    setCurrentState(nextGameState);
  }
}

function gameOverCheck() {
  if (document.getElementsByClassName('inDeck').length > 0) return;

  setCurrentState(gameStates.GAME_OVER);

  if (playerScore > opponentScore) {
    messageElem.innerText = 'Game over - you win!';
  } else if (playerScore < opponentScore) {
    messageElem.innerText = 'Game over - you lost!';
  } else {
    messageElem.innerText = 'Game over - it was a tie!';
  }
}

function setCurrentState(gameState) {
  if (gameState === gameStates.PLAYER_TURN) {
    turnElem.innerText = 'you';
  } else if (gameState === gameStates.OPPONENT_TURN) {
    turnElem.innerText = 'them';
  } else if (gameState === gameStates.GAME_OVER) {
    turnElem.innerText = 'game over!';
  }

  currentState = gameState;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}