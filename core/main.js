import Machine from "/core/8080chip.js";

const machine = new Machine();

function anim() {
    requestAnimationFrame(anim);
}
requestAnimationFrame(anim);