const ANIM_DURATION = 800;
const ANIM_PARAMS = {
  duration: ANIM_DURATION,
  easing: 'ease-in-out'
}

const socket = io.connect(window.location.origin);

const spotlightDiv = document.getElementById('spotlightDiv');
const spotlightLeft = document.getElementById('spotlightLeft');
const spotlightCenter = document.getElementById('spotlightCenter');
const spotlightRight = document.getElementById('spotlightRight');


for (let card of document.getElementsByClassName('playerCard')) {
  moveOnClick(card);
}

function moveOnClick(element) {
  element.onmousedown = moveElement;

  function moveElement() {

    element.onmousedown = null;

    animateToSpotlight(element);
    animateCardsInDeck(element);
  }
}

function buttonClicked() {
  const evenCards = document.getElementsByClassName('even oppCard inOppDeck');

  const cardToMove = evenCards.item(evenCards.length - 1);

  animateToSpotlight(cardToMove);
}

function animate(element, destElem, transform, classAdd = 'inSpotlight', classRemove = ['inDeck', 'inOppDeck']) {
  animation = element.animate({
    transform: transform
  }, ANIM_PARAMS);

  animation.onfinish = () => {
    element.classList.remove(...classRemove);
    element.classList.add(classAdd);
    destElem.appendChild(element);
  }
}

function animateToSpotlight(element) {
  if (spotlightCenter.childElementCount === 0) {
    animateToSpotlightCenter(element);
  } else if (element.classList.contains('playerCard')) {
    animateToSpotlightRight(element);
    animateToSpotlightLeft(spotlightCenter.children[0]);
  } else {
    animateToSpotlightLeft(element);
    animateToSpotlightRight(spotlightCenter.children[0]);
  }
}

function animateToSpotlightCenter(element) {
  const elemRect = element.getBoundingClientRect();
  const destElem = spotlightCenter;
  const destRect = destElem.getBoundingClientRect();

  const xTranslate = (destRect.x - elemRect.x) + (destRect.width / 2) - (elemRect.width / 2);
  const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);
  const scale = destRect.height / elemRect.height;

  const transform = `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`;

  animate(element, destElem, transform);
}

function animateToSpotlightRight(element) {
  const elemRect = element.getBoundingClientRect();
  const destElem = spotlightRight;
  const destRect = destElem.getBoundingClientRect();

  const scale = destRect.height / elemRect.height;

  const xCenter = elemRect.x + elemRect.width / 2;
  const xAfterScale = xCenter - (elemRect.width / 2 * scale);
  const xTranslate = destRect.x - xAfterScale - elemRect.width * scale;

  const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);

  const transform = `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`;

  animate(element, destElem, transform);
}

function animateToSpotlightLeft(element) {
  const elemRect = element.getBoundingClientRect();
  const destElem = spotlightLeft;
  const destRect = destElem.getBoundingClientRect();

  const scale = destRect.height / elemRect.height;

  const xCenter = elemRect.x + elemRect.width / 2;
  const xAfterScale = xCenter - (elemRect.width / 2 * scale);
  const xTranslate = destRect.x - xAfterScale;

  const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);

  const transform = `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`;

  animate(element, destElem, transform);
}

function animateCardsInDeck(element) {
  const style = element.currentStyle || window.getComputedStyle(element);
  const margin = parseInt(style.marginLeft.slice(0, -2));
  const playedVal = element.id.split('_')[1]

  for (let card of document.getElementsByClassName('inDeck')) {
    if (card == element) {
      continue;
    }

    const cardVal = card.id.split('_')[1];
    const cardWidth = card.getBoundingClientRect().width
    var cardXTranslate = (cardWidth / 2) + margin;

    if (cardVal > playedVal) {
      cardXTranslate *= -1;
    }

    card.animate({
      transform: [
        `translateX(${cardXTranslate}px)`,
      ]
    }, {
      duration: ANIM_DURATION,
      easing: 'ease-in-out'
    });
  }
}