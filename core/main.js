import Machine from "/core/8080chip.js";

const machine = new Machine();

function anim() {
	requestAnimationFrame(anim);
	machine.emulate();
}
for (let i = 0; i < 500; i++) {
	requestAnimationFrame(anim);
}


toggle.addEventListener("click", () => {
	machine.status = !machine.status;
});

LOG.addEventListener("click", () => {
	LOGDUMP.textContent = machine.LOG;
});