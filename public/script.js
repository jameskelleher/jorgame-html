const ANIM_DURATION = 800;

const destDiv = document.getElementById("destDiv");

for (let card of document.getElementsByClassName("card")) {
  moveOnClick(card);
}

function moveOnClick(element) {
  element.onmousedown = moveElement;

  function moveElement() {

    element.classList.add("playedCard");

    const elemRect = element.getBoundingClientRect();
    const destRect = destDiv.getBoundingClientRect();

    const xTranslate = (destRect.x - elemRect.x) + (destRect.width / 2) - (elemRect.width / 2);
    const yTranslate = (destRect.y - elemRect.y) + (destRect.height / 2) - (elemRect.height / 2);

    var animation = element.animate({
      transform: [
        `translate(${xTranslate}px, ${yTranslate}px)`,
      ]
    }, {
      duration: ANIM_DURATION,
      easing: "ease-in-out"
    });
    animation.onfinish = resetPos

    // let destSlotType;

    // console.log(element.parentElement.id);

    // if (element.parentElement.id.startsWith("odd")) {
    //   console.log("odd to even switch");
    //   destSlotType = "evenSlot";
    // } else {
    //   console.log("even to odd switch");
    //   destSlotType = "oddSlot";
    // }

    // console.log(destSlotType);

    // const playedVal = element.id.split("_")[1];

    // console.log(playedVal);

    // for (let card of document.getElementsByClassName("card")) {
      // if (card.classList.contains("playedCard")) {
      //   continue;
      // }

    //   const cardVal = card.id.split("_")[1];

    //   if (cardVal < playedVal) {
    //     document.getElementById(`${destSlotType}${cardVal}`).appendChild(element);
    //   } else {
    //     document.getElementById(`${destSlotType}${cardVal - 1}`).appendChild(element);
    //   }
    // }
  };

  function resetPos() {
    destDiv.appendChild(element)
  }
}
