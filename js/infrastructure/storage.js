import { logger } from '../core/logger.js';

/**
 * Storage Abstraction
 * Lida com IndexedDB para armazenar BLOBs, imagens e grandes coleções locais.
 */
class StorageService {
    constructor() {
        this.dbName = 'FinanceApp_DB';
    }

    async init() {
        logger.debug("IndexedDB Storage initialized (stub)");
    }
}

export const storage = new StorageService();
