import { transactionService } from './transactionService.js';
import { categoryService } from './categoryService.js';
import { logger } from '../core/logger.js';

class ReportService {
    
    async export(monthStr, format) {
        // monthStr ex: '2026-07'
        const [year, month] = monthStr.split('-');
        
        try {
            const [allTxs, categories] = await Promise.all([
                transactionService.getTransactions(),
                categoryService.getCategories()
            ]);
            
            // Filtra as transações pelo mês e ano escolhidos
            const filteredTxs = allTxs.filter(tx => {
                const date = new Date(tx.date);
                return date.getFullYear() === parseInt(year) && (date.getMonth() + 1) === parseInt(month);
            }).sort((a, b) => new Date(b.date) - new Date(a.date));

            if (filteredTxs.length === 0) {
                throw new Error('Nenhuma transação encontrada neste período.');
            }

            if (format === 'csv') {
                this._generateCSV(filteredTxs, categories, monthStr);
            } else if (format === 'pdf') {
                this._generatePDF(filteredTxs, categories, monthStr);
            }

            return true;
        } catch (error) {
            logger.error("Erro ao exportar", error);
            throw error;
        }
    }

    _generateCSV(transactions, categories, monthStr) {
        // Cabeçalho do CSV
        let csvContent = "Data,Descricao,Categoria,Tipo,Valor,Status\n";

        transactions.forEach(tx => {
            const date = new Date(tx.date).toLocaleDateString('pt-BR');
            const desc = `"${tx.description.replace(/"/g, '""')}"`; // Escapa aspas para Excel
            
            const catObj = categories.find(c => c.id === tx.categoryId);
            const cat = `"${catObj ? catObj.name : 'Outros'}"`;
            
            const type = tx.type === 'income' ? 'Receita' : 'Despesa';
            const val = parseFloat(tx.amount).toFixed(2).replace('.', ',');
            const status = tx.status === 'paid' ? 'Pago' : 'Pendente';
            
            csvContent += `${date},${desc},${cat},${type},${val},${status}\n`;
        });

        // Forçar BOM para o Excel abrir com caracteres (acentos) corretos no Windows
        const blob = new Blob(["\ufeff", csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `relatorio_dividas_marcos_${monthStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    _generatePDF(transactions, categories, monthStr) {
        const printArea = document.getElementById('print-area');
        if (!printArea) return;

        let totalIncome = 0;
        let totalExpense = 0;

        let rows = '';
        transactions.forEach(tx => {
            const isIncome = tx.type === 'income';
            if (tx.status === 'paid') {
                if (isIncome) totalIncome += parseFloat(tx.amount);
                else totalExpense += parseFloat(tx.amount);
            }

            const date = new Date(tx.date).toLocaleDateString('pt-BR');
            const valClass = isIncome ? 'income-text' : 'expense-text';
            const valFormatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount);
            
            const catObj = categories.find(c => c.id === tx.categoryId);
            const catName = catObj ? catObj.name : 'Outros';

            rows += `
                <tr>
                    <td>${date}</td>
                    <td>${tx.description}</td>
                    <td>${catName}</td>
                    <td>${tx.status === 'paid' ? 'Pago' : 'Pendente'}</td>
                    <td class="${valClass}" style="text-align: right;">${isIncome ? '+' : '-'}${valFormatted}</td>
                </tr>
            `;
        });

        const balance = totalIncome - totalExpense;
        const formatBRL = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h1 style="text-align: center; color: #8b5cf6; margin-bottom: 5px;">Dívidas Marcos</h1>
                <p style="text-align: center; color: #666; margin-top: 0;">Relatório Financeiro: ${monthStr}</p>
                
                <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                    <div>
                        <span style="display:block; font-size:12px; color:#64748b;">Receitas</span>
                        <strong style="color: #16a34a; font-size:18px;">${formatBRL(totalIncome)}</strong>
                    </div>
                    <div>
                        <span style="display:block; font-size:12px; color:#64748b;">Despesas</span>
                        <strong style="color: #dc2626; font-size:18px;">${formatBRL(totalExpense)}</strong>
                    </div>
                    <div style="text-align: right;">
                        <span style="display:block; font-size:12px; color:#64748b;">Saldo</span>
                        <strong style="font-size:18px; color: ${balance >= 0 ? '#16a34a' : '#dc2626'}">${formatBRL(balance)}</strong>
                    </div>
                </div>

                <table class="print-table">
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Descrição</th>
                            <th>Categoria</th>
                            <th>Status</th>
                            <th style="text-align: right;">Valor</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;

        printArea.innerHTML = html;
        printArea.style.display = 'block';

        // Aciona a impressão nativa do navegador
        window.print();

        // Oculta após a impressão
        setTimeout(() => {
            printArea.style.display = 'none';
        }, 1000);
    }
}

export const reportService = new ReportService();
