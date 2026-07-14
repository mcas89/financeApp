/**
 * Router Principal do SPA
 * Gerencia o History API e a injeção de HTML no DOM.
 */
import { authService } from '../services/authService.js';
import { state } from './state.js';

class Router {
    constructor() {
        this.routes = {};
        this.rootElement = document.getElementById('app-root');
        
        // Intercepta cliques em links para evitar reload da página
        window.addEventListener('click', (e) => {
            if (e.target.matches('[data-link]')) {
                e.preventDefault();
                this.navigateTo(e.target.getAttribute('href'));
            } else if (e.target.closest('[data-link]')) {
                e.preventDefault();
                this.navigateTo(e.target.closest('[data-link]').getAttribute('href'));
            }
        });

        // Lida com mudanças na URL (botão Voltar/Avançar ou nova rota)
        window.addEventListener('hashchange', () => {
            this.handleRoute();
        });
    }

    /**
     * Registra uma nova rota no sistema.
     * @param {string} path - Caminho da URL (ex: '/dashboard')
     * @param {object} viewConfig - Configuração da view { template: string, init: function, isProtected: boolean }
     */
    addRoute(path, viewConfig) {
        this.routes[path] = viewConfig;
    }

    /**
     * Adiciona múltiplas rotas de um submódulo.
     * @param {object} routeModule - Objeto com rotas mapeadas (ex: authRoutes)
     */
    registerModule(routeModule) {
        Object.keys(routeModule).forEach(path => {
            this.addRoute(path, routeModule[path]);
        });
    }

    /**
     * Altera a URL e carrega a nova rota.
     * @param {string} url - Nova URL
     */
    navigateTo(url) {
        if (window.location.hash.slice(1) === url) {
            // Já estamos na rota, force handleRoute se necessário, mas normalmente não precisa
            this.handleRoute();
        } else {
            window.location.hash = url; // Isso dispara o 'hashchange' automaticamente
        }
    }

    /**
     * Renderiza a rota atual.
     * Valida permissões e baixa o template HTML correspondente.
     */
    async handleRoute() {
        // Pega o caminho do hash (ex: '#/dashboard' -> '/dashboard') ou define '/'
        let path = window.location.hash.slice(1) || '/';
        
        // Remove parâmetros de query se houver (opcional)
        path = path.split('?')[0];

        if (!this.routes[path]) {
            path = '/'; // Fallback para root
        }

        const route = this.routes[path];

        // Aguarda a resolução da sessão do Firebase antes de avaliar
        await authService.checkSession();
        const isAuthenticated = authService.isAuthenticated();
        const activeWorkspace = state.get('activeWorkspaceId');

        // Proteção de Rota
        if (route.isProtected) {
            if (!isAuthenticated) {
                console.warn("Usuário não autenticado. Redirecionando para login.");
                this.navigateTo('/login');
                return;
            }
            if (!activeWorkspace) {
                console.warn("Usuário sem workspace ativo. Redirecionando para login.");
                await authService.logout();
                this.navigateTo('/login');
                return;
            }
        }

        // Se estiver logado e tentar acessar login, vai pro dashboard
        if (path === '/login' && isAuthenticated && activeWorkspace) {
            this.navigateTo('/dashboard');
            return;
        }

        try {
            // Busca o HTML da página usando Fetch API
            const response = await fetch(route.templateUrl);
            if (!response.ok) throw new Error('Template não encontrado');
            const html = await response.text();
            
            // Injeta no DOM
            this.rootElement.innerHTML = html;
            
            // Executa a função de inicialização específica desta view (se existir)
            if (typeof route.init === 'function') {
                route.init();
            }
        } catch (error) {
            console.error("Erro ao carregar a rota:", error);
            this.rootElement.innerHTML = `<h2>Erro ao carregar a página</h2>`;
        }
    }
}

// Exporta uma instância única (Singleton)
export const router = new Router();
