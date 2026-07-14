import { router } from './core/router.js';
import { authRoutes, financeRoutes } from './config/routes.js'; // Atualizado
import { authService } from './services/authService.js';

// Fase 0 Imports
import { logger } from './core/logger.js';
import { perf } from './infrastructure/performance.js';
import { appConfig } from './config/app.js';
import './core/themeManager.js'; // Inicializa automaticamente
import './core/deviceManager.js'; // Inicializa automaticamente
import './infrastructure/connectivity.js'; // Inicializa automaticamente
import './infrastructure/errorHandler.js'; // Inicializa automaticamente
import './core/ui.js'; // UI Manager (scroll hide)
import { navigation } from './services/navigation.js';
import { themeManager } from './core/themeManager.js';

// Expõe globalmente para uso inline
window.navigation = navigation;
window.themeManager = themeManager;

/**
 * Função global de Confirmação (Substitui confirm() do navegador)
 */
window.appConfirm = (title, message, options = {}) => {
    return new Promise((resolve) => {
        const dialog = document.getElementById('global-confirm-dialog');
        if (!dialog) return resolve(window.confirm(`${title}\n\n${message}`)); // Fallback seguro

        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const btnCancel = document.getElementById('confirm-btn-cancel');
        const btnAction = document.getElementById('confirm-btn-action');
        const icon = document.getElementById('confirm-icon');

        titleEl.textContent = title;
        msgEl.innerHTML = message.replace(/\n/g, '<br>');
        
        btnCancel.textContent = options.cancelText || 'Cancelar';
        btnAction.textContent = options.confirmText || 'Confirmar';

        if (options.type === 'ai') {
            btnAction.style.background = 'var(--primary)';
            icon.className = 'fas fa-female';
            icon.style.color = 'var(--primary)';
        } else {
            btnAction.style.background = 'var(--danger)';
            icon.className = 'fas fa-exclamation-triangle';
            icon.style.color = 'var(--danger)';
        }

        const handleCancel = () => { cleanup(); resolve(false); };
        const handleConfirm = () => { cleanup(); resolve(true); };

        const cleanup = () => {
            btnCancel.removeEventListener('click', handleCancel);
            btnAction.removeEventListener('click', handleConfirm);
            dialog.close();
        };

        btnCancel.addEventListener('click', handleCancel);
        btnAction.addEventListener('click', handleConfirm);

        dialog.showModal();
    });
};

/**
 * Entry Point da Aplicação
 */
class App {
    constructor() {
        this.init();
    }

    async init() {
        perf.startTimer('app_init');
        logger.info(`Starting FinanceApp v${appConfig.version} (${appConfig.environment})`);
        
        // Iniciar app

        // Register Service Worker for PWA / Offline Mode
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        logger.debug('ServiceWorker registrado com sucesso:', registration.scope);
                    })
                    .catch(err => {
                        logger.error('Falha ao registrar o ServiceWorker:', err);
                    });
            });
        }
        
        // 1. Registra os módulos de rotas no roteador principal
        router.registerModule(authRoutes);
        router.registerModule(financeRoutes);
        
        // 2. Aguarda verificação de sessão do Firebase
        await authService.checkSession();
        
        // 3. Remove o Loader inicial e carrega a rota atual
        const loader = document.getElementById('initial-loader');
        if(loader) loader.classList.add('hidden');
        
        router.handleRoute();
        
        perf.endTimer('app_init');
    }
}

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
