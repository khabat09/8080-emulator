class Machine {
    constructor() {
        this.memory = new Uint8Array(1024 * 65);
        this.SP;
        this.PC = 0;
        
        //machine data stuff goes here(probably)
        this.isRomLoaded = false;
        
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
}

export default Machine;