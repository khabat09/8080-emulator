import OPCODE_SIZES from "/core/OPCODE_SIZES.js";

class Machine {
	constructor() {
		this.loadOfset = 0x100;
		this.memory = new Uint8Array(1024 * 65);
		this.SP = 0xffff;
		this.PC = this.loadOfset;
		
		//machine data stuff goes here(probably)
		this.isRomLoaded = false;
		this.inst = new Instruction();
		this.status = 1;
		this.console = document.querySelector("#console");
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
			this.memory[i + this.loadOfset] = bytes[i];
		}
		if (this.debugMode) {
			let memCpy = [...this.memory];
			memCpy = memCpy.map(x => "0x" + x.toString(16))
			console.log(JSON.stringify(memCpy));
		}
		this.isRomLoaded = true;
	}
	
	parity(num) {
		const len = num.toString(2).replaceAll("0", "").length;
		if (len % 2 == 0) return 1;
		return 0;
	}
	
	printChar() {
		const char = String.fromCharCode(this.E);
		this.console.textContent += char;
		this.PC = (this.memory[this.SP + 1] << 8) | this.memory[this.SP];
		this.SP += 2;
		console.log("printed char: ", char);
		console.log("Yoooooooooooooooooooooo")
	}
	printString() {
		const addr = (this.D << 8) | this.E;
		let i = 0;
		let char = this.memory[addr];
		let str = "";
		while (char !== 0x24) {
			i++;
			str += String.fromCharCode(char);
			char = this.memory[addr + i];
		}
		this.console.textContent += str + "\n";
		this.PC = (this.memory[this.SP + 1] << 8) | this.memory[this.SP];
		this.SP += 2;
		console.log("printed string: ", str);
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
		let bios = 0;
		if (this.PC === 0x05) {
			bios = 1;
			if (this.C === 2) {
				this.printChar();
			} else if (this.C === 9) {
				this.printString();
			}
		}
		if (bios) {
			return;
		}
		this.PC += this.inst.size;
		
		let debugString = "";
		if (this.debugMode) debugString += `opcode: 0x${this.inst.opcode.toString(16)} `;
		
		switch (this.inst.opcode) {
			case 0x00: {
				if (this.debugMode) debugString += "NOP did nothing, PC: 0x" + this.PC.toString(16);
				break;
			}
			
			case 0x06: {
				if (this.debugMode) debugString += `MVI B, D8, B: 0x${this.B.toString(16)} = byte2: 0x${this.inst.byte2.toString(16)}`;
				this.B = this.inst.byte2;
				break;
			}
			
			case 0x0c: {
				if (this.debugMode) debugString += `INR C, C++; all flags are set except CY, `;
				const res = new Uint8Array([this.C + 1])[0];
				
				if (res === 0) {
					this.Z = 1;
					if (this.debugMode) this.debugString += "Z flag is set";
				} else {
					this.Z = 0;
					if (this.debugMode) this.debugString += "Z flag is unset";
				}
				
				if (this.debugMode) this.debugString += " =---= ";
				
				if ((res >> 7) & 1 === 1) {
					this.S = 1;
					if (this.debugMode) this.debugString += "S flag is set";
				} else {
					this.S = 0;
					if (this.debugMode) this.debugString += "S flag is unset";
				}
				
				if (this.debugMode) this.debugString += " =---= ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					if (this.debugMode) this.debugString += "P flag is set";
				} else {
					this.P = 0;
					if (this.debugMode) this.debugString += "P flag is unset";
				}
				
				if (this.debugMode) this.debugString += " =---= ";
				
				if ((this.C & 0x0f) + 1 >= 2 ** 4) {
					this.AC = 1;
					if (this.debugMode) this.debugString += "AC flag is set";
				} else {
					this.AC = 0;
					if (this.debugMode) this.debugString += "AC flag is unset";
				}
				
				this.C = res;
				
				break;
			}
			
			case 0x0e: {
				if (this.debugMode) debugString += `MVI C, D8, set C: 0x${this.C.toString(16)} to byte2: 0x${this.inst.byte2.toString(16)}`
				this.C = this.inst.byte2;
				break;
			}
			
			case 0x0f: {
				if (this.debugMode) debugString += `RRC, set CY: 0b${this.CY.toString(16)} to bit 7 of A: 0b${this.A.toString(2)} and shift A by 1 to the left and put CY at bit 7 of A, `;
				this.CY = (this.A & 1);
				this.A = ((this.A >> 1) | (this.CY << 7)) & 0xff;
				if (this.debugMode) debugString += `now: CY: 0b${this.CY.toString(2)} and A: 0b${this.A.toString(2)}`;
				break;
			}
			
			case 0x21: {
				if (this.debugMode) debugString += `LXI H, D16,  set H: 0x${this.H.toString(16)} to byte3: 0x${this.inst.byte3.toString(16)}, set L: 0x${this.L.toString(16)} to byte2: 0x${this.inst.byte2.toString(16)}`;
				this.H = this.inst.byte3;
				this.L = this.inst.byte2;
				break;
			}
			
			case 0x31: {
				if (this.debugMode) debugString += `set SP: 0x${this.SP.toString(16)} to addr: 0x${this.inst.addr.toString(16)}, `
				this.SP = this.inst.addr;
				break;
			}
			
			case 0x5f: {
				if (this.debugMode) debugString += `MOV E, A, E: 0x${this.E.toString(16)} = A: 0x${this.A.toString(16)}`;
				this.E = this.A;
				break;
			}
			
			case 0x7c: {
				if (this.debugMode) debugString += `MV A, H, A: 0x${this.A.toString(16)} = H: 0x${this.H.toString(16)}`;
				this.A = this.H;
				break;
			}
			
			case 0xc2: {
				debugString += `JNZ addr, if flag Z: ${this.Z} is NOT set change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)}, =---= `
				if (!this.Z) {
					this.PC = this.inst.addr;
					debugString += `flag Z: ${this.Z} is set and PC: 0x${this.PC.toString(16)} is set to addr: 0x${this.inst.addr.toString(16)}`;
				} else debugString += `flag Z: ${this.Z} is not set pc: 0x${this.PC.toString(16)} is the same`
				break;
			}
			
			case 0xc3: {
				
				if (this.debugMode) debugString += `JMP addr, changed PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)}`;
				this.PC = this.inst.addr;
				break;
			}
			
			case 0xc6: {
				if (this.debugMode) debugString += `ADI D8, A += byte2 (A: 0x${this.A.toString(16)} + byte2: 0x${this.inst.byte2}): 0x${(new Uint8Array([this.A + this.inst.byte2])).toString(16)}, and set all flags, `;
				
				const res = new Uint8Array([this.A + this.inst.byte2])[0];
				
				if (res === 0) {
					this.Z = 1;
					if (this.debugMode) debugString += "Z flag is set";
				} else {
					this.Z = 0;
					if (this.debugMode) debugString += "Z flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if ((res >> 7) & 1 === 1) {
					this.S = 1;
					if (this.debugMode) debugString += "S flag is set";
				} else {
					this.S = 0;
					if (this.debugMode) debugString += "S flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if (this.A + this.inst.byte2 > 255) {
					this.CY = 1;
					if (this.debugMode) debugString += "CY flag is set";
				} else {
					this.CY = 0;
					if (this.debugMode) debugString += "CY flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					if (this.debugMode) debugString += "P flag is set";
				} else {
					this.P = 0;
					if (this.debugMode) debugString += "P flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if ((this.A & 0x0f) + (this.inst.byte2 & 0x0f) >= 2 ** 4) {
					this.AC = 1;
					if (this.debugMode) debugString += "AC flag is set";
				} else {
					this.AC = 0;
					if (this.debugMode) debugString += "AC flag is unset";
				}
				
				
				this.A = res;
				break;
			}
			
			case 0xc9: {
				if (this.debugMode) debugString += `RET, put SP: 0x${this.memory[this.SP].toString(16)} to PC.low: 0x${(this.PC & 0x00ff).toString(16)} and put SP+1: 0x${(this.memory[this.SP+1].toString(16))} to PC.hi: 0x${((this.PC & 0xff00)>>8).toString(16)} and SP += 2`;
				this.PC = (this.memory[this.SP + 1] << 8) | this.memory[this.SP];
				this.SP += 2;
				break;
			}
			
			case 0xca: {
				debugString += `JZ addr, if flag Z: ${this.Z} is set change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)}, =---= `
				if (this.Z) {
					this.PC = this.inst.addr;
					debugString += `flag Z: ${this.Z} is set and PC: 0x${this.PC.toString(16)} is set to addr: 0x${this.inst.addr.toString(16)}`;
				} else debugString += `flag Z: ${this.Z} is not set pc: 0x${this.PC.toString(16)} is the same`
				break;
			}
			
			case 0xcc: {
				if (this.debugMode) debugString += `CZ addr, if flag Z: ${this.Z} do push pc and change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)} =---= `;
				if (this.Z) {
					this.memory[this.SP - 1] = (this.PC & 0xff00) >> 8;
					this.memory[this.SP - 2] = (this.PC & 0xff);
					this.SP -= 2;
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += `did: pushed PC and set PC to addr`
				}
				else if (this.debugMode) debugString += "did: nothing, Z is not set";
				
				break;
			}
			
			case 0xcd: {
				if (this.debugMode) debugString += `CALL adr, put PC.hi: 0x${((this.PC & 0xff00)>>8).toString(16)} into SP: 0x${this.SP.toString(16)} and PC.lo: 0x${(this.PC & 0x00ff).toString(16)} in SP-1: 0x${(this.SP-1).toString(16)} and SP-=2: 0x${(this.SP-2).toString(16)} and set PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)} `;
				
				this.memory[this.SP - 1] = ((this.PC & 0xff00) >> 8);
				this.memory[this.SP - 2] = (this.PC & 0xff);
				this.SP -= 2;
				this.PC = this.inst.addr;
				
				break;
			}
			
			case 0xce: {
				if (this.debugMode) debugString += `ACI D8, A += byte2 + CY (A: 0x${this.A.toString(16)} + byte2: 0x${this.inst.byte2} + CY: 0x${this.CY.toString(16)}): 0x${(new Uint8Array([this.A + this.inst.byte2 + this.CY])).toString(16)}, and set all flags, `;
				
				const res = new Uint8Array([this.A + this.inst.byte2 + this.CY])[0];
				
				if (res === 0) {
					this.Z = 1;
					if (this.debugMode) debugString += "Z flag is set";
				} else {
					this.Z = 0;
					if (this.debugMode) debugString += "Z flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if ((res >> 7) & 1 === 1) {
					this.S = 1;
					if (this.debugMode) debugString += "S flag is set";
				} else {
					this.S = 0;
					if (this.debugMode) debugString += "S flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if (this.A + this.inst.byte2 + this.CY > 255) {
					this.CY = 1;
					if (this.debugMode) debugString += "CY flag is set";
				} else {
					this.CY = 0;
					if (this.debugMode) debugString += "CY flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					if (this.debugMode) debugString += "P flag is set";
				} else {
					this.P = 0;
					if (this.debugMode) debugString += "P flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if ((this.A & 0x0f) + (this.inst.byte2 & 0x0f) + (this.CY & 0x0f) >= 2 ** 4) {
					this.AC = 1;
					if (this.debugMode) debugString += "AC flag is set";
				} else {
					this.AC = 0;
					if (this.debugMode) debugString += "AC flag is unset";
				}
				
				
				this.A = res;
				break;
			}
			
			case 0xd1: {
				if (this.debugMode) debugString += `POP D, put SP: 0x${this.SP.toString(16)} into E: 0x${this.E.toString(16)} and SP+1: 0x${(this.SP+1).toString(16)} into D: 0x${this.D.toString(16)}, SP += 2`;
				this.E = this.memory[this.SP];
				this.D = this.memory[this.SP + 1];
				this.SP += 2;
				break;
			}
			
			case 0xd2: {
				if (this.debugMode) debugString += `JNC addr, jump to addr: 0x${this.inst.addr} if CY: ${this.CY} is NOT set, `;
				if (!this.CY) {
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += "DID jump";
				} else if (this.debugMode) debugString += "DID NOT jump";
				break;
			}
			
			case 0xd5: {
				if (this.debugMode) debugString += `PUSH D, set SP-2: 0x${(this.SP-2).toString(16)} to E: 0x${this.E.toString(16)}, set SP-1: 0x${(this.SP-1).toString(16)} to D: 0x${this.D.toString(16)}, sp-= 2`;
				this.memory[this.SP - 1] = this.E;
				this.memory[this.SP - 2] = this.D;
				this.SP -= 2;
				break;
			}
			
			case 0xd6: {
				if (this.debugMode) debugString += `SUI D8, A -= byte2 (A: 0x${this.A.toString(16)} - byte2: 0x${this.inst.byte2.toString(16)}): 0x${(new Uint8Array([this.A - this.inst.byte2]))[0].toString(16)}, all flags are set, `;
				const res = new Uint8Array([this.A - this.inst.byte2])[0];
				
				if (res === 0) {
					this.Z = 1;
					if (this.debugMode) debugString += "Z flag is set";
				} else {
					this.Z = 0;
					if (this.debugMode) debugString += "Z flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if ((res >> 7) & 1 === 1) {
					this.S = 1;
					if (this.debugMode) debugString += "S flag is set";
				} else {
					this.S = 0;
					if (this.debugMode) debugString += "S flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if (this.A < this.inst.byte2) {
					this.CY = 1;
					if (this.debugMode) debugString += "CY flag is set";
				} else {
					this.CY = 0;
					if (this.debugMode) debugString += "CY flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					if (this.debugMode) debugString += "P flag is set";
				} else {
					this.P = 0;
					if (this.debugMode) debugString += "P flag is unset";
				}
				
				if (this.debugMode) debugString += " =---= ";
				
				if ((this.A & 0x0f) < (this.inst.byte2 & 0x0f)) {
					this.AC = 1;
					if (this.debugMode) debugString += "AC flag is set";
				} else {
					this.AC = 0;
					if (this.debugMode) debugString += "AC flag is unset";
				}
				
				break;
			}
			
			case 0xda: {
				if (this.debugMode) debugString += `JC addr, jump to addr: 0x${this.inst.addr} if CY: ${this.CY} is set, `;
				if (this.CY) {
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += "DID jump";
				} else if (this.debugMode) debugString += "DID NOT jump";
				break;
			}
			
			case 0xe1: {
				if (this.debugMode) debugString += `POP H, put SP: 0x${this.SP.toString(16)} into L: 0x${this.L.toString(16)} and SP+1: 0x${(this.SP+1).toString(16)} into H: 0x${this.H.toString(16)}, SP += 2`;
				this.L = this.memory[this.SP];
				this.H = this.memory[this.SP + 1];
				this.SP += 2;
				break;
			}
			
			case 0xe2: {
				if (this.debugMode) debugString += `JPO addr, jump to addr: 0x${this.inst.addr.toString(16)} if P: ${this.P} flag is unset, `;
				if (!this.P) {
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += "DID jump"
				} else if (this.debugMode) debugString += "DID NOT jump"
				break;
			}
			case 0xe5: {
				if (this.debugMode) debugString += `PUSH H, set SP-2: 0x${(this.SP-2).toString(16)} to L: 0x${this.L.toString(16)}, set SP-1: 0x${(this.SP-1).toString(16)} to H: 0x${this.H.toString(16)}, sp-= 2`;
				this.memory[this.SP - 1] = this.L;
				this.memory[this.SP - 2] = this.H;
				this.SP -= 2;
				break;
			}
			case 0xe6: {
				if (this.debugMode) debugString += `ANI D8, (A: 0x${this.A} &= byte2: 0x${this.inst.byte2}): 0x${this.A & this.inst.byte2} and all flags are set, `;
				const res = this.A & this.inst.byte2;
				
				if (this.debugMode) debugString += "CY flag is unset";
				this.CY = 0;
				
				debugString += " =---= ";
				
				if (res === 0) {
					this.Z = 1;
					if (this.debugMode) debugString += "Z flag is set";
				} else {
					this.Z = 0;
					if (this.debugMode) debugString += "Z flag is unset";
				}
				
				debugString += " =---= ";
				
				if (res >> 7 == 1) {
					this.S = 1;
					if (this.debugMode) debugString += "S flag is set";
				} else {
					this.S = 0;
					if (this.debugMode) debugString += "S flag is unset";
				}
				
				debugString += " =---= ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					if (this.debugMode) debugString += "P flag is set";
				} else {
					this.P = 0;
					if (this.debugMode) debugString += "P flag is unset";
				}
				
				debugString += " =---= ";
				
				const ACRes = ((this.A | this.inst.byte2) >> 3) & 1;
				if (ACRes) {
					this.AC = 1;
					if (this.debugMode) debugString += "AC flag is set";
				} else {
					this.AC = 0;
					if (this.debugMode) debugString += "AC flag is unset";
				}
				
				this.A = res;
				break;
			}
			
			case 0xea: {
				if (this.debugMode) debugString += `JPE addr, jump to addr: 0x${this.inst.addr.toString(16)} if P: ${this.P} flag is set, `;
				if (this.P) {
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += "DID jump"
				} else if (this.debugMode) debugString += "DID NOT jump"
				break;
			}
			
			case 0xeb: {
				if (this.debugMode) debugString += `XCHG, swap D: 0x${this.D.toString(16)} and H: 0x${this.H.toString(16)} and swap E: 0x${this.E.toString(16)} and L: 0x${this.L.toString(16)} `;
				const tmpD = this.D;
				const tmpE = this.E;
				this.D = this.H;
				this.E = this.L;
				this.H = tmpD;
				this.L = tmpE;
				break;
			}
			
			case 0xf1: {
				if (this.debugMode) debugString += "POP PSW, go look your self im not explaining or debuging im just hoping for the best"
				this.A = this.memory[this.SP + 1];
				const flagByte = this.memory[this.SP];
				
				this.S = flagByte & 0b10000000;
				this.Z = flagByte & 0b01000000;
				this.AC = flagByte & 0b00010000;
				this.P = flagByte & 0b00000100;
				this.CY = flagByte & 0b00000001;
				
				break;
			}
			
			case 0xf2: {
				if (this.debugMode) debugString += `JP addr, jump to addr: 0x${this.inst.addr.toString(16)} if S: ${this.S} is unset, `;
				if (this.S === 0) {
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += "DID JUMP";
				} else if (this.debugMode) debugString += "DID NOT JUMP";
				break;
			}
			
			case 0xf4: {
				if (this.debugMode) debugString += `CP addr, if flag P: ${this.P} do push pc and change PC: 0x${this.PC.toString(16)} to addr: 0x${this.inst.addr.toString(16)} =---= `;
				if (this.P) {
					this.memory[this.SP - 1] = (this.PC && 0xff00) >> 8;
					this.memory[this.SP - 2] = (this.PC && 0x00ff);
					this.SP -= 2;
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += `did: pushed PC and set PC to addr`
				}
				if (this.debugMode) debugString += "did: nothing, P is not set";
				break;
			}
			
			case 0xf5: {
				if (this.debugMode) debugString += "PUSH PSW, put A into SP-1 and all flags to SP-2 for mere info check your self";
				this.memory[this.SP - 1] = this.A;
				this.memory[this.SP - 2] = (
					(this.S << 7) |
					(this.Z << 6) |
					(0 << 5) |
					(this.AC << 4) |
					(0 << 3) |
					(this.P << 2) |
					(1 << 1) |
					this.CY
				);
				this.SP -= 2;
				break;
			}
			
			case 0xfa: {
				if (this.debugMode) debugString += `JM addr, jump to addr: 0x${this.inst.addr.toString(16)} if S: ${this.S} is set, `;
				if (this.S === 1) {
					this.PC = this.inst.addr;
					if (this.debugMode) debugString += "DID JUMP";
				} else if (this.debugMode) debugString += "DID NOT JUMP";
				break;
			}
			case 0xfe: {
				const data = this.inst.byte2;
				const res = new Uint8Array([this.A - data])[0];
				if (this.debugMode) debugString += `CPI D8, do (A: ${this.A} - byte2: ${this.inst.byte2}): ${res} and only set flags `;
				
				if (this.A === data) {
					this.Z = 1;
					if (this.debugMode) debugString += `Z flag is set`;
				} else {
					this.Z = 0;
					if (this.debugMode) debugString += `Z flag is unset`;
				}
				
				if (this.debugMode) debugString += ", ";
				
				if (res >> 7 & 1) {
					this.S = 1;
					if (this.debugMode) debugString += "S flag is set";
				} else {
					this.S = 0;
					debugString += "S flag is unset";
				}
				
				if (this.debugMode) debugString += ", ";
				
				if (this.A < data) {
					this.CY = 1;
					if (this.debugMode) debugString += "CY is set";
				} else {
					this.CY = 0;
					if (this.debugMode) debugString += "CY is unset";
				}
				
				if (this.debugMode) debugString += ", ";
				
				const parity = this.parity(res);
				if (parity) {
					this.P = 1;
					if (this.debugMode) debugString += "P flag is set"
				} else {
					this.P = 0;
					if (this.debugMode) debugString += "P flag is unset"
				}
				
				if (this.debugMode) debugString += ", ";
				
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