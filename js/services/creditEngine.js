import { logger } from '../core/logger.js';

class CreditEngine {
    
    /**
     * Identifica em qual fatura (Mês de Vencimento) uma compra vai cair.
     * @param {Date} purchaseDate Data da compra
     * @param {Object} cardConfig { closingDay, dueDay, closingRule }
     * @returns {Date} Uma data representando o dia do Vencimento dessa compra.
     */
    getFirstDueDate(purchaseDateStr, cardConfig) {
        const purchaseDate = new Date(purchaseDateStr + 'T12:00:00'); // Force midday to avoid timezone shifts
        let pYear = purchaseDate.getFullYear();
        let pMonth = purchaseDate.getMonth(); // 0-11
        const pDay = purchaseDate.getDate();

        const closingDay = parseInt(cardConfig.closingDay) || 1;
        const dueDay = parseInt(cardConfig.dueDay) || 10;
        const closingRule = cardConfig.closingRule || 'next'; // 'current' or 'next'

        let closesNextMonth = false;

        // Se o dia da compra passou do fechamento, cai pro próximo ciclo.
        if (pDay > closingDay) {
            closesNextMonth = true;
        } else if (pDay === closingDay && closingRule === 'next') {
            // Regra do banco: comprou no dia do fechamento, cai no próximo.
            closesNextMonth = true;
        }

        // Mês em que a fatura FECHA
        let closingMonth = pMonth + (closesNextMonth ? 1 : 0);
        let closingYear = pYear;
        if (closingMonth > 11) {
            closingMonth = 0;
            closingYear++;
        }

        // Mês em que a fatura VENCE
        // Se o vencimento é MENOR que o fechamento, vira o mês.
        // Ex: Fecha dia 25, Vence dia 5 -> Vence no mês seguinte ao fechamento.
        // Se Fecha dia 10, Vence dia 15 -> Vence no mesmo mês do fechamento.
        let dueMonth = closingMonth;
        let dueYear = closingYear;

        if (dueDay < closingDay) {
            dueMonth++;
            if (dueMonth > 11) {
                dueMonth = 0;
                dueYear++;
            }
        }

        return new Date(dueYear, dueMonth, dueDay, 12, 0, 0);
    }

    /**
     * Pega uma transação real (do banco) e a expande em N parcelas dinâmicas.
     */
    expandTransaction(tx, cardConfig) {
        if (tx.type !== 'expense' && tx.type !== 'income') return [];
        if (!tx.installments || tx.installments <= 1) {
            // Transação à vista
            const dueDate = this.getFirstDueDate(tx.date, cardConfig);
            return [{
                ...tx,
                installmentNumber: 1,
                installmentCount: 1,
                parentId: tx.id,
                realDate: tx.date, // Data da compra
                date: dueDate.toISOString().split('T')[0], // Data em que afeta o fluxo de caixa (vencimento)
                invoiceId: `${dueDate.getFullYear()}-${String(dueDate.getMonth() + 1).padStart(2, '0')}`
            }];
        }

        // Transação Parcelada
        const installments = parseInt(tx.installments);
        const installmentValue = tx.amount / installments;
        const results = [];

        let currentDueDate = this.getFirstDueDate(tx.date, cardConfig);

        const paidInst = tx.paidInstallments || [];

        for (let i = 1; i <= installments; i++) {
            results.push({
                ...tx,
                id: `${tx.id}_${i}`,
                parentId: tx.id,
                amount: installmentValue,
                description: `${tx.description} (${i}/${installments})`,
                installmentNumber: i,
                installmentCount: installments,
                realDate: tx.date,
                date: currentDueDate.toISOString().split('T')[0],
                invoiceId: `${currentDueDate.getFullYear()}-${String(currentDueDate.getMonth() + 1).padStart(2, '0')}`,
                isAnticipated: paidInst.includes(i)
            });

            // Adiciona 1 mês para a próxima parcela
            currentDueDate.setMonth(currentDueDate.getMonth() + 1);
        }

        return results;
    }

