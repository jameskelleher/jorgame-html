const ANIM_DURATION = 800;
const ANIM_PARAMS = {
  duration: ANIM_DURATION,
  easing: 'ease-in-out'
}

const spotlightDiv = document.getElementById('spotlightDiv');

function animatePlayerMove(element) {
  const promise1 = animateCardsInDeck(element);
  const promise2 = animateToSpotlight(element);
  return [...promise1, ...promise2];
}

function animateOpponentMove(evenOrOdd) {
  const evenCards = document.getElementsByClassName(`${evenOrOdd} oppCard inOppDeck`);

  const cardToMove = evenCards.item(evenCards.length - 1);

  return animateToSpotlight(cardToMove);
}

function animate(element, destElem, transform, classAdd = 'inSpotlight', classRemove = ['inDeck', 'inOppDeck']) {
  animation = element.animate({
    transform: transform
  }, ANIM_PARAMS);

  animation.finished = animation.finished.then(() => {
    element.classList.remove(...classRemove);
    element.classList.add(classAdd);
    destElem.appendChild(element);
  })

  return animation;
}

function animateToSpotlight(element) {
  if (spotlightDiv.childElementCount === 0) {
    const anim1 = animateToSpotlightCenter(element);
    anim1.finished.then(() => {
      spotlightDiv.classList.remove('justifySpaceBetween');
      spotlightDiv.classList.add('justifyCenter');
    })
    return [anim1.finished];
  } else if (element.classList.contains('playerCard')) {
    const oppCardElement = spotlightDiv.children[0];
    const anim1 = animateToSpotlightLeft(oppCardElement);
    const anim2 = animateToSpotlightRight(element);
    const finishedPromises = [anim1.finished, anim2.finished]
    Promise.all(finishedPromises).then(() => {
      spotlightDiv.classList.remove('justifyCenter');
      spotlightDiv.classList.add('justifySpaceBetween');
    })
    return finishedPromises;
  } else {
    const playerCardElement = spotlightDiv.children[0]
    const anim1 = animateToSpotlightRight(playerCardElement);
    const anim2 = animateToSpotlightLeft(element);
    const finishedPromises = [anim1.finished, anim2.finished]
    Promise.all(finishedPromises).then(() => {
      spotlightDiv.classList.remove('justifyCenter');
      spotlightDiv.classList.add('justifySpaceBetween');
    })
    return finishedPromises;
  }
}

function animateToSpotlightCenter(element) {
  const elemRect = element.getBoundingClientRect();
  const destElem = spotlightDiv;
  const destRect = destElem.getBoundingClientRect();

  const xTranslate = (destRect.x - elemRect.x) + (destRect.width / 2) - (elemRect.width / 2);
  const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);
  const scale = destRect.height / elemRect.height;

  const transform = `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`;

  return animate(element, destElem, transform);
}

function animateToSpotlightRight(element) {
  const elemRect = element.getBoundingClientRect();
  const destElem = spotlightDiv;
  const destRect = destElem.getBoundingClientRect();

  const scale = destRect.height / elemRect.height;

  const xTarget = destRect.x + destRect.width - elemRect.width * scale;
  const xAfterScale = elemRect.x + (elemRect.width - elemRect.width * scale) / 2;
  const xTranslate = xTarget - xAfterScale;
  // const xCenter = elemRect.x + elemRect.width / 2;
  // const xAfterScale = xCenter - (elemRect.width / 2 * scale);
  // const xTranslate = destRect.x - xAfterScale - elemRect.width * scale;

  const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);

  const transform = `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`;

  return animate(element, destElem, transform);
}

function animateToSpotlightLeft(element) {
  const elemRect = element.getBoundingClientRect();
  const destElem = spotlightDiv;
  const destRect = destElem.getBoundingClientRect();

  const scale = destRect.height / elemRect.height;

  const xCenter = elemRect.x + elemRect.width / 2;
  const xAfterScale = xCenter - (elemRect.width / 2 * scale);
  const xTranslate = destRect.x - xAfterScale;

  const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);

  const transform = `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`;

  return animate(element, destElem, transform);
}

function animateClearSpotlight() {
  const leftAnim = animateClearSpotlightDiv(spotlightDiv.children[0]);
  const rightAnim = animateClearSpotlightDiv(spotlightDiv.children[1]);
  return [leftAnim.finished, rightAnim.finished];
}

function animateClearSpotlightDiv(cardElem) {
  const elemRect = cardElem.getBoundingClientRect();
  const yTranslate = -1 * elemRect.y - elemRect.height;
  const anim = cardElem.animate({
    transform: `translateY(${yTranslate}px)`
  }, ANIM_PARAMS);

  anim.finished = anim.finished.then( () => {
    cardElem.remove();
  });

  return anim;
}

function animateCardsInDeck(element) {
  const style = element.currentStyle || window.getComputedStyle(element);
  const margin = parseInt(style.marginLeft.slice(0, -2));
  const playedVal = element.id.split('_')[1]

  let result = [];

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

    const anim = card.animate({
      transform: [
        `translateX(${cardXTranslate}px)`,
      ]
    }, {
      duration: ANIM_DURATION,
      easing: 'ease-in-out'
    });

    result.push(anim.finished);
  }

  return result;
}