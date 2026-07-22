import OPCODE_SIZES from "/core/OPCODE_SIZES.js";

class Machine {
	constructor() {
		this.memory = new Uint8Array(1024 * 65);
		this.SP;
		this.PC = 0;
		
		//machine data stuff goes here(probably)
		this.isRomLoaded = false;
		this.inst = new Instruction();
		this.status = 1;
		
		this.debugMode = 1;
		
		//REGISTERS
		this.A = 0;
		this.B = 0;
		this.C = 0;
		this.D = 0;
		this.E = 0;
		this.H = 0;
		this.L = 0;
		
		//16 bit registers
		this.BC = 0;
		this.DE = 0;
		this.HL = 0;
		
		//FLAGS
		this.S = 0;
		this.Z = 0;
		this.P = 0;
		this.CY = 0;
		this.AC = 0;
		
		this.loadRom("/roms/TST8080.COM");
	}
	async loadRom(path) {
		this.isRomLoaded = false;
		const res = await fetch(path);
		const data = await res.arrayBuffer();
		const bytes = new Uint8Array(data);
		
		for (let i = 0; i < bytes.length; i++) {
			this.memory[this.PC + i] = bytes[i];
		}
		this.isRomLoaded = true;
	}
	
	parity(num) {
		const len = num.toString(2).replaceAll("0", "").length;
		if (len % 2 == 0) return 1;
		return 0;
	}
	
	emulate() {
		if (this.isRomLoaded && this.status) this.emulateInst();
	}
	
	emulateInst() {
		this.inst.opcode = this.memory[this.PC] & 0xff;
		this.inst.byte2 = this.memory[this.PC + 1];
		this.inst.byte3 = this.memory[this.PC + 2];
		this.inst.addr = (this.inst.byte3 & 0xff) << 8 | (this.inst.byte2 & 0xff)
		if (!this.inst.setSize()) {
			this.status = 0;
			return 0;
		}
		this.PC += this.inst.size;
		
		let debugString = "";
		if (this.debugMode) debugString += `opcode: 0x${this.inst.opcode.toString(16)} `;
		
		switch (this.inst.opcode) {
			case 0x00: {
				if (this.debugMode) debugString += "NOP did nothing"
				break;
			}
			
			case 0xc3: {
				
				if (this.debugMode) debugString += `JMP addr, changed PC: ${this.PC} to addr: 0x${this.inst.addr.toString(16)}`;
				this.PC = this.inst.addr;
				break;
			}
			
			case 0xca: {
				debugString += `JZ addr, if flag Z: ${this.Z} is set change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)}, =---= `
				if (this.Z) {
					this.PC = this.inst.addr;
					debugString += `flag Z: ${this.Z} is set and PC: 0x${this.PC.toString(16)} is set to addr: 0x${this.inst.add.toString(16)}`;
				} else debugString += `flag Z: ${this.Z} is not set pc: 0x${this.PC.toString(16)} is the same`
				break;
			}
			
			case 0xcc: {
				if (this.debugMode) debugString += `CZ addr, if flag Z: ${this.Z} do push pc and change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)} =---= `;
				if (this.P) {
					this.memory[this.SP] = this.PC;
					this.SP--;
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += `did: pushed PC and set PC to addr`
				}
				if (this.debugMode) debugString += "did: nothing, Z is not set";
				
				break;
			}
			
			case 0xf4: {
				if (this.debugMode) debugString += `CP addr, if flag P: ${this.P} do push pc and change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)} =---= `;
				if (this.P) {
					this.memory[this.SP] = this.PC;
					this.SP--;
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += `did: pushed PC and set PC to addr`
				}
				if (this.debugMode) debugString += "did: nothing, P is not set";
				break;
			}
			
			case 0xfe: {
				const data = this.inst.byte2;
				const res = new Uint8Array([this.A - data])[0];
				if (this.debugMode) debugString += `CPI D8, do (A: ${this.A} - byte2: ${this.inst.byte2}): ${res} and only set flags `;
				
				if (this.A === data) {
					this.Z = 1;
					debugString += `Z flag is set`;
				} else {
					this.Z = 0;
					debugString += `Z flag is unset`;
				}
				
				debugString += ", ";
				
				if (res >> 7 & 1) {
					this.S = 1;
					debugString += "S flag is set";
				} else {
					this.S = 0;
					debugString += "S flag is unset";
				}
				
				debugString += ", ";
				
				if (this.A < data) {
					this.CY = 1;
					debugString += "CY is set";
				} else {
					this.CY = 0;
					debugString += "CY is unset";
				}
				
				debugString += ", ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					debugString += "P flag is set"
				} else {
					this.P = 0;
					debugString += "P flag is unset"
				}
				
				debugString += ", ";
				
				if ((this.A & 0x0f) < (this.inst.byte2 & 0x0f)) {
					this.AC = 1;
					if (this.debugMode) debugString += "AC flag is set";
				} else {
					this.AC = 0;
					if (this.debugMode) debugString += "AC flag is unset";
				}
				
				break;
			}
			
			default: {
				console.log(`not implemented opcode: 0x${this.inst.opcode.toString(16)}`)
			}
		}
		if (this.debugMode) console.log(debugString);
	}
	
}

class Instruction {
	constructor() {
		this.opcode;
		this.byte2;
		this.byte3;
		this.addr;
		this.size;
	}
	setSize() {
		this.size = OPCODE_SIZES[this.opcode];
		if (!this.size) {
			console.log(`this opcodes: 0x${this.opcode.toString(16)}, size is not in the OPCODE_SIZES`);
			return 0;
		}
		return 1;
	}
}

export default Machine;