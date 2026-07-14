import { eventBus } from './eventBus.js';
import { logger } from './logger.js';

/**
 * State Manager (Store like Redux/Vuex)
 */
class AppState {
    constructor() {
        this.state = {
            user: null,
            workspace: null,
            theme: 'system',
            connectivity: 'online',
            settings: {},
            activeWorkspaceId: null // Adicionado para silenciar o warning
        };
    }

    /**
     * Obtém uma cópia readonly de parte do estado
     * @param {string} key - Chave do estado (ex: 'user')
     */
    get(key) {
        if (this.state[key] === undefined) return null;
        // Retorna uma cópia profunda para evitar mutação direta
        return JSON.parse(JSON.stringify(this.state[key]));
    }

    /**
     * Atualiza o estado e emite evento
     * @param {string} key - Chave (ex: 'theme')
     * @param {any} value - Novo valor
     */
    set(key, value) {
        if (this.state.hasOwnProperty(key)) {
            // Verifica se realmente mudou
            if (JSON.stringify(this.state[key]) !== JSON.stringify(value)) {
                this.state[key] = value;
                logger.debug(`State changed: ${key}`, value);
                
                // Emite um evento dinâmico para quem estiver ouvindo essa chave específica
                eventBus.emit(`state_changed:${key}`, value);
            }
        } else {
            logger.warning(`Attempted to set unknown state key: ${key}`);
        }
    }
}

export const state = new AppState();
