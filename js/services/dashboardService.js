import { logger } from '../core/logger.js';
import { walletService } from './walletService.js';
import { transactionService } from './transactionService.js';

class DashboardService {
    async getSummary(monthFilter = 'current') {
        try {
            // Simula um atraso de rede para vermos o Skeleton Loading (requisito da FASE 6)
            const [wallets, transactions] = await Promise.all([
                walletService.getWallets(),
                transactionService.getTransactions()
            ]);

            let balance = 0;
            let income = 0;
            let expense = 0;
            let creditInvoice = 0;
            
            // Variáveis para projeção futura
            let pendingIncome = 0;
            let pendingExpense = 0;

            const currMonth = new Date().getMonth();
            const currYear = new Date().getFullYear();

            // Saldo e faturas vêm das wallets (ignoram filtro temporal, representam o agora)
            const { creditEngine } = await import('./creditEngine.js');
            
            for (const w of wallets) {
                if (w.type === 'credit_card') {
                    const engineData = creditEngine.processCard(w, transactions);
                    // A fatura "atual" (do mês vigente)
                    const now = new Date();
                    const currentInvoiceId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    const currentInvoice = engineData.invoices.find(i => i.id === currentInvoiceId) || engineData.invoices[0] || { totalAmount: 0 };
                    
                    creditInvoice += currentInvoice.totalAmount;
                } else {
                    balance += parseFloat(w.currentBalance) || 0;
                }
            }

            // Gastos e Receitas usam o filtro de mês
            transactions.forEach(tx => {
                const txDate = new Date(tx.date);
                if (monthFilter === 'current') {
                    if (txDate.getMonth() !== currMonth || txDate.getFullYear() !== currYear) {
                        return; // Pula transações fora do mês
                    }
                }

                // Check se é de cartão
                const isCard = wallets.find(w => w.id === tx.walletId)?.type === 'credit_card';

                if (tx.status === 'paid') {
                    if (tx.type === 'income') {
                        if (!isCard) income += tx.amount; // Apenas receitas que caem na conta corrente
                    } else if (tx.type === 'expense') {
                        if (!isCard) {
                            expense += tx.amount; // Despesa de conta
                        }
                    }
                } else if (tx.status === 'pending') {
                    // Soma valores previstos para cálculo do saldo futuro (somente deste mês)
                    if (tx.type === 'income') {
                        pendingIncome += tx.amount;
                    } else if (tx.type === 'expense') {
                        if (!isCard) { // Se for no cartão, a fatura já contabiliza
                            pendingExpense += tx.amount;
                        }
                    }
                }
            });

            // Saldo Previsto = Saldo Atual + Entradas Previstas - Saídas Previstas - Faturas do Cartão Previstas/Abertas
            const predictedBalance = balance + pendingIncome - pendingExpense - creditInvoice;

            return { balance, income, expense, creditInvoice, predictedBalance };
        } catch (error) {
            logger.error("Erro ao gerar resumo do Dashboard", error);
            throw error;
        }
    }
}

export const dashboardService = new DashboardService();
