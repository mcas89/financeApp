import { logger } from '../core/logger.js';

class PerformanceManager {
    constructor() {
        this.metrics = {};
    }

    startTimer(label) {
        this.metrics[label] = performance.now();
    }

    endTimer(label) {
        if (!this.metrics[label]) return;
        
        const duration = performance.now() - this.metrics[label];
        logger.debug(`[Performance] ${label} took ${duration.toFixed(2)}ms`);
        
        delete this.metrics[label];
        return duration;
    }

    // Exemplo de uso nativo da Performance API
    logPaintMetrics() {
        const paintMetrics = performance.getEntriesByType('paint');
        paintMetrics.forEach(metric => {
            logger.debug(`[Performance] ${metric.name}: ${metric.startTime.toFixed(2)}ms`);
        });
    }
}

export const perf = new PerformanceManager();
