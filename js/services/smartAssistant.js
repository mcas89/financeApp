import { eventBus } from '../core/eventBus.js';
import { logger } from '../core/logger.js';

const STORAGE_KEY = 'dividas_smart_habits';

const EDUCATION_MESSAGES = [
    "Pagar a fatura integral evita juros elevados.",
    "Registrar pequenas despesas faz grande diferença no controle financeiro.",
    "Ter uma reserva de emergência reduz o impacto de imprevistos.",
    "Antes de parcelar, verifique o impacto das parcelas nos próximos meses.",
    "Separar gastos fixos dos variáveis facilita o planejamento.",
    "Uma pequena economia recorrente costuma gerar mais resultado do que cortes radicais.",
    "Revise assinaturas pouco utilizadas. Pequenos valores mensais podem representar uma grande economia.",
    "O primeiro passo para investir é não ter dívidas ruins.",
    "Evite usar o cheque especial, ele é uma das linhas de crédito mais caras.",
    "Comprar por impulso pode comprometer o orçamento do mês inteiro."
];

const MOTIVATION_MESSAGES = [
    "Cada lançamento registrado é um passo para uma vida financeira mais organizada.",
    "Pequenos hábitos financeiros consistentes geram grandes resultados.",
    "Organizar o dinheiro também reduz o estresse do dia a dia.",
    "Seu futuro financeiro é construído pelas decisões de hoje.",
    "Você está no controle das suas finanças.",
    "Continue assim. A disciplina costuma valer mais do que a perfeição.",
    "O sucesso financeiro é 80% comportamento e 20% conhecimento.",
    "Você está no caminho certo para a independência financeira.",
    "Parabéns! Este mês você está controlando muito bem suas finanças."
];

class SmartAssistant {
    constructor() {
        this.habits = this._loadHabits();
        this._initListener();
    }

