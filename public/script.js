const ANIM_DURATION = 800;

const spotlightDiv = document.getElementById("spotlightCenter");
const destRect = spotlightDiv.getBoundingClientRect();

for (let card of document.getElementsByClassName("card")) {
  moveOnClick(card);
}

function moveOnClick(element) {
  element.onmousedown = moveElement;

  function moveElement() {

    element.onmousedown = null;

    element.classList.add("playedCard");

    const elemRect = element.getBoundingClientRect();

    const xTranslate = (destRect.x - elemRect.x) + (destRect.width / 2) - (elemRect.width / 2);
    const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);
    const scale = destRect.height / elemRect.height;

    var animation = element.animate({
      transform: [
        `translate(${xTranslate}px, ${yTranslate}px) scale(${scale})`,
      ]
    }, {
      duration: ANIM_DURATION,
      easing: "ease-in-out"
    });
    animation.onfinish = resetPos

    const style = element.currentStyle || window.getComputedStyle(element);
    const margin = parseInt(style.marginLeft.slice(0, -2));
    const playedVal = element.id.split("_")[1]

    for (let card of document.getElementsByClassName("card")) {
      if (card.classList.contains("playedCard")) {
        continue;
      }

      const cardVal = card.id.split("_")[1];
      var cardXTranslate = (elemRect.width / 2) + margin;

      if (cardVal > playedVal) {
        cardXTranslate *= -1;
      }

      card.animate({
        transform: [
          `translateX(${cardXTranslate}px)`,
        ]
      }, {
        duration: ANIM_DURATION,
        easing: "ease-in-out"
      });
    }
  };

  function resetPos() {
    // spotlightDiv.appendChild(element)
    document.getElementById("spotlightCenter").appendChild(element);
    element.classList.remove("inDeck");
    element.classList.add("inSpotlight");
  }
}

function buttonClicked() {
  console.log("button clicked");

  const evenCards = document.getElementsByClassName("even oppCard oppDeck");

  const cardToMove = evenCards.item(evenCards.length - 1);

  const ctmRect = cardToMove.getBoundingClientRect();

  const xTranslate = (destRect.x - ctmRect.x) + (destRect.width / 2) - (ctmRect.width / 2);
  const yTranslate = (destRect.y - ctmRect.y) + (destRect.height / 2) - (ctmRect.height / 2);

  const scale = destRect.height / ctmRect.height;

  const translateAnim = cardToMove.animate({
    transform: `translate(${xTranslate}px, ${yTranslate}px) scale(${scale}, ${scale})`,
  }, {
    duration: ANIM_DURATION,
    easing: "ease-in-out",
  });

  translateAnim.onfinish = () => {
    spotlightDiv.appendChild(cardToMove);
    cardToMove.classList.remove("oppDeck");
    cardToMove.classList.add("spotlight");
  }


}