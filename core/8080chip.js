class Machine {
    constructor() {
        this.memory = new Uint8Array(1024 * 65);
        this.SP;
        this.PC = 0;
        
        //REGUSTERS
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
    }
    async loadRom(path){
        const res = await fetch(path);
        const data = await res.arrayBuffer();
        const bytes = Uint8Array(data);
    }
}

export default Machine;