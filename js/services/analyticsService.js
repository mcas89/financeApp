import { transactionService } from './transactionService.js';
import { categoryService } from './categoryService.js';
import { walletService } from './walletService.js';

class AnalyticsService {
    async getAnalyticsData(filterType = 'current_month') {
        const [txs, cats, wallets] = await Promise.all([
            transactionService.getTransactions(),
            categoryService.getCategories(),
            walletService.getWallets()
        ]);

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        // Formatar datas para YYYY-MM-DD local
        const pad = (n) => n.toString().padStart(2, '0');
        const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
        
        let yesterday = new Date(now);
        yesterday.setDate(now.getDate() - 1);
        const yesterdayStr = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}`;

        // Filter valid paid/received transactions based on filterType
        const filteredTxs = txs.filter(t => {
            if (t.status !== 'paid') return false;
            if (filterType === 'all') return true;

            const d = new Date(t.date);
            const m = d.getMonth();
            const y = d.getFullYear();
            
            if (filterType === 'current_month') {
                return m === currentMonth && y === currentYear;
            }
            if (filterType === 'last_month') {
                let lm = currentMonth - 1;
                let ly = currentYear;
                if (lm < 0) { lm = 11; ly--; }
                return m === lm && y === ly;
            }
            if (filterType === 'last_3_months') {
                const diffMonths = (currentYear - y) * 12 + currentMonth - m;
                return diffMonths >= 0 && diffMonths < 3;
            }
            if (filterType === 'last_6_months') {
                const diffMonths = (currentYear - y) * 12 + currentMonth - m;
                return diffMonths >= 0 && diffMonths < 6;
            }
            if (filterType === 'this_year') {
                return y === currentYear;
            }
            
            return m === currentMonth && y === currentYear; // default
        });

        // KPIs
        let highestExpense = { amount: 0, description: '-' };
        let highestIncome = { amount: 0, description: '-' };
        let totalIncome = 0;
        let totalExpense = 0;
        let todayExpense = 0;
        let yesterdayExpense = 0;

        const categoryTotals = {};
        const walletTotals = {};

        filteredTxs.forEach(t => {
            const amount = parseFloat(t.amount);
            
            if (t.type === 'expense') {
                totalExpense += amount;
                if (amount > highestExpense.amount) highestExpense = { amount, description: t.description };
                
                // For Category Bar Chart
                const catName = cats.find(c => c.id === t.categoryId)?.name || 'Outros';
                categoryTotals[catName] = (categoryTotals[catName] || 0) + amount;

                // For Wallets Chart
                const walletName = wallets.find(w => w.id === t.walletId)?.name || 'Desconhecida';
                walletTotals[walletName] = (walletTotals[walletName] || 0) + amount;

                // DoD
                if (t.date === todayStr) todayExpense += amount;
                if (t.date === yesterdayStr) yesterdayExpense += amount;
            } else if (t.type === 'income') {
                totalIncome += amount;
                if (amount > highestIncome.amount) highestIncome = { amount, description: t.description };
            }
        });

        // Dominant Category
        const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
        const dominantCategory = sortedCats.length > 0 ? sortedCats[0][0] : '-';

        // DoD Calculation
        let dodPct = 0;
        if (yesterdayExpense > 0) {
            dodPct = ((todayExpense - yesterdayExpense) / yesterdayExpense) * 100;
        } else if (todayExpense > 0) {
            dodPct = 100;
        }

        // Evolution (Last 6 months)
        const evolution = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            // Formatar mes "Jan", "Fev" etc manualmente para evitar inconsistencias de locale no browser
            const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
            const key = monthNames[d.getMonth()];
            evolution[key] = { income: 0, expense: 0 };
        }

        txs.forEach(t => {
            if (t.status !== 'paid') return;
            // Parse manual da data para evitar timezones mudando o mes
            const [y, m, d_num] = t.date.split('-');
            const txYear = parseInt(y, 10);
            const txMonth = parseInt(m, 10) - 1;
            
            const diffMonths = (now.getFullYear() - txYear) * 12 + now.getMonth() - txMonth;
            if (diffMonths >= 0 && diffMonths < 6) {
                const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
                const key = monthNames[txMonth];
                if (evolution[key]) {
                    evolution[key][t.type] += parseFloat(t.amount);
                }
            }
        });

        return {
            kpis: {
                totalIncome,
                totalExpense,
                highestExpense,
                highestIncome,
                dominantCategory,
                dodPct,
                todayExpense,
                yesterdayExpense
            },
            charts: {
                categoryTotals,
                walletTotals,
                evolution
            }
        };
    }
}

export const analyticsService = new AnalyticsService();
