import { logger } from '../core/logger.js';
import { toast } from '../components/toast.js';

class ErrorHandler {
    constructor() {
        window.addEventListener('error', (e) => this.handleUncaughtError(e));
        window.addEventListener('unhandledrejection', (e) => this.handlePromiseRejection(e));
    }

    /**
     * Traduz erros técnicos para humanos
     */
    _translateFirebaseError(code) {
        const errors = {
            'auth/user-not-found': 'Usuário não encontrado. Verifique o e-mail digitado.',
            'auth/wrong-password': 'A senha está incorreta.',
            'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
            'permission-denied': 'Você não tem permissão para realizar esta ação.'
        };
        return errors[code] || 'Ocorreu um erro inesperado. Tente novamente.';
    }

    handle(error, silent = false) {
        logger.error('Handled Error:', error);
        
        if (silent) return;

        let message = 'Erro desconhecido.';
        
        if (error.code) {
            // Provável erro do Firebase
            message = this._translateFirebaseError(error.code);
        } else if (error.message) {
            message = error.message;
        }

        toast.error(message);
    }

    handleUncaughtError(event) {
        logger.error('Uncaught Exception:', event.error);
        // Não mostramos toast pra tudo pra não assustar o usuário, a menos que seja crítico
    }

    handlePromiseRejection(event) {
        logger.error('Unhandled Promise Rejection:', event.reason);
    }
}

export const errorHandler = new ErrorHandler();
