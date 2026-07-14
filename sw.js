const CACHE_NAME = 'dc-app-cache-v1';

// Recursos críticos para carregar o app em modo avião
const urlsToCache = [
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/layout.css',
  './js/app.js',
  './js/config/constants.js',
  './js/config/routes.js',
  './js/core/router.js',
  './js/core/state.js',
  './js/core/eventBus.js',
  './js/core/logger.js',
  './js/infrastructure/cache.js',
  './js/infrastructure/firebase.js',
  './pages/login.html',
  './pages/dashboard.html'
  // Outras páginas são cacheadas sob demanda ou podemos listar tudo aqui
];

// Instalação do Service Worker (Baixa todos os arquivos vitais)
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberto');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Ativação (Limpa caches antigos)
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de Fetch (Network First, fallback para Cache)
// Isso garante que você sempre veja a versão mais atual se tiver net, mas carregue do cache se estiver offline.
self.addEventListener('fetch', event => {
  // Ignora requisições do firebase/firestore para não conflitar com o SDK nativo do firebase offline
  if (event.request.url.includes('firestore.googleapis.com') || event.request.url.includes('identitytoolkit.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Se a requisição foi um sucesso, clona e atualiza o cache
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        var responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        // Se a rede falhar (Offline), busca no cache
        return caches.match(event.request);
      })
  );
});
