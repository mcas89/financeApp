import { transactionService } from './transactionService.js';
import { walletService } from './walletService.js';
import { vaultService } from './vaultService.js';
import { creditEngine } from './creditEngine.js';
import { eventBus } from '../core/eventBus.js';
import { logger } from '../core/logger.js';

class NotificationService {
    constructor() {
        this.notifications = [];
        this.STORAGE_KEY = 'financeapp_notifications_state';
    }

    _getLocalState() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : { readIds: [], deletedIds: [] };
        } catch (e) {
            return { readIds: [], deletedIds: [] };
        }
    }

    _saveLocalState(state) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
    }

    async generateSmartNotifications() {
        try {
            const [transactions, wallets, vaults] = await Promise.all([
                transactionService.getTransactions(),
                walletService.getWallets(),
                vaultService.getVaults()
            ]);

            const generated = [];
            const todayDate = new Date();
            const todayStr = todayDate.toISOString().split('T')[0];
            const tomorrowDate = new Date(todayDate);
            tomorrowDate.setDate(tomorrowDate.getDate() + 1);
            const tomorrowStr = tomorrowDate.toISOString().split('T')[0];

            // 1. Contas vencidas e a vencer
            const expenses = transactions.filter(t => t.type === 'expense');
            expenses.forEach(tx => {
                if (!tx.date) return;
                
                // Ignorar despesas atreladas a cartões de crédito (fatura já lida com elas)
                const wallet = wallets.find(w => w.id === tx.walletId);
                if (wallet?.type === 'credit_card') return; 
                
                // Ignorar contas já pagas!
                if (tx.status === 'paid') return;

                if (tx.date < todayStr || tx.date === todayStr) {
                    generated.push({
                        id: `overdue_${tx.id}`,
                        type: 'overdue',
                        title: 'Conta vencida',
                        message: `Atenção: "${tx.description}" venceu ou vence hoje.`,
                        color: 'var(--error)',
                        icon: 'fa-exclamation-circle',
                        timestamp: tx.date
                    });
                } else if (tx.date === tomorrowStr) {
                    generated.push({
                        id: `due_tomorrow_${tx.id}`,
                        type: 'due_tomorrow',
                        title: 'Vence amanhã',
                        message: `Prepare-se: "${tx.description}" vence amanhã.`,
                        color: '#f59e0b', // laranja
                        icon: 'fa-clock',
                        timestamp: tx.date
                    });
                }
            });

            // 2. Receita Recebida
            const incomes = transactions.filter(t => t.type === 'income');
            incomes.forEach(tx => {
                // Se a receita foi logada hoje ou ontem
                if (tx.date === todayStr || tx.date === tomorrowStr) { 
                    generated.push({
                        id: `income_${tx.id}`,
                        type: 'income',
                        title: 'Receita recebida',
                        message: `Oba! Recebemos "${tx.description}" de R$ ${tx.amount.toFixed(2)}.`,
                        color: '#3b82f6', // azul
                        icon: 'fa-arrow-down',
                        timestamp: tx.date
                    });
                }
            });

            // 3. Cartões: Melhor dia e Fechando
            const cards = wallets.filter(w => w.type === 'credit_card');
            cards.forEach(card => {
                const bestDay = creditEngine.getBestPurchaseDay(card);
                const currentDay = todayDate.getDate();
                
                if (currentDay === bestDay) {
                    generated.push({
                        id: `best_day_${card.id}_${todayStr}`,
                        type: 'best_day',
                        title: 'Melhor dia para comprar',
                        message: `Hoje é o melhor dia para comprar no cartão "${card.name}".`,
                        color: '#10b981', // verde
                        icon: 'fa-calendar-check',
                        timestamp: todayStr
                    });
                }

                // Cartão fechando (2, 1 ou 0 dias para o closingDay)
                const closingDay = parseInt(card.closingDay);
                if (!isNaN(closingDay)) {
                    const diff = closingDay - currentDay;
                    if (diff === 1 || diff === 2 || diff === 0) {
                        generated.push({
                            id: `closing_${card.id}_${todayStr}`,
                            type: 'card_closing',
                            title: 'Cartão fechando',
                            message: `O cartão "${card.name}" fecha em breve (dia ${closingDay}).`,
                            color: '#eab308', // amarelo
                            icon: 'fa-credit-card',
                            timestamp: todayStr
                        });
                    }
                }
            });

            // 4. Metas do Cofre Alcançadas
            vaults.forEach(vault => {
                if (vault.targetAmount > 0 && vault.currentBalance >= vault.targetAmount) {
                    generated.push({
                        id: `vault_goal_${vault.id}_${vault.currentBalance}`,
                        type: 'vault_goal',
                        title: 'Meta do cofre alcançada',
                        message: `Parabéns! O cofre "${vault.name}" atingiu a meta.`,
                        color: '#a855f7', // roxo
                        icon: 'fa-trophy',
                        timestamp: todayStr
                    });
                }
            });

            // System Update genérico (simulação de novidade)
            generated.push({
                id: `system_update_v1`,
                type: 'system',
                title: 'Atualizações',
                message: `Novo Motor de Faturas ativado. Suas compras parceladas agora são inteligentes!`,
                color: 'var(--text-secondary)', // branco/cinza
                icon: 'fa-info-circle',
                timestamp: todayStr
            });

            // Aplicar o state local para isRead e deletados
            const localState = this._getLocalState();
            
            this.notifications = generated
                .filter(n => !localState.deletedIds.includes(n.id))
                .map(n => ({
                    ...n,
                    isRead: localState.readIds.includes(n.id)
                }))
                // Ordenar por prioridade simples (não lidos e mais urgentes primeiro)
                .sort((a, b) => {
                    if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
                    const aUrgency = a.type === 'overdue' ? 10 : a.type === 'due_tomorrow' ? 9 : 5;
                    const bUrgency = b.type === 'overdue' ? 10 : b.type === 'due_tomorrow' ? 9 : 5;
                    return bUrgency - aUrgency; 
                });

            logger.debug(`[Notificações] Geradas ${this.notifications.length} notificações.`);
            eventBus.emit('notifications_updated', this.notifications);
            
            return this.notifications;
        } catch (e) {
            logger.error("Erro ao gerar notificações inteligentes", e);
            return [];
        }
    }

    getNotifications() {
        return this.notifications;
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.isRead).length;
    }

    markAsRead(id) {
        const localState = this._getLocalState();
        if (!localState.readIds.includes(id)) {
            localState.readIds.push(id);
            this._saveLocalState(localState);
        }
        
        const notif = this.notifications.find(n => n.id === id);
        if (notif) notif.isRead = true;
        
        eventBus.emit('notifications_updated', this.notifications);
    }

    deleteNotification(id) {
        const localState = this._getLocalState();
        if (!localState.deletedIds.includes(id)) {
            localState.deletedIds.push(id);
            this._saveLocalState(localState);
        }
        
        this.notifications = this.notifications.filter(n => n.id !== id);
        eventBus.emit('notifications_updated', this.notifications);
    }

    markAllAsRead() {
        const localState = this._getLocalState();
        this.notifications.forEach(n => {
            if (!localState.readIds.includes(n.id)) {
                localState.readIds.push(n.id);
            }
            n.isRead = true;
        });
        this._saveLocalState(localState);
        eventBus.emit('notifications_updated', this.notifications);
    }
}

export const notificationService = new NotificationService();