    _loadHabits() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : { messageIndex: 0 };
        } catch(e) {
            logger.error("Erro ao carregar hábitos", e);
            return { messageIndex: 0 };
        }
    }

    _saveHabits() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.habits));
        } catch(e) {
            logger.error("Erro ao salvar hábitos", e);
        }
    }

    _initListener() {
        eventBus.on('transaction_added', (tx) => {
            if (!tx || tx.deleted) return;
            
            this.habits.lastTransactionDate = new Date().toISOString();
            if (tx.categoryId) this.habits.lastCategory = tx.categoryId;
            if (tx.walletId) this.habits.lastWallet = tx.walletId;
            if (tx.amount) this.habits.lastAmount = tx.amount;
            
            if (tx.description) {
                const key = tx.description.toLowerCase().trim();
                this.habits.lastDescription = key;
                
                if (!this.habits.categories) this.habits.categories = {};
                if (!this.habits.categories[tx.categoryId]) this.habits.categories[tx.categoryId] = 0;
                this.habits.categories[tx.categoryId] += tx.amount;
            }
            this._saveHabits();
        });
    }

    _createInsight(id, priority, icon, colorHex, title, message, action = null) {
        return {
            id,
            priority,
            icon,
            color: colorHex, 
            title,
            message,
            action,
            dismissible: true,
            expiresAt: null
        };
    }

    async getInsights(transactions = [], wallets = [], vaults = [], summary = { income: 0, expense: 0, balance: 0 }) {
        let insights = [];
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        
        let userName = '';
        try {
            const nameEl = document.getElementById('user-name');
            if (nameEl && nameEl.textContent && nameEl.textContent.trim().length > 0) {
                userName = nameEl.textContent.trim().split(' ')[0];
            }
        } catch(e) {}
        
        const greetingOi = userName ? `Oi ${userName}, ` : `Olá! `;
        const greetingEi = userName ? `Ei ${userName}, ` : `Ei! `;
        const nameComma = userName ? `${userName}, ` : ``;
        const userNameCall = userName ? userName : `você`;
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        const nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);
        const nextWeekStr = nextWeek.toISOString().split('T')[0];

        // 1. Contas (Bills)
        const pendingTxs = transactions.filter(t => t.status === 'pending');
        let hasUpcomingBills = false;

        pendingTxs.forEach(tx => {
            if (tx.date < todayStr) {
                insights.push(this._createInsight(
                    `overdue-${tx.id}`, 'critical', 'fa-exclamation-circle', '#ef4444',
                    'Conta Vencida',
                    `${greetingOi}percebi que a conta de "${tx.description || 'Desconhecida'}" venceu e ainda não foi baixada.`
                ));
            } else if (tx.date === todayStr) {
                hasUpcomingBills = true;
                insights.push(this._createInsight(
                    `today-${tx.id}`, 'attention', 'fa-bell', '#f59e0b',
                    'Vence Hoje',
                    `${greetingEi}não se esqueça: a conta de "${tx.description || 'Desconhecida'}" vence hoje!`
                ));
            } else if (tx.date === tomorrowStr) {
                hasUpcomingBills = true;
                insights.push(this._createInsight(
                    `tomorrow-${tx.id}`, 'attention', 'fa-calendar-day', '#f59e0b',
                    'Vence Amanhã',
                    `${nameComma}já se preparou? Amanhã vence a conta de "${tx.description || 'Desconhecida'}".`
                ));
            } else if (tx.date <= nextWeekStr) {
                hasUpcomingBills = true;
            }
        });

        if (!hasUpcomingBills && pendingTxs.length > 0) {
            const overdue = pendingTxs.some(t => t.date < todayStr);
            if (!overdue) {
                insights.push(this._createInsight(
                    'quiet-week', 'opportunity', 'fa-check-circle', '#3b82f6',
                    'Semana tranquila',
                    `Boas notícias! Nenhuma conta vence nos próximos sete dias.`
                ));
            }
        }

        // 2. Cartões de Crédito (Credit Cards)
        const creditCards = wallets.filter(w => w.type === 'credit_card');
        creditCards.forEach(card => {
            const closingDay = parseInt(card.closingDay) || 1;
            let bestDay = closingDay + 1;
            if (bestDay > 30) bestDay = 1;
            
            if (today.getDate() === bestDay) {
                insights.push(this._createInsight(
                    `best-day-${card.id}`, 'opportunity', 'fa-credit-card', '#3b82f6',
                    'Oportunidade',
                    `Dica de ouro${userName ? ', ' + userName : ''}: Hoje é o melhor dia para comprar no cartão ${card.name}!`
                ));
            }
        });

        // 3. Saúde Financeira (Financial Health)
        if (summary.expense > summary.income && summary.income > 0) {
            insights.push(this._createInsight(
                'overspending', 'attention', 'fa-chart-area', '#f59e0b',
                'Atenção aos Gastos',
                `Cuidado, ${userNameCall}! Neste mês você já gastou mais do que recebeu. Revise os gastos.`
            ));
        }

        // 4. Cofres (Vaults)
        if (vaults && vaults.length > 0) {
            vaults.forEach(vault => {
                const progress = vault.goal > 0 ? (vault.balance / vault.goal) * 100 : 0;
                if (progress >= 100) {
                    insights.push(this._createInsight(
                        `vault-done-${vault.id}`, 'opportunity', 'fa-trophy', '#3b82f6',
                        'Meta Concluída',
                        `Sensacional, ${userNameCall}! Você atingiu 100% da meta do seu cofre "${vault.name}"!`
                    ));
                } else if (progress >= 80) {
                    insights.push(this._createInsight(
                        `vault-near-${vault.id}`, 'opportunity', 'fa-bullseye', '#3b82f6',
                        'Meta Próxima',
                        `Falta pouco, ${userNameCall}! Seu cofre "${vault.name}" já atingiu ${Math.floor(progress)}% da meta.`
                    ));
                }
            });
        }

        // 5. Hábitos (Habits)
        const lastTxDateStr = this.habits.lastTransactionDate;
        if (lastTxDateStr) {
            const lastTxDate = new Date(lastTxDateStr);
            const daysSince = Math.floor((today - lastTxDate) / (1000 * 60 * 60 * 24));
            if (daysSince >= 3) {
                insights.push(this._createInsight(
                    'no-logs', 'attention', 'fa-edit', '#f59e0b',
                    'Poucos Registros',
                    `${greetingOi}faz alguns dias que você não registra movimentações. Mantenha seus relatórios atualizados.`
                ));
            }
        }

        this.habits.messageIndex = this.habits.messageIndex || 0;
        const eduMsg = EDUCATION_MESSAGES[this.habits.messageIndex % EDUCATION_MESSAGES.length];
        insights.push(this._createInsight(
            'edu-tip', 'education', 'fa-lightbulb', '#10b981',
            'Dica Financeira',
            eduMsg
        ));

        const motMsg = MOTIVATION_MESSAGES[(this.habits.messageIndex + 1) % MOTIVATION_MESSAGES.length];
        insights.push(this._createInsight(
            'mot-tip', 'motivation', 'fa-star', '#8b5cf6',
            'Carol AI',
            `${nameComma}${motMsg}`
        ));
        
        this.habits.messageIndex = (this.habits.messageIndex + 1) % 1000;
        this._saveHabits();

        const priorityOrder = { 'critical': 1, 'attention': 2, 'opportunity': 3, 'education': 4, 'motivation': 5 };
        insights.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        return insights;
    }
}

export const smartAssistant = new SmartAssistant();
