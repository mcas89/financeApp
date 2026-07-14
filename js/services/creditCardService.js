import { transactionService } from './transactionService.js';
import { walletService } from './walletService.js';
import { logger } from '../core/logger.js';

class CreditCardService {
    
    /**
     * Calcula a Fatura Aberta e o Limite Disponível de um Cartão de Crédito.
     * Retorna { openInvoice, availableLimit, totalLimit, progressPercentage }
     */
    async getCardSummary(walletId) {
        try {
            const wallets = await walletService.getWallets();
            const card = wallets.find(w => w.id === walletId && w.type === 'credit_card');
            
            if (!card) throw new Error("Cartão não encontrado ou tipo inválido.");

            const transactions = await transactionService.getTransactions();
            
            // Consome EXCLUSIVAMENTE o creditEngine
            const { creditEngine } = await import('./creditEngine.js');
            const engineData = creditEngine.processCard(card, transactions);
            const bestDay = creditEngine.getBestPurchaseDay(card);

            // A fatura "atual" (do mês vigente baseada no calendário atual, 
            // ou a primeira fatura aberta se houver atrasos/adiantamentos)
            const now = new Date();
            const currentInvoiceId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
            
            // Pega a fatura do mês atual. Se não tiver, pega a próxima disponível ou zero
            const currentInvoice = engineData.invoices.find(i => i.id === currentInvoiceId) || engineData.invoices[0] || { totalAmount: 0 };

            return {
                cardName: card.name,
                brand: card.brand,
                color: card.color,
                closingDay: card.closingDay,
                dueDay: card.dueDay,
                openInvoice: currentInvoice.totalAmount, // Valor específico da fatura vigente
                availableLimit: engineData.availableLimit,
                totalLimit: engineData.totalLimit,
                progressPercentage: engineData.progressPercentage,
                bestDay,
                currentInvoiceId: currentInvoice.id || currentInvoiceId,
                invoices: engineData.invoices // Expõe todas as faturas para projeções futuras
            };
        } catch (error) {
            logger.error(`Erro ao calcular fatura do cartão ${walletId}`, error);
            // Fallback elegante
            return {
                cardName: "Cartão Desconhecido",
                closingDay: 1, dueDay: 10,
                openInvoice: 0, availableLimit: 0, totalLimit: 0, progressPercentage: 0, bestDay: 1, currentInvoiceId: '', invoices: []
            };
        }
    }
}

export const creditCardService = new CreditCardService();
