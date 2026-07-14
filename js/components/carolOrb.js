export class CarolOrb {
    /**
     * Instancia o componente do Orbe da Carol IA
     * @param {HTMLElement} container O elemento DOM onde o orbe será injetado
     */
    constructor(container) {
        this.container = container;
        this.currentState = 'idle';
        this._initDOM();
    }

    _initDOM() {
        this.container.innerHTML = '';
        
        this.orbEl = document.createElement('div');
        this.orbEl.className = 'carol-orb state-idle';
        
        const glow = document.createElement('div');
        glow.className = 'orb-glow';
        
        const halo = document.createElement('div');
        halo.className = 'orb-halo';
        
        const particles = document.createElement('div');
        particles.className = 'orb-particles';
        
        const p1 = document.createElement('div'); p1.className = 'orb-particle orb-p1';
        const p2 = document.createElement('div'); p2.className = 'orb-particle orb-p2';
        const p3 = document.createElement('div'); p3.className = 'orb-particle orb-p3';
        particles.appendChild(p1);
        particles.appendChild(p2);
        particles.appendChild(p3);
        
        const core = document.createElement('div');
        core.className = 'orb-core';
        
        this.orbEl.appendChild(glow);
        this.orbEl.appendChild(halo);
        this.orbEl.appendChild(particles);
        this.orbEl.appendChild(core);
        
        this.container.appendChild(this.orbEl);
    }

    /**
     * Altera o estado (comportamento e cor) do orbe
     * @param {string} type 'idle', 'thinking', 'education', 'opportunity', 'attention', 'critical', 'motivation'
     */
    setState(type) {
        const validStates = ['idle', 'thinking', 'education', 'opportunity', 'attention', 'critical', 'motivation'];
        if (!validStates.includes(type)) type = 'idle';
        
        // Remove estado anterior e aplica o novo
        this.orbEl.className = this.orbEl.className.replace(/state-\w+/, `state-${type}`);
        this.currentState = type;
    }
    
    /**
     * Executa um pulso rápido (ex: transição de mensagem, salvar algo)
     */
    pulse() {
        this.orbEl.classList.remove('anim-pulse');
        // Força o reflow rápido para resetar a animação caso seja chamada repetidamente
        void this.orbEl.offsetWidth; 
        this.orbEl.classList.add('anim-pulse');
        setTimeout(() => {
            if (this.orbEl) this.orbEl.classList.remove('anim-pulse');
        }, 300);
    }
    
    /**
     * Vibra o orbe (ex: erro, bloqueio)
     */
    shake() {
        this.orbEl.classList.remove('anim-shake');
        void this.orbEl.offsetWidth;
        this.orbEl.classList.add('anim-shake');
        setTimeout(() => {
            if (this.orbEl) this.orbEl.classList.remove('anim-shake');
        }, 400);
    }
    
    /**
     * Expande uma onda (ex: meta atingida)
     */
    celebrate() {
        this.orbEl.classList.remove('anim-celebrate');
        void this.orbEl.offsetWidth;
        this.orbEl.classList.add('anim-celebrate');
        setTimeout(() => {
            if (this.orbEl) this.orbEl.classList.remove('anim-celebrate');
        }, 800);
    }
    
    /**
     * Atalhos
     */
    thinking() { this.setState('thinking'); }
    idle() { this.setState('idle'); }
}
