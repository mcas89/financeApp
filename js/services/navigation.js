import { router } from '../core/router.js';
import { analytics } from './analytics.js';

/**
 * Serviço de Navegação
 * Abstrai a manipulação direta do Router.
 */
class NavigationService {
    go(path) {
        analytics.trackScreenView(path);
        router.navigateTo(path);
    }

    back() {
        window.history.back();
    }

    replace(path) {
        // Altera o hash silenciosamente sem adicionar no histórico (ideal pra redirects)
        window.location.replace(`#${path}`);
        router.handleRoute();
    }

    modal(htmlContent) {
        // Implementação futura de Modais flutuantes globais via URL (ex: #/modal/add)
        console.warn("Modal navigation not fully implemented yet");
    }
}

export const navigation = new NavigationService();
