import { logger } from '../core/logger.js';

/**
 * Analytics Service
 * Futuramente enviará dados para Google Analytics / Mixpanel.
 * Usado para responder "Qual funcionalidade é mais usada?".
 */
class AnalyticsService {
    trackEvent(eventName, properties = {}) {
        // Por enquanto loga apenas no console de debug
        logger.debug(`[Analytics Track] ${eventName}`, properties);
        
        // Futuro: 
        // window.gtag('event', eventName, properties);
    }

    trackScreenView(screenName) {
        logger.debug(`[Analytics Screen] Viewed: ${screenName}`);
    }
    
    identify(userId, traits = {}) {
        logger.debug(`[Analytics Identify] User: ${userId}`, traits);
    }
}

export const analytics = new AnalyticsService();
