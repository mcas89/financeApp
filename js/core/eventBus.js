import { logger } from './logger.js';

class EventBus {
    constructor() {
        this.listeners = {};
    }

    /**
     * Inscreve-se em um evento
     * @param {string} event - Nome do evento (usar CONSTANTS.EVENTS)
     * @param {function} callback - Função a ser executada
     * @returns {function} Função para se desinscrever (unsubscribe)
     */
    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        
        // Retorna a função de unsubscribe
        return () => this.off(event, callback);
    }

    /**
     * Desinscreve-se de um evento
     * @param {string} event 
     * @param {function} callback 
     */
    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    /**
     * Emite um evento, chamando todos os listeners
     * @param {string} event - Nome do evento
     * @param {any} payload - Dados a serem passados aos listeners
     */
    emit(event, payload = null) {
        if (!this.listeners[event]) return;
        
        logger.debug(`Event Emitted: ${event}`, payload);
        
        this.listeners[event].forEach(callback => {
            try {
                callback(payload);
            } catch (error) {
                logger.error(`Error in event listener for ${event}:`, error);
            }
        });
    }
}

export const eventBus = new EventBus();
