import { db } from '../infrastructure/firebase.js';
import { logger } from '../core/logger.js';
import { state } from '../core/state.js';
import { eventBus } from '../core/eventBus.js';
import { authService } from './authService.js';
import { toast } from '../components/toast.js';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc, updateDoc, orderBy, query } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class TransactionService {
    async createTransaction(txData) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            
            const currentUser = authService.currentUser;
            const uid = currentUser ? currentUser.uid : 'SYSTEM';
            
            // Base properties
            const baseAmount = parseFloat(txData.amount) || 0;
            const baseDate = txData.date || new Date().toISOString().split('T')[0];
            const isRecurring = txData.isRecurring === true;
            const frequency = txData.frequency || 'monthly';
            const isPaid = txData.isPaid !== false; // default true if not provided
            
            const groupId = isRecurring ? `GRP-${Math.random().toString(36).substr(2, 8).toUpperCase()}` : null;
            
            // Quantas instâncias gerar?
            let occurrences = 1;
            if (isRecurring) {
                if (frequency === 'monthly') occurrences = 12;
                else if (frequency === 'weekly') occurrences = 52;
                else if (frequency === 'yearly') occurrences = 5;
                else occurrences = 12; // fallback
            }

            const createdTxs = [];
            let currentDateObj = new Date(baseDate + "T12:00:00"); // usar meio-dia para evitar fuso horário puxando 1 dia antes

            for (let i = 0; i < occurrences; i++) {
                const txId = `T-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
                
                // Formatar data YYYY-MM-DD
                const txDateStr = currentDateObj.toISOString().split('T')[0];
                
                // Primeira ocorrência pega o isPaid da UI, as próximas sempre serão pending
                const currentStatus = (i === 0 && isPaid) ? 'paid' : 'pending';

                const newTx = {
                    id: txId,
                    type: txData.type,
                    amount: baseAmount,
                    description: isRecurring ? `${txData.description} (${i+1}/${occurrences})` : txData.description,
                    categoryId: txData.categoryId || null,
                    walletId: txData.walletId || null,
                    date: txDateStr,
                    status: currentStatus,
                    groupId: groupId,
                    frequency: isRecurring ? frequency : null,
                    installmentIndex: isRecurring ? i + 1 : null,
                    totalInstallments: isRecurring ? occurrences : null,
                    installments: txData.installments || 1,
                    createdBy: uid,
                    createdAt: new Date().toISOString()
                };

                // Apenas debita o saldo da carteira se já estiver paga
                if (currentStatus === 'paid') {
                    newTx.paymentDate = new Date().toISOString();
                    await this._applyToWalletBalance(workspaceId, newTx.walletId, newTx.amount, newTx.type, false);
                }

                const docRef = doc(db, `workspaces/${workspaceId}/transactions`, txId);
                await setDoc(docRef, newTx);
                createdTxs.push(newTx);

                // Incrementa a data para a próxima iteração
                if (frequency === 'monthly') {
                    currentDateObj.setMonth(currentDateObj.getMonth() + 1);
                } else if (frequency === 'weekly') {
                    currentDateObj.setDate(currentDateObj.getDate() + 7);
                } else if (frequency === 'yearly') {
                    currentDateObj.setFullYear(currentDateObj.getFullYear() + 1);
                }
            }

            logger.debug(`[Firestore] ${createdTxs.length} Transações Salvas.`, createdTxs);

            eventBus.emit('transaction_added', createdTxs[0]);
            return createdTxs[0];
        } catch (error) {
            logger.error("Erro ao salvar Transação", error);
            throw error;
        }
    }

    async markAsPaid(txId, finalAmount = null) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser ? authService.currentUser.uid : 'SYSTEM';

            const docRef = doc(db, `workspaces/${workspaceId}/transactions`, txId);
            const docSnap = await getDoc(docRef);
            
            if(!docSnap.exists()) throw new Error("Transação não encontrada");
            const tx = docSnap.data();

            if (tx.status === 'paid') return tx; // já paga

            const amountToPay = finalAmount !== null ? parseFloat(finalAmount) : tx.amount;

            const updatedTx = { 
                ...tx, 
                amount: amountToPay,
                status: 'paid', 
                paymentDate: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: uid
            };
            
            // Aplica ao saldo
            await this._applyToWalletBalance(workspaceId, updatedTx.walletId, updatedTx.amount, updatedTx.type, false);

            await updateDoc(docRef, updatedTx);
            eventBus.emit('transaction_added', updatedTx); // Trigger UI update
            
            toast.success("Conta marcada como paga!");
            return updatedTx;
        } catch (error) {
            logger.error("Erro ao marcar como pago", error);
            throw error;
        }
    }

    async updateTransaction(txId, newData) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser ? authService.currentUser.uid : 'SYSTEM';

            const docRef = doc(db, `workspaces/${workspaceId}/transactions`, txId);
            const docSnap = await getDoc(docRef);
            
            if(!docSnap.exists()) throw new Error("Transação não encontrada");
            const oldTx = docSnap.data();

            // Reverte saldo antigo
            await this._applyToWalletBalance(workspaceId, oldTx.walletId, oldTx.amount, oldTx.type, true);

            const updatedTx = { ...oldTx, ...newData, updatedAt: new Date().toISOString(), updatedBy: uid };
            
            // Aplica novo saldo
            await this._applyToWalletBalance(workspaceId, updatedTx.walletId, updatedTx.amount, updatedTx.type, false);

            await updateDoc(docRef, updatedTx);
            eventBus.emit('transaction_added', updatedTx); // Trigger UI update
            return updatedTx;
        } catch (error) {
            logger.error("Erro ao atualizar transação", error);
            throw error;
        }
    }

    async deleteTransaction(txId) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            
            const docRef = doc(db, `workspaces/${workspaceId}/transactions`, txId);
            const docSnap = await getDoc(docRef);
            
            if(!docSnap.exists()) return;
            const tx = docSnap.data();

            // Reverte o saldo
            await this._applyToWalletBalance(workspaceId, tx.walletId, tx.amount, tx.type, true);

            await deleteDoc(docRef);
            eventBus.emit('transaction_added', { deleted: true }); // Trigger UI update
        } catch (error) {
            logger.error("Erro ao excluir transação", error);
            throw error;
        }
    }

    async _applyToWalletBalance(workspaceId, walletId, amount, type, isRevert = false) {
        if (!walletId) return;
        try {
            const walletRef = doc(db, `workspaces/${workspaceId}/wallets`, walletId);
            const walletSnap = await getDoc(walletRef);
            if (!walletSnap.exists()) return;

            let wallet = walletSnap.data();
            let modifier = 0;

            if (type === 'income') modifier = amount;
            if (type === 'expense') modifier = -amount;

            if (isRevert) modifier = -modifier;

            const newBalance = (wallet.currentBalance || 0) + modifier;
            await updateDoc(walletRef, { currentBalance: newBalance });
            
            logger.debug(`[Firestore] Saldo da Wallet ${walletId} atualizado para ${newBalance}`);
        } catch (e) {
            logger.error("Falha ao atualizar saldo da carteira", e);
        }
    }

    async getTransactions() {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) return [];

            const txsCol = collection(db, `workspaces/${workspaceId}/transactions`);
            const q = query(txsCol, orderBy("date", "desc"));
            const snapshot = await getDocs(q);

            const txs = [];
            snapshot.forEach(d => txs.push(d.data()));
            return txs;
        } catch (error) {
            logger.error("Erro ao buscar Transações", error);
            return [];
        }
    }
}

export const transactionService = new TransactionService();
