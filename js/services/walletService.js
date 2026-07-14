import { db } from '../infrastructure/firebase.js';
import { logger } from '../core/logger.js';
import { workspaceService } from './workspaceService.js';
import { state } from '../core/state.js';
import { authService } from './authService.js';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class WalletService {
    async createWallet(walletData) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser ? authService.currentUser.uid : 'SYSTEM';

            const walletId = walletData.id || `W-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const newWallet = {
                id: walletId,
                name: walletData.name,
                type: walletData.type,
                institution: walletData.institution || '',
                color: walletData.color || '#3b82f6',
                icon: walletData.icon || 'fas fa-wallet',
                initialBalance: parseFloat(walletData.initialBalance) || 0,
                currentBalance: parseFloat(walletData.initialBalance) || 0,
                currency: 'BRL',
                status: 'ACTIVE',
                deleted: false,
                createdBy: uid,
                createdAt: new Date().toISOString()
            };

            if (walletData.type === 'credit_card') {
                newWallet.creditLimit = parseFloat(walletData.creditLimit) || 0;
                newWallet.closingDay = parseInt(walletData.closingDay) || 1;
                newWallet.dueDay = parseInt(walletData.dueDay) || 10;
                newWallet.closingRule = walletData.closingRule || 'next';
                newWallet.brand = walletData.brand || '';
            }

            // Real Firestore Insert
            const docRef = doc(db, `workspaces/${workspaceId}/wallets`, walletId);
            await setDoc(docRef, newWallet);
            logger.debug(`[Firestore] Wallet criada: ${walletId}`, newWallet);

            // Registrar Log
            logger.info(`[Activity] Carteira ${newWallet.name} criada no workspace ${workspaceId}`);

            return newWallet;
        } catch (error) {
            logger.error("Erro ao criar Wallet", error);
            throw error;
        }
    }

    async getWallets() {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) return [];

            const walletsCol = collection(db, `workspaces/${workspaceId}/wallets`);
            const snapshot = await getDocs(walletsCol);
            
            if (snapshot.empty) {
                // Semeando o banco na primeira vez, de forma REAL no Firestore!
                // Forçamos o ID W-001 para que transações antigas de testes voltem a funcionar
                const defaultWallet = await this.createWallet({
                    id: 'W-001',
                    name: 'Conta Corrente',
                    type: 'checking_account',
                    initialBalance: 0,
                    icon: 'fas fa-landmark',
                    color: '#10b981'
                });
                return [defaultWallet];
            }

            const wallets = [];
            snapshot.forEach(doc => {
                wallets.push(doc.data());
            });
            return wallets;
        } catch (error) {
            logger.error("Erro ao buscar Wallets", error);
            return [];
        }
    }
    async updateWallet(walletId, walletData) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser ? authService.currentUser.uid : 'SYSTEM';
            
            const docRef = doc(db, `workspaces/${workspaceId}/wallets`, walletId);
            
            const updatedData = { ...walletData };
            // Ensure numbers
            if (updatedData.initialBalance !== undefined) updatedData.initialBalance = parseFloat(updatedData.initialBalance) || 0;
            if (updatedData.creditLimit !== undefined) updatedData.creditLimit = parseFloat(updatedData.creditLimit) || 0;
            if (updatedData.closingDay !== undefined) updatedData.closingDay = parseInt(updatedData.closingDay) || 1;
            if (updatedData.dueDay !== undefined) updatedData.dueDay = parseInt(updatedData.dueDay) || 10;
            
            updatedData.updatedAt = new Date().toISOString();
            updatedData.updatedBy = uid;

            await setDoc(docRef, updatedData, { merge: true });
            logger.debug(`[Firestore] Wallet atualizada: ${walletId}`);
            
            return true;
        } catch (error) {
            logger.error("Erro ao atualizar Wallet", error);
            throw error;
        }
    }

    async deleteWallet(walletId) {
        try {
            const { deleteDoc } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");

            const docRef = doc(db, `workspaces/${workspaceId}/wallets`, walletId);
            
            await deleteDoc(docRef);
            logger.debug(`[Firestore] Wallet deletada: ${walletId}`);
            return true;
        } catch (error) {
            logger.error("Erro ao deletar Wallet", error);
            throw error;
        }
    }
}

export const walletService = new WalletService();
