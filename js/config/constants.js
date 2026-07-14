/**
 * Constantes globais do sistema.
 */
export const EVENTS = {
    // Auth
    AUTH_STATE_CHANGED: 'auth_state_changed',
    USER_LOGGED_IN: 'user_logged_in',
    USER_LOGGED_OUT: 'user_logged_out',
    
    // Infra
    NETWORK_ONLINE: 'network_online',
    NETWORK_OFFLINE: 'network_offline',
    SYNC_STARTED: 'sync_started',
    SYNC_COMPLETED: 'sync_completed',
    SYNC_FAILED: 'sync_failed',
    
    // UI & Temas
    THEME_CHANGED: 'theme_changed',
    DEVICE_TYPE_CHANGED: 'device_type_changed',
    
    // Erros
    GLOBAL_ERROR: 'global_error'
};

export const CACHE_KEYS = {
    THEME: 'financeapp_theme',
    USER_SESSION: 'financeapp_user_session',
    TRANSACTIONS: 'financeapp_tx_history',
    OFFLINE_QUEUE: 'financeapp_offline_queue'
};
