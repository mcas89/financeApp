import { db } from '../infrastructure/firebase.js';
import { collection, doc, getDocs, setDoc, updateDoc, deleteDoc, query, Timestamp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { state } from '../core/state.js';
import { logger } from '../core/logger.js';
import { eventBus } from '../core/eventBus.js';
import { transactionService } from './transactionService.js';
import { authService } from './authService.js';

class VaultService {
    getWorkspaceId() {
        return state.get('activeWorkspaceId');
    }

    async getVaults() {
        try {
            const wsId = this.getWorkspaceId();
            if (!wsId) return [];

            const q = query(collection(db, 'workspaces', wsId, 'vaults'));
            const snap = await getDocs(q);
            const vaults = [];
            snap.forEach(doc => {
                vaults.push({ id: doc.id, ...doc.data() });
            });
            return vaults.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
        } catch (error) {
            logger.error("Erro ao buscar cofres", error);
            return [];
        }
    }

    async createVault(data) {
        try {
            const wsId = this.getWorkspaceId();
            if (!wsId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser?.uid || 'SYSTEM';

            const vaultId = data.id || `V-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
            const docRef = doc(db, 'workspaces', wsId, 'vaults', vaultId);
            
            await setDoc(docRef, {
                name: data.name,
                targetAmount: parseFloat(data.targetAmount) || 0,
                currentAmount: 0,
                icon: data.icon || 'fa-piggy-bank',
                color: data.color || '#8b5cf6',
                createdAt: Timestamp.now(),
                createdBy: uid
            });
            
            eventBus.emit('vault_updated');
            return vaultId;
        } catch (error) {
            logger.error("Erro ao criar cofre", error);
            throw error;
        }
    }

    async updateVault(vaultId, data) {
        try {
            const wsId = this.getWorkspaceId();
            if (!wsId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser?.uid || 'SYSTEM';

            const vaultRef = doc(db, 'workspaces', wsId, 'vaults', vaultId);
            await setDoc(vaultRef, {
                name: data.name,
                targetAmount: parseFloat(data.targetAmount) || 0,
                color: data.color,
                updatedAt: new Date().toISOString(),
                updatedBy: uid
            }, { merge: true });
            
            eventBus.emit('vault_updated');
            return true;
        } catch (error) {
            logger.error("Erro ao atualizar cofre", error);
            throw error;
        }
    }

    async deleteVault(vaultId) {
        try {
            const wsId = this.getWorkspaceId();
            if (!wsId) throw new Error("Nenhum workspace ativo");
            
            await deleteDoc(doc(db, 'workspaces', wsId, 'vaults', vaultId));
            eventBus.emit('vault_updated');
        } catch (error) {
            logger.error("Erro ao excluir cofre", error);
            throw error;
        }
    }

    async updateVaultBalance(vaultId, amountChange, isDeposit, walletId) {
        const wsId = this.getWorkspaceId();
        if (!wsId) throw new Error("Nenhum workspace ativo");
        const uid = authService.currentUser?.uid || 'SYSTEM';
        const vaultRef = doc(db, 'workspaces', wsId, 'vaults', vaultId);
        
        try {
            const vaults = await this.getVaults();
            const vault = vaults.find(v => v.id === vaultId);
            if(!vault) throw new Error("Cofre não encontrado");

            const newAmount = Math.max(0, (vault.currentAmount || 0) + (isDeposit ? amountChange : -amountChange));
            
            await transactionService.createTransaction({
                description: isDeposit ? `Guardado no Cofre: ${vault.name}` : `Resgate do Cofre: ${vault.name}`,
                amount: amountChange,
                date: new Date().toISOString().split('T')[0],
                type: isDeposit ? 'expense' : 'income',
                categoryId: 'C-001',
                walletId: walletId,
                status: 'paid'
            });

            await updateDoc(vaultRef, {
                currentAmount: newAmount,
                updatedAt: new Date().toISOString(),
                updatedBy: uid
            });

            eventBus.emit('vault_updated');
            return true;
        } catch (error) {
            logger.error("Erro ao movimentar cofre", error);
            throw error;
        }
    }
}

export const vaultService = new VaultService();
