import { features } from '../config/features.js';

class Logger {
    constructor() {
        this.isDebugEnabled = features.enableDebugLogger;
    }

    _formatMessage(level, message, data) {
        const timestamp = new Date().toISOString();
        let formatted = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        if (data) {
            // Se for um objeto de erro, tenta extrair a mensagem
            if (data instanceof Error) {
                formatted += `\nError Stack: ${data.stack}`;
            } else {
                formatted += `\nData: ${JSON.stringify(data)}`;
            }
        }
        return formatted;
    }

    info(message, data = null) {
        console.info(this._formatMessage('info', message, data));
    }

    warning(message, data = null) {
        console.warn(this._formatMessage('warning', message, data));
    }

    error(message, errorObj = null) {
        console.error(this._formatMessage('error', message, errorObj));
        // Em produção, isso seria enviado para um Crashlytics ou Sentry da vida.
    }

    debug(message, data = null) {
        if (this.isDebugEnabled) {
            console.log(this._formatMessage('debug', message, data));
        }
    }
}

export const logger = new Logger();
