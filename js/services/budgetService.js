import { db } from '../infrastructure/firebase.js';
import { logger } from '../core/logger.js';
import { state } from '../core/state.js';
import { collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class BudgetService {
    async getBudgets() {
        try {
            const workspaceId = state.get('activeWorkspaceId') || 'WS-TEST';
            const budgetsCol = collection(db, `workspaces/${workspaceId}/budgets`);
            const snapshot = await getDocs(budgetsCol);

            const budgets = [];
            snapshot.forEach(d => budgets.push(d.data()));
            return budgets;
        } catch (error) {
            logger.error("Erro ao buscar Metas/Orçamentos", error);
            return [];
        }
    }

    async setBudget(categoryId, limit, categoryName, warningThreshold = 80) {
        try {
            const workspaceId = state.get('activeWorkspaceId') || 'WS-TEST';
            const docRef = doc(db, `workspaces/${workspaceId}/budgets`, categoryId);
            
            const data = {
                categoryId,
                categoryName: categoryName || 'Categoria',
                limit: parseFloat(limit) || 0,
                warningThreshold: parseInt(warningThreshold) || 80,
                updatedAt: new Date().toISOString()
            };

            await setDoc(docRef, data);
            return data;
        } catch (error) {
            logger.error("Erro ao salvar Meta", error);
            throw error;
        }
    }

    async deleteBudget(categoryId) {
        try {
            const workspaceId = state.get('activeWorkspaceId') || 'WS-TEST';
            const docRef = doc(db, `workspaces/${workspaceId}/budgets`, categoryId);
            await deleteDoc(docRef);
        } catch (error) {
            logger.error("Erro ao excluir Meta", error);
            throw error;
        }
    }
}

export const budgetService = new BudgetService();