    /**
     * Processa TODAS as transações de um cartão e gera as faturas.
     * Retorna { invoices, availableLimit, usedLimit }
     */
    processCard(cardConfig, allTransactions) {
        const invoicesMap = {};
        let usedLimit = 0;

        // Filtra transações que pertencem a este cartão
        const cardTxs = allTransactions.filter(t => t.walletId === cardConfig.id);

        cardTxs.forEach(tx => {
            // Se for pagamento de fatura (income), abate no limite usado.
            if (tx.categoryId === 'C-PAYMENT') {
                usedLimit -= tx.amount;

                const parts = tx.description.split(' ');
                const targetInvoiceId = parts[parts.length - 1]; // Ex: "2026-08"

                if (/^\d{4}-\d{2}$/.test(targetInvoiceId)) {
                    if (!invoicesMap[targetInvoiceId]) {
                        invoicesMap[targetInvoiceId] = {
                            id: targetInvoiceId,
                            monthYear: targetInvoiceId,
                            dueDate: tx.date,
                            totalAmount: 0,
                            items: [],
                            status: 'open'
                        };
                    }
                    invoicesMap[targetInvoiceId].items.push(tx);
                    invoicesMap[targetInvoiceId].totalAmount -= tx.amount;
                }
                return; // Pagamento já foi processado para o mês específico
            }

            // Despesas "prendem" o limite total da compra no ato.
            if (tx.type === 'expense' && tx.status !== 'deleted') {
                 usedLimit += tx.amount;
            }

            // Expande em parcelas virtuais para jogar nas faturas
            const expanded = this.expandTransaction(tx, cardConfig);
            
            expanded.forEach(item => {
                const invId = item.invoiceId; // ex: "2026-08"
                if (!invoicesMap[invId]) {
                    invoicesMap[invId] = {
                        id: invId,
                        monthYear: invId,
                        dueDate: item.date, // Pega o date que já é o due date
                        totalAmount: 0,
                        items: [],
                        status: 'open' // pode ser processado depois se já foi pago
                    };
                }

                invoicesMap[invId].items.push(item);
                if (!item.isAnticipated) {
                    if (item.type === 'expense') invoicesMap[invId].totalAmount += item.amount;
                    if (item.type === 'income') invoicesMap[invId].totalAmount -= item.amount;
                }
            });
        });

        // Garantir que não fica negativo
        if (usedLimit < 0) usedLimit = 0;

        const totalLimit = parseFloat(cardConfig.creditLimit) || 0;
        let availableLimit = totalLimit - usedLimit;
        if (availableLimit < 0) availableLimit = 0;

        // Transforma mapa em Array ordenado por data
        const invoices = Object.values(invoicesMap).sort((a, b) => a.id.localeCompare(b.id));

        return {
            totalLimit,
            usedLimit,
            availableLimit,
            invoices,
            progressPercentage: totalLimit > 0 ? Math.min((usedLimit / totalLimit) * 100, 100) : 0
        };
    }

    getBestPurchaseDay(cardConfig) {
        let bestDay = parseInt(cardConfig.closingDay) + 1;
        if (bestDay > 30) bestDay = 1; // Simplificação para calendários
        return bestDay;
    }

    /**
     * Simula o impacto de uma compra.
     */
    simulatePurchase(cardConfig, currentUsedLimit, amount, installments, purchaseDateStr) {
        const txMock = {
            id: 'SIMULATED',
            walletId: cardConfig.id,
            type: 'expense',
            amount: parseFloat(amount),
            installments: parseInt(installments) || 1,
            date: purchaseDateStr,
            description: 'Simulação'
        };

        const expanded = this.expandTransaction(txMock, cardConfig);
        
        const newUsedLimit = currentUsedLimit + parseFloat(amount);
        const totalLimit = parseFloat(cardConfig.creditLimit) || 0;
        const newProgress = totalLimit > 0 ? Math.min((newUsedLimit / totalLimit) * 100, 100) : 0;

        // Agrupa simulação por fatura
        const invoiceImpact = {};
        expanded.forEach(e => {
            if(!invoiceImpact[e.invoiceId]) invoiceImpact[e.invoiceId] = 0;
            invoiceImpact[e.invoiceId] += e.amount;
        });

        return {
            newUsedLimit,
            newProgress,
            invoiceImpact // ex: { "2026-08": 120, "2026-09": 120 }
        };
    }
}

export const creditEngine = new CreditEngine();
