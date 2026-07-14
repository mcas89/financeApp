# ADR-00: Princípios e Arquitetura Global

Este documento é a base constitucional de desenvolvimento do FinanceApp. Toda decisão futura de código deve respeitar os princípios estabelecidos aqui.

## 1. Princípios de Design e Produto
- **Mobile First:** Toda UI é desenhada primariamente para telas pequenas. Componentes seguem padrões de toques largos (mínimo 44px).
- **Offline First:** O aplicativo deve sempre abrir. Dados são lidos do Cache e escritas são jogadas na fila de sincronização quando não há internet.
- **Performance acima de tudo:** Nenhuma ação comum deve demorar mais de 300ms. Uso intensivo de Skeleton Loaders, Lazy Loading e virtualização.
- **Zero Retrabalho UI:** Uso de Skeletons e animações suaves ao invés de pular conteúdo na tela (Layout Shift).

## 2. Arquitetura de Software (Clean Architecture + MVC Patterns)
A lógica é estritamente separada da interface.

### Estrutura Definitiva de Pastas:
- `/js/core/`: O cérebro local. Não conhece Firebase. (`app.js`, `eventBus.js`, `state.js`, `logger.js`)
- `/js/infrastructure/`: Camada que conversa com APIs externas e I/O local. (`firebase.js`, `cache.js`, `storage.js`, `connectivity.js`, `syncManager.js`, `errorHandler.js`)
- `/js/config/`: Variáveis estáticas e controle de build. (`app.js`, `constants.js`, `features.js`)
- `/js/services/`: Camada de domínio de negócio que a UI chama. (Ex: `AuthService` chama `firebase.js`)
- `/js/models/`: Estruturas de dados (Classes/Interfaces das entidades financeiras).
- `/js/components/`: Pedaços reutilizáveis de UI (ex: `toast.js`, `bottom-sheet.js`).
- `/js/utils/`: Funções puras utilitárias (ex: `formatters`).

## 3. Convenções e Padrões
- **Proibido Firebase na UI:** Nenhuma tela HTML ou script de rota deve chamar `getFirestore()` ou importar o Firebase diretamente. Todo Firebase fica em `infrastructure/` e é acessado via `services/`.
- **Event-Driven UI:** Componentes devem ouvir o `EventBus` para se atualizar. Por exemplo, quando o usuário muda o tema, emite-se um `THEME_CHANGED`.
- **Single Source of Truth:** O estado do usuário (Sessão, Preferências) mora em `/js/core/state.js`.
- **Tratamento de Erros Humano:** Erros técnicos (ex: HTTP 403, falhas do Firebase) são filtrados pelo `ErrorHandler` antes de chegar à interface de usuário.

---
*Este ADR não pode ser modificado sem aprovação do PO.*
