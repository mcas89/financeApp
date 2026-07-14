class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    /**
     * Mostra um toast de feedback
     * @param {string} message - A mensagem a ser exibida
     * @param {string} type - 'success', 'error', 'info'
     * @param {number} duration - Duração em milissegundos
     */
    show(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = '';
        if (type === 'success') icon = '<i class="fas fa-check-circle"></i>';
        if (type === 'error') icon = '<i class="fas fa-exclamation-circle"></i>';

        toast.innerHTML = `${icon} <span>${message}</span>`;
        
        this.container.appendChild(toast);

        // Remove após duração
        setTimeout(() => {
            toast.style.animation = 'slideUp 150ms reverse forwards';
            setTimeout(() => toast.remove(), 150);
        }, duration);
    }

    success(message) {
        this.show(`✓ ${message}`, 'success');
    }

    error(message) {
        this.show(message, 'error');
    }
}

export const toast = new ToastManager();
