import { db } from '../infrastructure/firebase.js';
import { logger } from '../core/logger.js';
import { state } from '../core/state.js';
import { authService } from './authService.js';
import { collection, doc, setDoc, getDocs, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

class CategoryService {
    async createCategory(catData) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser ? authService.currentUser.uid : 'SYSTEM';

            const catId = catData.id || `C-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

            const newCat = {
                id: catId,
                name: catData.name,
                color: catData.color || '#3b82f6',
                icon: catData.icon || 'fas fa-tags',
                type: catData.type || 'expense', // 'expense', 'income'
                status: 'ACTIVE',
                deleted: false,
                createdBy: uid,
                createdAt: new Date().toISOString()
            };

            const docRef = doc(db, `workspaces/${workspaceId}/categories`, catId);
            await setDoc(docRef, newCat);
            logger.debug(`[Firestore] Categoria criada: ${catId}`, newCat);

            return newCat;
        } catch (error) {
            logger.error("Erro ao criar Categoria", error);
            throw error;
        }
    }

    async deleteCategory(id) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");

            const docRef = doc(db, `workspaces/${workspaceId}/categories`, id);
            await deleteDoc(docRef);
            logger.debug(`[Firestore] Categoria excluída: ${id}`);
        } catch (error) {
            logger.error("Erro ao excluir Categoria", error);
            throw error;
        }
    }

    async updateCategory(id, catData) {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) throw new Error("Nenhum workspace ativo");
            const uid = authService.currentUser ? authService.currentUser.uid : 'SYSTEM';

            const docRef = doc(db, `workspaces/${workspaceId}/categories`, id);
            await setDoc(docRef, { ...catData, updatedAt: new Date().toISOString(), updatedBy: uid }, { merge: true });
            logger.debug(`[Firestore] Categoria atualizada: ${id}`);
        } catch (error) {
            logger.error("Erro ao atualizar Categoria", error);
            throw error;
        }
    }

    async getCategories() {
        try {
            const workspaceId = state.get('activeWorkspaceId');
            if (!workspaceId) return [];

            const catsCol = collection(db, `workspaces/${workspaceId}/categories`);
            const snapshot = await getDocs(catsCol);
            
            if (snapshot.empty) {
                // Semeando o banco com defaults completos
                const defaultCats = [
                    { id: 'C-001', name: 'Alimentação', icon: 'fas fa-utensils', color: '#ef4444', type: 'expense' },
                    { id: 'C-002', name: 'Transporte', icon: 'fas fa-car', color: '#f59e0b', type: 'expense' },
                    { id: 'C-003', name: 'Moradia', icon: 'fas fa-home', color: '#3b82f6', type: 'expense' },
                    { id: 'C-004', name: 'Assinaturas', icon: 'fas fa-play', color: '#8b5cf6', type: 'expense' },
                    { id: 'C-005', name: 'Saúde', icon: 'fas fa-heartbeat', color: '#ec4899', type: 'expense' },
                    { id: 'C-006', name: 'Salário', icon: 'fas fa-money-bill-wave', color: '#10b981', type: 'income' },
                    { id: 'C-007', name: 'Investimentos', icon: 'fas fa-chart-line', color: '#14b8a6', type: 'income' },
                    { id: 'C-PAYMENT', name: 'Pagamento Fatura', icon: 'fas fa-file-invoice-dollar', color: '#64748b', type: 'income' }
                ];
                
                await Promise.all(defaultCats.map(c => this.createCategory(c)));
                return defaultCats;
            }

            const cats = [];
            snapshot.forEach(d => cats.push(d.data()));
            return cats;
        } catch (error) {
            logger.error("Erro ao buscar Categorias", error);
            return [];
        }
    }
}

export const categoryService = new CategoryService();
