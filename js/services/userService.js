import { db } from '../infrastructure/firebase.js';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { logger } from '../core/logger.js';

class UserService {
    async createUser(uid, userData) {
        try {
            const docRef = doc(db, 'users', uid);
            const newData = {
                uid: uid,
                email: userData.email,
                name: userData.name || '',
                activeWorkspaceId: userData.activeWorkspaceId || null,
                createdAt: new Date().toISOString()
            };
            await setDoc(docRef, newData);
            logger.debug(`[Firestore] Usuário criado: ${uid}`);
            return newData;
        } catch (error) {
            logger.error("Erro ao criar usuário", error);
            throw error;
        }
    }

    async getUser(uid, retries = 5) {
        try {
            const docRef = doc(db, 'users', uid);
            const snapshot = await getDoc(docRef);
            if (snapshot.exists()) {
                return snapshot.data();
            }
            return null;
        } catch (error) {
            if (error.code === 'permission-denied' && retries > 0) {
                logger.warning(`[Firestore] Permissão negada ao buscar usuário, retentando... (${retries} restam)`);
                await new Promise(r => setTimeout(r, 1000)); // Aguarda 1 segundo
                return this.getUser(uid, retries - 1);
            }
            logger.error("Erro ao buscar usuário", error);
            throw error;
        }
    }

    async updateUser(uid, data) {
        try {
            const docRef = doc(db, 'users', uid);
            await updateDoc(docRef, { ...data, updatedAt: new Date().toISOString() });
            logger.debug(`[Firestore] Usuário atualizado: ${uid}`);
        } catch (error) {
            logger.error("Erro ao atualizar usuário", error);
            throw error;
        }
    }

    async deleteUser(uid) {
        try {
            const { collection, query, where, getDocs } = await import("https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js");
            
            // 1. Deletar todos os workspaces e suas subcoleções
            const workspacesRef = collection(db, 'workspaces');
            const q = query(workspacesRef, where("ownerId", "==", uid));
            const workspacesSnap = await getDocs(q);

            for (const workspaceDoc of workspacesSnap.docs) {
                const workspaceId = workspaceDoc.id;

                // Transações
                const txsSnap = await getDocs(collection(db, `workspaces/${workspaceId}/transactions`));
                for (const tx of txsSnap.docs) await deleteDoc(tx.ref);

                // Categorias
                const catsSnap = await getDocs(collection(db, `workspaces/${workspaceId}/categories`));
                for (const cat of catsSnap.docs) await deleteDoc(cat.ref);

                // Carteiras
                const walletsSnap = await getDocs(collection(db, `workspaces/${workspaceId}/wallets`));
                for (const wallet of walletsSnap.docs) await deleteDoc(wallet.ref);

                // Finalmente, o workspace
                await deleteDoc(workspaceDoc.ref);
            }

            // 2. Deletar o documento do usuário
            const docRef = doc(db, 'users', uid);
            await deleteDoc(docRef);
            logger.debug(`[Firestore] Usuário e dados deletados: ${uid}`);
        } catch (error) {
            logger.error("Erro ao deletar usuário", error);
            throw error;
        }
    }
}

export const userService = new UserService();
