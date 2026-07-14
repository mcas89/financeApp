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
            const docRef = doc(db, 'users', uid);
            await deleteDoc(docRef);
            logger.debug(`[Firestore] Usuário deletado: ${uid}`);
        } catch (error) {
            logger.error("Erro ao deletar usuário", error);
            throw error;
        }
    }
}

export const userService = new UserService();
