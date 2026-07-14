import { state } from './state.js';
import { logger } from './logger.js';
import { CACHE_KEYS } from '../config/constants.js';

class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Tenta pegar do localStorage puro por enquanto (ou usar o CacheManager depois)
        const savedTheme = localStorage.getItem(CACHE_KEYS.THEME) || 'system';
        this.setTheme(savedTheme);

        // Ouve mudanças do sistema operacional se estiver em 'system'
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
            if (state.get('theme') === 'system') {
                this._applyTheme(e.matches ? 'dark' : 'light');
            }
        });
    }

    setTheme(themeName) {
        state.set('theme', themeName);
        localStorage.setItem(CACHE_KEYS.THEME, themeName);
        
        let actualTheme = themeName;
        if (themeName === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            actualTheme = prefersDark ? 'dark' : 'light';
        }
        
        this._applyTheme(actualTheme);
        logger.info(`Theme set to ${themeName} (Applied: ${actualTheme})`);
    }

    _applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.syncUI();
    }
    
    syncUI() {
        const theme = document.documentElement.getAttribute('data-theme') || 'light';
        const textEl = document.getElementById('theme-toggle-text');
        const iconEl = document.getElementById('theme-toggle-icon');
        if (textEl && iconEl) {
            textEl.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
            iconEl.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }
    
    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        if (current === 'dark') {
            this.setTheme('light');
        } else {
            this.setTheme('dark');
        }
    }
}

export const themeManager = new ThemeManager();
