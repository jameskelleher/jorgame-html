const gameStates = {
  MATCHMAKING: 0,
  RESOLVING: 1,
  PLAYER_TURN: 2,
  OPPONENT_TURN: 3,
}

initGame();

function initGame() {
  initDeck();
  initOppDeck();
}

function initDeck() {
  const deckElem = document.getElementById('deck');

  for (var i = 1; i <= 8; i++) {
    const cardElem = document.createElement('img');
    cardElem.src = `assets/card${i}.png`;
    cardElem.id = `card_${i}`;
    cardElem.classList.add('playerCard', 'inDeck');

    deckElem.appendChild(cardElem);
  }
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
