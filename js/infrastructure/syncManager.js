import { logger } from '../core/logger.js';
import { CACHE_KEYS, EVENTS } from '../config/constants.js';
import { eventBus } from '../core/eventBus.js';
import { connectivity } from './connectivity.js';

class SyncManager {
    constructor() {
        this.queue = [];
        this.isSyncing = false;
        
        // Quando a internet volta, tenta sincronizar a fila
        eventBus.on(EVENTS.NETWORK_ONLINE, () => {
            this.sync();
        });
    }

    /**
     * Adiciona uma ação à fila de sincronização
     */
    enqueue(action, payload) {
        const item = { id: Date.now(), action, payload, timestamp: new Date().toISOString() };
        this.queue.push(item);
        this._saveQueue();
        logger.info(`Action added to sync queue: ${action}`);
        
        if (connectivity.isOnline()) {
            this.sync();
        }
    }

    async sync() {
        if (this.isSyncing || this.queue.length === 0) return;
        
        if (!connectivity.isOnline()) {
            logger.warning('Cannot sync: Offline');
            return;
        }

        this.isSyncing = true;
        eventBus.emit(EVENTS.SYNC_STARTED);
        logger.info('Sync started...');

        try {
            // Processa a fila FIFO
            while (this.queue.length > 0) {
                const item = this.queue[0];
                // TODO: Chamar o serviço correspondente
                // await api.process(item);
                
                logger.debug(`Synced item ${item.id}`);
                this.queue.shift(); // Remove após sucesso
            }
            
            this._saveQueue();
            eventBus.emit(EVENTS.SYNC_COMPLETED);
            logger.info('Sync completed successfully.');
        } catch (error) {
            logger.error('Sync failed', error);
            eventBus.emit(EVENTS.SYNC_FAILED, error);
            // Em caso de erro, a fila permanece salva para tentar depois
        } finally {
            this.isSyncing = false;
        }
    }

    _saveQueue() {
        localStorage.setItem(CACHE_KEYS.OFFLINE_QUEUE, JSON.stringify(this.queue));
    }
}

export const syncManager = new SyncManager();
