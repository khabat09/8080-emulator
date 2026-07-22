import OPCODE_SIZES from "/core/OPCODE_SIZES.js";

class Machine {
    constructor() {
        this.memory = new Uint8Array(1024 * 65);
        this.SP;
        this.PC = 0;
        
        //machine data stuff goes here(probably)
        this.isRomLoaded = false;
        this.inst = new Instruction();
        
        //REGISTERS
        this.A;
        this.B;
        this.C;
        this.D;
        this.E;
        this.H;
        this.L;
        
        //16 bit refisters
        this.BC;
        this.DE;
        this.HL;
        
        //FLAGS
        this.S;
        this.Z;
        this.P;
        this.C;
        this.AC;
        
        this.loadRom("/roms/8080EXER.COM")
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
    
    
    emulate() {
        if (this.isRomLoaded) this.emulateInst();
    }
    
    emulateInst() {
        this.inst.opcode = this.memory[this.PC] & 0xff;
        this.inst.byte2 = this.memory[this.PC + 1];
        this.inst.byte3 = this.memory[this.PC + 2];
        this.inst.setSize();
        this.PC += this.inst.size();
        
        switch (this.inst.opcode) {
            case 0x00: {
                console.log("NOP")
                break;
            }
            
            default: {
                console.log(`not implemented opcode: 0x${this.inst.opcode.toString(16)}`)
            }
        }
        
    }
    
}

class Instruction {
    constructor() {
        this.opcode;
        this.byte2;
        this.byte3;
        this.size;
    }
    setSize() {
        this.size = OPCODE_SIZES[this.opcode];
        if (!this.size) {
            throw new Error(`this opcodes: ${this.opcode.toString(16)}, size is not in the OPCODE_SIZES`)
        }
    }
}

export default Machine;