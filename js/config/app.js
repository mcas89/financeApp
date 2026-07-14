/**
 * Configurações Centralizadas do Ambiente
 */
export const appConfig = {
    version: '0.1.0',
    build: 'dev', // 'dev' | 'prod'
    environment: 'development',
    
    // Limites operacionais (ex: segurança, performance)
    limits: {
        maxTransactionsCache: 1000,
        maxRetriesSync: 3
    }
};
