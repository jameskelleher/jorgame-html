const gameStates = {
  MATCHMAKING: 0,
  RESOLVING: 1,
  PLAYER_TURN: 2,
  OPPONENT_TURN: 3,
}

// TODO: change this
// let currentState = gameStates.MATCHMAKING;
let currentState = gameStates.PLAYER_TURN;
let opponentPlayed = false;

let selectedCard;

const messageElem = document.getElementById('messages');

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

function cardClick(cardElem, val) {
  if (currentState === gameStates.PLAYER_TURN) {
    selectedCard = cardElem;
    socket.emit('playCard', val);
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

socket.on('foundGame', data => {
  initGame();

  currentState = data.myTurn === 0 ? gameStates.PLAYER_TURN : gameStates.OPPONENT_TURN;

});

socket.on('opponentDisconnect', () => {

  const playerCards = document.getElementsByClassName('playerCard');

  while (playerCards[0]) {
    playerCards[0].remove();
  }

  const oppCards = document.getElementsByClassName('oppCard');

  while (oppCards[0]) {
    oppCards[0].remove();
  }
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
    await sleep(1000);
    const animations = animateClearSpotlight();
    Promise.all(animations);
  } else {
    currentState = turnResult.player == socket.id ? gameStates.OPPONENT_TURN : gameStates.PLAYER_TURN;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}