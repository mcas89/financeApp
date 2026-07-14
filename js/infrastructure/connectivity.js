import { eventBus } from '../core/eventBus.js';
import { state } from '../core/state.js';
import { EVENTS } from '../config/constants.js';
import { logger } from '../core/logger.js';

class ConnectivityManager {
    constructor() {
        // Inicializa o estado com o valor real
        state.set('connectivity', navigator.onLine ? 'online' : 'offline');

        window.addEventListener('online', () => this._updateStatus('online'));
        window.addEventListener('offline', () => this._updateStatus('offline'));
    }

    _updateStatus(status) {
        state.set('connectivity', status);
        logger.info(`Network status changed: ${status}`);
        
        if (status === 'online') {
            eventBus.emit(EVENTS.NETWORK_ONLINE);
        } else {
            eventBus.emit(EVENTS.NETWORK_OFFLINE);
        }
    }

    isOnline() {
        return state.get('connectivity') === 'online';
    }
}

export const connectivity = new ConnectivityManager();
