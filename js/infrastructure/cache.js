import { logger } from '../core/logger.js';

/**
 * CacheManager Inteligente.
 * Decide automaticamente onde salvar.
 */
class CacheManager {
    constructor() {
        this.memoryCache = new Map();
    }

    /**
     * Salva um dado no cache apropriado
     * @param {string} key - Chave (ex: 'theme', 'session')
     * @param {any} value - Valor
     * @param {string} level - 'memory', 'local', 'indexeddb'
     */
    async set(key, value, level = 'local') {
        try {
            if (level === 'memory') {
                this.memoryCache.set(key, value);
            } else if (level === 'local') {
                localStorage.setItem(key, JSON.stringify(value));
                this.memoryCache.set(key, value); // Promove pra memória pra leitura rápida
            } else if (level === 'indexeddb') {
                // TODO: Implementar wrapper do IndexedDB para Histórico Local
                logger.warning("IndexedDB cache not fully implemented yet.");
            }
        } catch (e) {
            logger.error(`Error writing to cache [${level}]:`, e);
        }
    }

    /**
     * Lê um dado
     */
    async get(key, level = 'local') {
        if (this.memoryCache.has(key)) {
            return this.memoryCache.get(key);
        }

        if (level === 'local') {
            const data = localStorage.getItem(key);
            if (data) {
                const parsed = JSON.parse(data);
                this.memoryCache.set(key, parsed);
                return parsed;
            }
        }
        
        return null;
    }

    async remove(key, level = 'local') {
        this.memoryCache.delete(key);
        if (level === 'local') {
            localStorage.removeItem(key);
        }
    }
}

export const cache = new CacheManager();
