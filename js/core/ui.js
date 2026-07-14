/**
 * UI Manager
 * Gerencia interações globais de interface, como o esconderijo do FAB no scroll
 */

class UIManager {
    constructor() {
        this.lastScrollY = 0;
        this.ticking = false;
        this.initScrollListener();
    }

    initScrollListener() {
        // Escuta o scroll global
        document.addEventListener('scroll', (e) => {
            const target = e.target;
            
            // Aceita scroll no document ou em contêineres roláveis
            if (target === document || target.classList?.contains('scrollable-area') || target.tagName === 'MAIN') {
                const currentScrollY = target === document ? window.scrollY : target.scrollTop;
                
                if (!this.ticking) {
                    window.requestAnimationFrame(() => {
                        this.handleScroll(currentScrollY);
                        this.ticking = false;
                    });
                    this.ticking = true;
                }
            }
        }, true);
    }

    handleScroll(currentScrollY) {
        const fab = document.getElementById('main-fab');
        if (!fab) return;

        // Esconde ao descer (mais de 50px de margem), mostra ao subir
        if (currentScrollY > this.lastScrollY && currentScrollY > 50) {
            fab.classList.add('fab-hidden');
        } else {
            fab.classList.remove('fab-hidden');
        }

        this.lastScrollY = currentScrollY;
    }
}

export const uiManager = new UIManager();
