import { db } from '../infrastructure/firebase.js';
import { collection, doc, getDoc, setDoc, getDocs, query, where, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { logger } from '../core/logger.js';

class WorkspaceService {
    async createWorkspace(ownerUid, name = "Meu Workspace") {
        try {
            const workspaceId = `WS-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            const workspaceRef = doc(db, 'workspaces', workspaceId);
            const memberRef = doc(db, `workspaces/${workspaceId}/members`, ownerUid);
            
            const newWorkspace = {
                id: workspaceId,
                name: name,
                ownerId: ownerUid,
                createdAt: new Date().toISOString(),
                createdBy: ownerUid
            };
            
            const newMember = {
                uid: ownerUid,
                role: 'owner',
                addedAt: new Date().toISOString()
            };
            
            const batch = writeBatch(db);
            batch.set(workspaceRef, newWorkspace);
            batch.set(memberRef, newMember);
            await batch.commit();
            
            logger.debug(`[Firestore] Workspace criado via Batch: ${workspaceId}`);
            return newWorkspace;
        } catch (error) {
            logger.error("Erro ao criar workspace", error);
            throw error;
        }
    }

    async addMember(workspaceId, uid, role) {
        try {
            const memberRef = doc(db, `workspaces/${workspaceId}/members`, uid);
            await setDoc(memberRef, {
                uid: uid,
                role: role,
                addedAt: new Date().toISOString()
            });
            logger.debug(`[Firestore] Membro ${uid} adicionado ao workspace ${workspaceId} como ${role}`);
        } catch (error) {
            logger.error("Erro ao adicionar membro ao workspace", error);
            throw error;
        }
    }

    async getUserWorkspaces(uid, retries = 3) {
        try {
            const q = query(collection(db, 'workspaces'), where('ownerId', '==', uid));
            const snapshot = await getDocs(q);
            const workspaces = [];
            snapshot.forEach(d => workspaces.push(d.data()));
            return workspaces;
        } catch (error) {
            if (error.code === 'permission-denied' && retries > 0) {
                logger.warning(`[Firestore] Permissão negada ao buscar workspaces, retentando... (${retries} restam)`);
                await new Promise(r => setTimeout(r, 500));
                return this.getUserWorkspaces(uid, retries - 1);
            }
            logger.error("Erro ao buscar workspaces do usuário", error);
            return [];
        }
    }
}

export const workspaceService = new WorkspaceService();
