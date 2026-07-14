import { auth } from '../infrastructure/firebase.js';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { state } from '../core/state.js';
import { userService } from './userService.js';
import { workspaceService } from './workspaceService.js';

class AuthService {
    constructor() {
        this.currentUser = null;
        this.authReady = false;
        this.authPromise = new Promise((resolve) => {
            onAuthStateChanged(auth, async (user) => {
                this.currentUser = user;
                
                if (user) {
                    // Buscar o workspace ativo do usuário no Firestore
                    try {
                        const userDoc = await userService.getUser(user.uid);
                        if (userDoc && userDoc.activeWorkspaceId) {
                            state.set('activeWorkspaceId', userDoc.activeWorkspaceId);
                        } else {
                            // Se não tiver documento (ex: logou logo após criar a auth), o fluxo de registro deve tratar.
                            // Deixamos vazio ou pegamos o primeiro workspace que ele é membro.
                            const workspaces = await workspaceService.getUserWorkspaces(user.uid);
                            if (workspaces.length > 0) {
                                state.set('activeWorkspaceId', workspaces[0].id);
                                await userService.updateUser(user.uid, { activeWorkspaceId: workspaces[0].id });
                            }
                        }
                    } catch (e) {
                        console.error("Erro ao carregar workspace do usuário", e);
                    }
                } else {
                    state.set('activeWorkspaceId', null);
                }
                
                this.authReady = true;
                import('../core/eventBus.js').then(({ eventBus }) => {
                    eventBus.emit('auth_processed', user);
                });
                resolve(user);
            });
        });
    }

    async checkSession() {
        if (this.authReady) return this.currentUser;
        return this.authPromise;
    }

    isAuthenticated() {
        return this.currentUser !== null;
    }

    async login(email, password) {
        return new Promise((resolve, reject) => {
            import('../core/eventBus.js').then(({ eventBus }) => {
                const onProcessed = () => {
                    eventBus.off('auth_processed', onProcessed);
                    resolve(true);
                };
                eventBus.on('auth_processed', onProcessed);
                
                signInWithEmailAndPassword(auth, email, password).catch(error => {
                    eventBus.off('auth_processed', onProcessed);
                    console.error("Login falhou:", error);
                    reject(error);
                });
            });
        });
    }

    async register(email, password, name = '') {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            // 1. Criar Workspace Padrão
            const workspace = await workspaceService.createWorkspace(user.uid, "Meu Workspace");
            
            // 2. Criar Usuário no Firestore
            await userService.createUser(user.uid, {
                email: user.email,
                name: name,
                activeWorkspaceId: workspace.id
            });
            
            state.set('activeWorkspaceId', workspace.id);
            return user;
        } catch (error) {
            console.error("Registro falhou:", error);
            throw error;
        }
    }

    async logout() {
        try {
            await signOut(auth);
            return true;
        } catch (error) {
            console.error("Logout falhou:", error);
            throw error;
        }
    }

    async updateProfile(name) {
        if (!this.currentUser) throw new Error("Usuário não logado");
        try {
            await updateProfile(this.currentUser, { displayName: name });
            await userService.updateUser(this.currentUser.uid, { name: name });
            return true;
        } catch (error) {
            console.error("Erro ao atualizar perfil:", error);
            throw error;
        }
    }

    async deleteAccount(password) {
        if (!this.currentUser) throw new Error("Usuário não logado");
        try {
            const credential = EmailAuthProvider.credential(this.currentUser.email, password);
            await reauthenticateWithCredential(this.currentUser, credential);
            
            await userService.deleteUser(this.currentUser.uid);
            await deleteUser(this.currentUser);
            
            return true;
        } catch (error) {
            console.error("Erro ao excluir conta:", error);
            throw error;
        }
    }
}

export const authService = new AuthService();
