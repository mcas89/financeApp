import { authService } from '../services/authService.js';
import { navigation } from '../services/navigation.js';
import { toast } from '../components/toast.js';
import { CarolOrb } from '../components/carolOrb.js';

const setupLoginView = () => {
    // Setup eye buttons
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.getAttribute('data-target');
            const input = document.getElementById(inputId);
            const icon = btn.querySelector('i');
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        });
    });

    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            try {
                const btn = loginForm.querySelector('button[type="submit"]');
                btn.textContent = 'Aguarde...';
                btn.disabled = true;
                
                await authService.login(email, password);
                toast.success("Login realizado com sucesso");
                navigation.go('/dashboard');
            } catch (error) {
                // O ErrorHandler global já vai mostrar o toast com a mensagem humana,
                // só precisamos resetar o botão aqui
                btn.textContent = 'Entrar';
                btn.disabled = false;
            }
        });
    }
};

const setupRegisterView = () => {
    // Setup eye buttons
    document.querySelectorAll('.eye-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const inputId = btn.getAttribute('data-target');
            const input = document.getElementById(inputId);
            const icon = btn.querySelector('i');
            if (input && icon) {
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    input.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            }
        });
    });

    const form = document.getElementById('register-form');
    if (!form) return;

    const emailInput = document.getElementById('reg-email');
    const passInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm-password');
    const nameInput = document.getElementById('reg-name');

    const validate = () => {
        let isValid = true;
        
        if (emailInput.value && !emailInput.value.includes('@')) {
            document.getElementById('email-group').classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('email-group').classList.remove('invalid');
        }

        if (passInput.value && passInput.value.length < 6) {
            document.getElementById('password-group').classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('password-group').classList.remove('invalid');
        }

        if (confirmInput.value && confirmInput.value !== passInput.value) {
            document.getElementById('confirm-password-group').classList.add('invalid');
            isValid = false;
        } else {
            document.getElementById('confirm-password-group').classList.remove('invalid');
        }

        return isValid;
    };

    emailInput.addEventListener('input', validate);
    passInput.addEventListener('input', validate);
    confirmInput.addEventListener('input', validate);

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!validate()) {
            toast.error("Verifique os campos em vermelho.");
            return;
        }
        
        const btn = form.querySelector('button[type="submit"]');
        btn.textContent = 'Criando...';
        btn.disabled = true;
        
        try {
            await authService.register(emailInput.value, passInput.value, nameInput ? nameInput.value.trim() : 'Usuário');
            toast.success("Conta criada com sucesso!");
            setTimeout(() => navigation.go('/onboarding'), 1000);
        } catch (error) {
            btn.textContent = 'Criar conta';
            btn.disabled = false;
        }
    });
};

export const authRoutes = {
    '/': {
        templateUrl: './pages/splash.html',
        isProtected: false,
        init: () => {
            setTimeout(() => {
                if (authService.isAuthenticated()) {
                    navigation.go('/dashboard');
                } else {
                    navigation.go('/welcome');
                }
            }, 2000);
        }
    },
    '/welcome': {
        templateUrl: './pages/welcome.html',
        isProtected: false
    },
    '/login': {
        templateUrl: './pages/login.html',
        isProtected: false,
        init: setupLoginView
    },
    '/register': {
        templateUrl: './pages/register.html',
        isProtected: false,
        init: setupRegisterView
    },
    '/settings': {
        templateUrl: './pages/settings.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../core/state.js').then(m => m.state),
                import('../infrastructure/firebase.js').then(m => m.db),
                import('https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js')
            ]).then(([state, db, firestore]) => {
                const { doc, getDoc, setDoc } = firestore;
                
                const loadWorkspace = async () => {
                    try {
                        const wsId = state.get('activeWorkspaceId') || 'WS-TEST';
                        const docRef = doc(db, 'workspaces', wsId);
                        const snap = await getDoc(docRef);
                        
                        if (snap.exists()) {
                            const data = snap.data();
                            document.getElementById('ws-name').value = data.name || '';
                            document.getElementById('ws-color').value = data.color || '#8b5cf6';
                            document.getElementById('ws-icon').value = data.icon || 'fas fa-briefcase';
                        }
                    } catch (e) {
                        toast.error("Erro ao carregar workspace");
                    }
                };

                loadWorkspace();

                document.getElementById('workspace-form')?.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('btn-save-ws');
                    btn.disabled = true;
                    btn.textContent = 'Salvando...';

                    try {
                        const wsId = state.get('activeWorkspaceId') || 'WS-TEST';
                        const docRef = doc(db, 'workspaces', wsId);
                        
                        const payload = {
                            name: document.getElementById('ws-name').value,
                            color: document.getElementById('ws-color').value,
                            icon: document.getElementById('ws-icon').value,
                            updatedAt: new Date().toISOString()
                        };

                        await setDoc(docRef, payload, { merge: true });
                        toast.success("Workspace atualizado!");
                        
                        // Emitir evento se necessário ou forçar reload para aplicar cores globais (se implementado)
                        window.location.reload(); 
                    } catch (err) {
                        toast.error("Erro ao salvar workspace");
                        btn.disabled = false;
                        btn.textContent = 'Salvar Alterações';
                    }
                });
            });
        }
    }
};

window.openActionSheet = (e, title, editFnStr, deleteFnStr) => {
    e.preventDefault();
    const sheet = document.getElementById('global-action-sheet');
    if (!sheet) return;
    
    document.getElementById('as-title').textContent = title || 'Opções';
    
    const btnEdit = document.getElementById('as-btn-edit');
    const btnDel = document.getElementById('as-btn-delete');
    
    if (editFnStr) {
        btnEdit.style.display = 'flex';
        btnEdit.onclick = () => {
            sheet.close();
            eval(editFnStr);
        };
    } else {
        btnEdit.style.display = 'none';
    }
    
    if (deleteFnStr) {
        btnDel.style.display = 'flex';
        btnDel.onclick = () => {
            sheet.close();
            eval(deleteFnStr);
        };
    } else {
        btnDel.style.display = 'none';
    }
    
    sheet.showModal();
};

export const financeRoutes = {
    '/onboarding': {
        templateUrl: './pages/onboarding.html',
        isProtected: true,
        init: () => {
            // Populate user name
            const firstName = authService.currentUser?.displayName?.split(' ')[0] || 'Usuário';
            document.querySelectorAll('.user-display-name').forEach(el => el.textContent = firstName);

            // Import dinâmico só quando precisa
            import('../services/workspaceService.js').then(({ workspaceService }) => {
                const state = { type: null, name: '', emoji: '🏠', color: '#8b5cf6' };

                window.selectType = (el, type) => {
                    document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('selected'));
                    el.classList.add('selected');
                    state.type = type;
                    document.getElementById('btn-step-1').disabled = false;
                };

                window.nextStep = (step) => {
                    document.querySelectorAll('.wizard-step').forEach(s => s.classList.remove('active'));
                    document.getElementById(`step-${step}`).classList.add('active');
                };

                window.selectEmoji = (el, emoji) => {
                    document.querySelectorAll('.emoji-option').forEach(s => s.classList.remove('selected'));
                    el.classList.add('selected');
                    state.emoji = emoji;
                };

                window.checkStep2 = () => {
                    const name = document.getElementById('ws-name').value;
                    state.name = name;
                    document.getElementById('btn-step-2').disabled = name.trim().length === 0;
                };

                window.finishWizard = async () => {
                    const btn = document.getElementById('btn-step-2');
                    btn.textContent = 'Configurando espaço...';
                    btn.disabled = true;

                    try {
                        const { authService } = await import('../services/authService.js');
                        const user = authService.currentUser;
                        if (!user) throw new Error("Usuário não autenticado");

                        const { state: appState } = await import('../core/state.js');

                        const workspace = await workspaceService.createWorkspace(user.uid, state.name || "Meu Workspace");
                        
                        // Atualiza o state global para refletir o novo workspace
                        appState.set('activeWorkspaceId', workspace.id);

                        window.nextStep(3); // Animação de sucesso
                        
                        setTimeout(() => {
                            import('../core/router.js').then(({ router }) => router.navigateTo('/dashboard'));
                        }, 2500);
                    } catch (e) {
                        console.error(e);
                        toast.error("Falha ao criar o Workspace.");
                        btn.textContent = 'Criar Meu Espaço';
                        btn.disabled = false;
                    }
                };
            });
        }
    },
    '/accounts': {
        templateUrl: './pages/accounts.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/walletService.js').then(m => m.walletService)
            ]).then(([walletService]) => {
                const listEl = document.getElementById('accounts-list');
                const formContainer = document.getElementById('account-form-container');
                const typeSelect = document.getElementById('acc-type');

                // Toggle Form
                const openForm = (acc = null) => {
                    formContainer.style.display = 'block';
                    listEl.style.display = 'none';
                    if (acc) {
                        document.getElementById('acc-form-title').textContent = 'Editar Conta';
                        document.getElementById('acc-id').value = acc.id;
                        document.getElementById('acc-name').value = acc.name;
                        document.getElementById('acc-balance').value = acc.initialBalance;
                        document.getElementById('acc-type').value = acc.type;
                        
                        document.querySelectorAll('#acc-icon-selector .icon-option').forEach(e => {
                            e.classList.remove('selected');
                            if(e.dataset.value === acc.icon) e.classList.add('selected');
                        });
                        document.querySelectorAll('#acc-color-selector .color-option').forEach(e => {
                            e.classList.remove('selected');
                            if(e.dataset.value === acc.color) e.classList.add('selected');
                        });
                        selectedIcon = acc.icon;
                        selectedColor = acc.color;
                    } else {
                        document.getElementById('acc-form-title').textContent = 'Nova Conta';
                        document.getElementById('acc-id').value = '';
                        document.getElementById('acc-name').value = '';
                        document.getElementById('acc-balance').value = '0';
                    }
                };

                document.getElementById('btn-new-account')?.addEventListener('click', () => openForm(null));

                document.getElementById('btn-cancel-account')?.addEventListener('click', () => {
                    formContainer.style.display = 'none';
                    listEl.style.display = 'block';
                });

                // Icon / Color selector logic
                let selectedIcon = 'fas fa-university';
                let selectedColor = '#8b5cf6';
                
                document.querySelectorAll('#acc-icon-selector .icon-option').forEach(el => {
                    el.addEventListener('click', () => {
                        document.querySelectorAll('#acc-icon-selector .icon-option').forEach(e => e.classList.remove('selected'));
                        el.classList.add('selected');
                        selectedIcon = el.dataset.value;
                    });
                });
                
                document.querySelectorAll('#acc-color-selector .color-option').forEach(el => {
                    el.addEventListener('click', () => {
                        document.querySelectorAll('#acc-color-selector .color-option').forEach(e => e.classList.remove('selected'));
                        el.classList.add('selected');
                        selectedColor = el.dataset.value;
                    });
                });

                // Load initial
                const loadAccounts = async () => {
                    const wallets = await walletService.getWallets();
                    if(!listEl) return;
                    listEl.innerHTML = '';
                    
                    const accounts = wallets.filter(w => w.type !== 'credit_card');
                    
                    if(accounts.length === 0) {
                        listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 2rem;">Nenhuma conta encontrada.</p>';
                        return;
                    }

                    window.editAccount = (id) => {
                        const acc = accounts.find(a => a.id === id);
                        if(acc) openForm(acc);
                    };

                    window.deleteAccount = async (id, name) => {
                        if(await window.appConfirm('Excluir', `Tem certeza que deseja excluir a conta "${name}"?`, { type: 'danger', confirmText: 'Excluir' })) {
                            const pwd = prompt("Para confirmar, digite a palavra EXCLUIR:");
                            if (pwd === "EXCLUIR") {
                                try {
                                    await walletService.deleteWallet(id);
                                    toast.success("Conta excluída!");
                                    loadAccounts();
                                } catch (e) {
                                    toast.error("Erro ao excluir conta");
                                }
                            } else {
                                toast.error("Exclusão cancelada (palavra incorreta).");
                            }
                        }
                    };

                    for (const w of accounts) {
                        const el = document.createElement('div');
                        el.className = 'account-card-premium';
                        el.style.position = 'relative';
                        el.style.userSelect = 'none';
                        el.style.webkitUserSelect = 'none';
                        el.setAttribute('oncontextmenu', `window.openActionSheet(event, '${w.name}', 'window.editAccount(\\'${w.id}\\')', 'window.deleteAccount(\\'${w.id}\\', \\'${w.name}\\')')`);
                        el.innerHTML = `
                            <div class="acc-icon" style="background: ${w.color}15; color: ${w.color};">
                                <i class="${w.icon}"></i>
                            </div>
                            <div class="acc-details">
                                <p class="acc-name">${w.name}</p>
                                <p class="acc-type">${w.type === 'checking_account' ? 'Conta Corrente' : w.type === 'savings' ? 'Poupança' : w.type === 'investment' ? 'Investimento' : 'Dinheiro'}</p>
                            </div>
                            <div class="acc-balance">
                                R$ ${w.currentBalance.toFixed(2)}
                            </div>
                        `;
                        listEl.appendChild(el);
                    }
                };
                
                loadAccounts();

                // Save
                document.getElementById('btn-save-account')?.addEventListener('click', async () => {
                    const btn = document.getElementById('btn-save-account');
                    btn.disabled = true;
                    btn.textContent = 'Salvando...';

                    const accId = document.getElementById('acc-id').value;
                    const payload = {
                        name: document.getElementById('acc-name').value,
                        type: typeSelect.value,
                        initialBalance: document.getElementById('acc-balance').value,
                        icon: selectedIcon,
                        color: selectedColor
                    };

                    try {
                        if (accId) {
                            await walletService.updateWallet(accId, payload);
                            toast.success("Conta atualizada!");
                        } else {
                            await walletService.createWallet(payload);
                            toast.success("Conta criada!");
                        }
                        
                        // Recarregar
                        formContainer.style.display = 'none';
                        listEl.style.display = 'block';
                        btn.disabled = false;
                        btn.textContent = 'Salvar';
                        loadAccounts();
                    } catch (e) {
                        toast.error("Erro ao salvar conta");
                        btn.disabled = false;
                        btn.textContent = 'Salvar';
                    }
                });
            });
        }
    },
    '/cards': {
        templateUrl: './pages/cards.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/walletService.js').then(m => m.walletService),
                import('../services/transactionService.js').then(m => m.transactionService),
                import('../services/creditEngine.js').then(m => m.creditEngine)
            ]).then(([walletService, transactionService, creditEngine]) => {
                const listEl = document.getElementById('cards-list');
                const formContainer = document.getElementById('card-form-container');

                // Toggle Form
                const openCardForm = (card = null) => {
                    formContainer.style.display = 'block';
                    listEl.style.display = 'none';
                    if (card) {
                        document.getElementById('cc-form-title').textContent = 'Editar Cartão';
                        document.getElementById('cc-id').value = card.id;
                        document.getElementById('cc-name').value = card.name;
                        document.getElementById('cc-limit').value = card.creditLimit;
                        document.getElementById('cc-closing').value = card.closingDay;
                        document.getElementById('cc-due').value = card.dueDay;
                        document.getElementById('cc-closing-rule').value = card.closingRule || 'next';
                        
                        document.querySelectorAll('#cc-color-selector .color-option').forEach(e => {
                            e.classList.remove('selected');
                            if(e.dataset.value === card.color) e.classList.add('selected');
                        });
                        selectedColor = card.color;
                    } else {
                        document.getElementById('cc-form-title').textContent = 'Novo Cartão';
                        document.getElementById('cc-id').value = '';
                        document.getElementById('cc-name').value = '';
                        document.getElementById('cc-limit').value = '';
                        document.getElementById('cc-closing').value = '';
                        document.getElementById('cc-due').value = '';
                    }
                };

                document.getElementById('btn-new-card')?.addEventListener('click', () => openCardForm(null));

                document.getElementById('btn-cancel-card')?.addEventListener('click', () => {
                    formContainer.style.display = 'none';
                    listEl.style.display = 'block';
                });

                // Color selector logic
                let selectedColor = '#8b5cf6';
                document.querySelectorAll('#cc-color-selector .color-option').forEach(el => {
                    el.addEventListener('click', () => {
                        document.querySelectorAll('#cc-color-selector .color-option').forEach(e => e.classList.remove('selected'));
                        el.classList.add('selected');
                        selectedColor = el.dataset.value;
                    });
                });

                // Load initial
                const loadCards = () => {
                    Promise.all([
                        walletService.getWallets(),
                        transactionService.getTransactions()
                    ]).then(([wallets, allTxs]) => {
                        if(!listEl) return;
                        listEl.innerHTML = '';
                        
                        const cards = wallets.filter(w => w.type === 'credit_card');
                        
                        if(cards.length === 0) {
                            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 2rem;">Nenhum cartão encontrado.</p>';
                            return;
                        }

                        window.editCard = (id) => {
                            const card = cards.find(c => c.id === id);
                            if(card) openCardForm(card);
                        };

                        window.deleteCard = async (id, name) => {
                            const cardTxs = allTxs.filter(tx => tx.walletId === id);
                            let msg = `Tem certeza que deseja excluir o cartão "${name}"?`;
                            if (cardTxs.length > 0) {
                                msg = `Este cartão possui ${cardTxs.length} transações/faturas vinculadas.\n\nPara excluir mesmo assim (os dados antigos ficarão inacessíveis), digite a senha: EXCLUIR`;
                                const pwd = prompt(msg);
                                if (pwd !== "EXCLUIR") {
                                    return toast.error("Exclusão cancelada (palavra incorreta).");
                                }
                            } else {
                                if(!(await window.appConfirm('Excluir', msg, { type: 'danger', confirmText: 'Excluir' }))) return;
                            }

                            try {
                                await walletService.deleteWallet(id);
                                toast.success("Cartão excluído!");
                                loadCards();
                            } catch (e) {
                                toast.error("Erro ao excluir cartão");
                            }
                        };

                        for (const w of cards) {
                            const el = document.createElement('div');
                            
                            const engineData = creditEngine.processCard(w, allTxs);
                            const bestDay = creditEngine.getBestPurchaseDay(w);
                            
                            const now = new Date();
                            const currentInvoiceId = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                            const currentInvoice = engineData.invoices.find(i => i.id === currentInvoiceId) || engineData.invoices[0] || { totalAmount: 0 };
                            
                            let progressColor = '#10b981'; // green (< 50%)
                            if (engineData.progressPercentage >= 50 && engineData.progressPercentage <= 80) progressColor = '#f59e0b'; // yellow
                            if (engineData.progressPercentage > 80) progressColor = 'var(--error)'; // red
                            if (engineData.progressPercentage >= 100) progressColor = '#000000'; // black (excedido)
                            
                            const alertText = engineData.progressPercentage > 80 
                                ? `<div style="color: var(--error); font-size: 0.75rem; font-weight: 600; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.25rem;"><i class="fas fa-exclamation-triangle"></i> Fatura estourando o limite recomendado!</div>`
                                : '';

                            el.className = 'credit-card-premium';
                            el.style.background = `linear-gradient(135deg, ${w.color}, #1f2937)`;
                            el.style.userSelect = 'none';
                            el.style.webkitUserSelect = 'none';
                            el.setAttribute('oncontextmenu', `window.openActionSheet(event, '${w.name}', 'window.editCard(\\'${w.id}\\')', 'window.deleteCard(\\'${w.id}\\', \\'${w.name}\\')')`);
                            
                            el.innerHTML = `
                                <div class="cc-header">
                                    <div class="cc-name"><i class="fas fa-credit-card"></i> ${w.name}</div>
                                    <div class="cc-brand"><i class="fab fa-cc-mastercard"></i></div>
                                </div>
                                <div class="cc-body">
                                    <div class="cc-invoice-label">Fatura Atual (${currentInvoice.id || '-'})</div>
                                    <div class="cc-invoice-value">R$ ${currentInvoice.totalAmount.toFixed(2)}</div>
                                </div>
                                <div class="cc-footer">
                                    <div class="cc-limit-info">
                                        <span>Disponível: R$ ${engineData.availableLimit.toFixed(2)}</span>
                                        <span>Limite: R$ ${engineData.totalLimit.toFixed(2)}</span>
                                    </div>
                                    <div class="cc-progress-bar">
                                        <div class="cc-progress-fill" style="width: ${engineData.progressPercentage}%; background: ${progressColor};"></div>
                                    </div>
                                    ${alertText}
                                    <div class="cc-dates" style="font-size: 0.75rem; margin-top: 0.5rem; opacity: 0.8; display: flex; justify-content: space-between; align-items: center;">
                                        <span>Fecha: ${w.closingDay} | Vence: ${w.dueDay}</span>
                                        <span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 0.2rem 0.5rem; border-radius: 10px; font-weight: 600;"><i class="fas fa-calendar-check"></i> Melhor dia: ${bestDay}</span>
                                    </div>
                                </div>
                            `;
                            
                            listEl.appendChild(el);
                        }
                    });
                };

                loadCards();

                // Save
                document.getElementById('btn-save-card')?.addEventListener('click', async () => {
                    const btn = document.getElementById('btn-save-card');
                    btn.disabled = true;
                    btn.textContent = 'Salvando...';

                    const ccId = document.getElementById('cc-id').value;
                    const payload = {
                        name: document.getElementById('cc-name').value,
                        type: 'credit_card',
                        creditLimit: document.getElementById('cc-limit').value,
                        closingDay: document.getElementById('cc-closing').value,
                        dueDay: document.getElementById('cc-due').value,
                        closingRule: document.getElementById('cc-closing-rule').value,
                        color: selectedColor,
                        icon: 'fas fa-credit-card'
                    };

                    try {
                        if (ccId) {
                            await walletService.updateWallet(ccId, payload);
                            toast.success("Cartão atualizado!");
                        } else {
                            await walletService.createWallet(payload);
                            toast.success("Cartão criado!");
                        }
                        
                        formContainer.style.display = 'none';
                        listEl.style.display = 'block';
                        btn.disabled = false;
                        btn.textContent = 'Salvar';
                        loadCards();
                    } catch (e) {
                        toast.error("Erro ao salvar cartão");
                        btn.disabled = false;
                        btn.textContent = 'Salvar';
                    }
                });
            });
        }
    },
    '/categories': {
        templateUrl: './pages/categories.html',
        isProtected: true,
        init: () => {
            import('../services/categoryService.js').then(({ categoryService }) => {
                const listEl = document.getElementById('categories-list');
                const tabsContainer = document.getElementById('cat-tabs');
                const formContainer = document.getElementById('category-form-container');
                let currentCatType = 'expense';
                let allCategories = [];

                // Toggle Form
                const openCatForm = (cat = null) => {
                    formContainer.style.display = 'block';
                    listEl.style.display = 'none';
                    if (tabsContainer) tabsContainer.style.display = 'none';
                    
                    if (cat) {
                        document.getElementById('cat-form-title').textContent = 'Editar Categoria';
                        document.getElementById('cat-id').value = cat.id;
                        document.getElementById('cat-name').value = cat.name;
                        document.getElementById('cat-type').value = cat.type;
                        
                        document.querySelectorAll('#cat-icon-selector .icon-option').forEach(e => {
                            e.classList.remove('selected');
                            if(e.dataset.value === cat.icon) e.classList.add('selected');
                        });
                        document.querySelectorAll('#cat-color-selector .color-option').forEach(e => {
                            e.classList.remove('selected');
                            if(e.dataset.value === cat.color) e.classList.add('selected');
                        });
                        selectedIcon = cat.icon;
                        selectedColor = cat.color;
                    } else {
                        document.getElementById('cat-form-title').textContent = 'Nova Categoria';
                        document.getElementById('cat-id').value = '';
                        document.getElementById('cat-name').value = '';
                        document.getElementById('cat-type').value = currentCatType;
                    }
                };

                document.getElementById('btn-new-category')?.addEventListener('click', () => openCatForm(null));

                document.getElementById('btn-cancel-cat')?.addEventListener('click', () => {
                    formContainer.style.display = 'none';
                    listEl.style.display = 'block';
                    if (tabsContainer) tabsContainer.style.display = 'flex';
                });

                // Icon / Color selector logic
                let selectedIcon = 'fas fa-tags';
                let selectedColor = '#8b5cf6';
                
                document.querySelectorAll('#cat-icon-selector .icon-option').forEach(el => {
                    el.addEventListener('click', () => {
                        document.querySelectorAll('#cat-icon-selector .icon-option').forEach(e => e.classList.remove('selected'));
                        el.classList.add('selected');
                        selectedIcon = el.dataset.value;
                    });
                });
                
                document.querySelectorAll('#cat-color-selector .color-option').forEach(el => {
                    el.addEventListener('click', () => {
                        document.querySelectorAll('#cat-color-selector .color-option').forEach(e => e.classList.remove('selected'));
                        el.classList.add('selected');
                        selectedColor = el.dataset.value;
                    });
                });

                const loadCategories = () => {
                    categoryService.getCategories().then(cats => {
                        allCategories = cats;
                        renderCategories();
                    });
                };

                window.editCategory = (id) => {
                    const cat = allCategories.find(c => c.id === id);
                    if(cat) openCatForm(cat);
                };

                window.deleteCategory = async (id, name) => {
                    if (id === 'C-001' || id === 'C-002') {
                        return toast.error("Esta categoria é protegida pelo sistema e não pode ser excluída.");
                    }
                    if(await window.appConfirm('Excluir', `Tem certeza que deseja excluir a categoria "${name}"?`, { type: 'danger', confirmText: 'Excluir' })) {
                        try {
                            await categoryService.deleteCategory(id);
                            toast.success("Categoria excluída!");
                            loadCategories();
                        } catch (e) {
                            toast.error("Erro ao excluir categoria");
                        }
                    }
                };

                const renderCategories = () => {
                    if(!listEl) return;
                    listEl.innerHTML = '';
                    
                    const filtered = allCategories.filter(c => c.type === currentCatType);
                    
                    if(filtered.length === 0) {
                        listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 2rem;">Nenhuma categoria encontrada.</p>';
                        return;
                    }

                    filtered.forEach(c => {
                        const el = document.createElement('div');
                        el.className = 'cat-card-premium';
                        el.style.position = 'relative';
                        el.style.userSelect = 'none';
                        el.style.webkitUserSelect = 'none';
                        el.setAttribute('oncontextmenu', `window.openActionSheet(event, '${c.name}', 'window.editCategory(\\'${c.id}\\')', ${(c.id !== 'C-001' && c.id !== 'C-002') ? `'window.deleteCategory(\\'${c.id}\\', \\'${c.name}\\')'` : 'null'})`);
                        
                        el.innerHTML = `
                            <div class="cat-icon" style="background: ${c.color}15; color: ${c.color};">
                                <i class="${c.icon}"></i>
                            </div>
                            <div class="cat-details">
                                <p class="cat-name">${c.name}</p>
                                <p class="cat-type">${c.type === 'expense' ? 'Despesa' : 'Receita'}</p>
                            </div>
                        `;
                        listEl.appendChild(el);
                    });
                };

                // Tabs logic
                const tabBtns = document.querySelectorAll('.tab-btn');
                tabBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        tabBtns.forEach(b => {
                            b.classList.remove('btn-primary');
                            b.style.background = 'transparent';
                            b.style.color = 'var(--text-primary)';
                        });
                        btn.classList.add('btn-primary');
                        btn.style.background = '';
                        btn.style.color = '';
                        
                        currentCatType = btn.dataset.type;
                        renderCategories();
                    });
                });

                loadCategories();

                document.getElementById('btn-save-cat')?.addEventListener('click', async () => {
                    const btn = document.getElementById('btn-save-cat');
                    btn.disabled = true;
                    btn.textContent = 'Salvando...';

                    const catId = document.getElementById('cat-id').value;
                    const payload = {
                        name: document.getElementById('cat-name').value,
                        type: document.getElementById('cat-type')?.value || 'expense',
                        icon: selectedIcon,
                        color: selectedColor
                    };
                    
                    if (catId === 'C-001' || catId === 'C-002') {
                        toast.error("Esta categoria é padrão e não pode ser editada dessa forma.");
                        btn.disabled = false;
                        btn.textContent = 'Salvar Categoria';
                        return;
                    }

                    try {
                        if (catId) {
                            await categoryService.updateCategory(catId, payload);
                            toast.success("Categoria atualizada!");
                        } else {
                            await categoryService.createCategory(payload);
                            toast.success("Categoria salva!");
                        }
                        
                        formContainer.style.display = 'none';
                        listEl.style.display = 'block';
                        if (tabsContainer) tabsContainer.style.display = 'flex';
                        btn.disabled = false;
                        btn.textContent = 'Salvar Categoria';
                        loadCategories();
                    } catch (e) {
                        toast.error("Erro");
                        btn.disabled = false;
                        btn.textContent = 'Salvar Categoria';
                    }
                });
            });
        }
    },
    '/transactions': {
        templateUrl: './pages/transactions.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/transactionService.js').then(m => m.transactionService),
                import('../services/categoryService.js').then(m => m.categoryService),
                import('../services/walletService.js').then(m => m.walletService),
                import('../services/creditEngine.js').then(m => m.creditEngine)
            ]).then(([transactionService, categoryService, walletService, creditEngine]) => {
                const listEl = document.getElementById('transactions-list');
                const chipsEl = document.getElementById('chips-container');
                
                Promise.all([
                    transactionService.getTransactions(),
                    categoryService.getCategories(),
                    walletService.getWallets()
                ]).then(([txs, cats, wallets]) => {
                    if(!listEl) return;
                    
                    // Populate Filters
                    const catSelect = document.getElementById('filter-category');
                    if(catSelect) {
                        cats.forEach(c => {
                            const opt = document.createElement('option');
                            opt.value = c.id;
                            opt.textContent = c.name;
                            catSelect.appendChild(opt);
                        });
                    }
                    const walSelect = document.getElementById('filter-wallet');
                    if(walSelect) {
                        wallets.forEach(w => {
                            const opt = document.createElement('option');
                            opt.value = w.id;
                            opt.textContent = w.name;
                            walSelect.appendChild(opt);
                        });
                    }

                    // Global State
                    let filterState = {
                        search: '',
                        period: 'month',
                        type: 'all',
                        status: 'all',
                        category: 'all',
                        wallet: 'all',
                        sort: 'date_desc'
                    };

                    // Setup actions (edit/delete)
                    window.deleteTx = async (txId) => {
                        const tx = displayTxs.find(t => t.id === txId);
                        const masterId = tx?.parentId || txId;
                        if(await window.appConfirm('Excluir', "Tem certeza que deseja excluir esta transação?", { type: 'danger', confirmText: 'Excluir' })) {
                            await transactionService.deleteTransaction(masterId);
                            toast.show("Excluída com sucesso.");
                            navigation.replace('/transactions'); 
                        }
                    };

                    window.editTx = (txId) => {
                        const tx = displayTxs.find(t => t.id === txId);
                        const masterId = tx?.parentId || txId;
                        const masterTx = txs.find(t => t.id === masterId);
                        if(masterTx) {
                            window.__txToEdit = masterTx;
                            navigation.go('/transactions/new');
                        }
                    };
                    
                    window.removeFilter = (key) => {
                        if (key === 'search') {
                            filterState.search = '';
                            document.getElementById('tx-search-input').value = '';
                        } else {
                            filterState[key] = 'all';
                            const selectEl = document.getElementById(`filter-${key}`);
                            if(selectEl) selectEl.value = 'all';
                        }
                        renderList();
                    };

                    window.manageInstallments = (parentId) => {
                        const masterTx = txs.find(t => t.id === parentId);
                        if (!masterTx) return;
                        
                        const wallet = wallets.find(w => w.id === masterTx.walletId);
                        if (!wallet || wallet.type !== 'credit_card') return;

                        const expanded = creditEngine.expandTransaction(masterTx, wallet);
                        const listContainer = document.getElementById('installments-list-container');
                        let html = '';

                        expanded.forEach(inst => {
                            if (inst.isAnticipated) {
                                html += `
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: var(--radius-md); opacity: 0.6;">
                                        <div>
                                            <div style="font-weight: 600; font-size: 0.9rem;">Parcela ${inst.installmentNumber}/${inst.installmentCount}</div>
                                            <div style="font-size: 0.75rem; color: var(--success);"><i class="fas fa-check-circle"></i> Antecipada</div>
                                        </div>
                                        <div style="font-weight: 700; color: var(--text-secondary);">R$ ${inst.amount.toFixed(2)}</div>
                                    </div>
                                `;
                            } else {
                                html += `
                                    <label style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--surface-color); border: 1px solid var(--border-color); border-radius: var(--radius-md); cursor: pointer;">
                                        <div style="display: flex; align-items: center; gap: 0.75rem;">
                                            <input type="checkbox" class="anticipate-cb" value="${inst.installmentNumber}" data-amount="${inst.amount}" style="width: 1.2rem; height: 1.2rem; accent-color: var(--primary);">
                                            <div>
                                                <div style="font-weight: 600; font-size: 0.9rem;">Parcela ${inst.installmentNumber}/${inst.installmentCount}</div>
                                                <div style="font-size: 0.75rem; color: var(--text-secondary);">Fatura: ${inst.invoiceId}</div>
                                            </div>
                                        </div>
                                        <div style="font-weight: 700; color: var(--text-primary);">R$ ${inst.amount.toFixed(2)}</div>
                                    </label>
                                `;
                            }
                        });

                        listContainer.innerHTML = html;

                        const btnConfirm = document.getElementById('btn-anticipate-installments');
                        btnConfirm.onclick = async () => {
                            const cbs = document.querySelectorAll('.anticipate-cb:checked');
                            if (cbs.length === 0) {
                                toast.info("Nenhuma parcela selecionada.");
                                return;
                            }

                            btnConfirm.disabled = true;
                            btnConfirm.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processando...';

                            try {
                                const selectedNumbers = Array.from(cbs).map(cb => parseInt(cb.value));
                                const totalAnticipatedAmount = Array.from(cbs).reduce((sum, cb) => sum + parseFloat(cb.dataset.amount), 0);
                                
                                // Atualiza a transação original
                                const paidInst = masterTx.paidInstallments || [];
                                const newPaidInst = [...paidInst, ...selectedNumbers];
                                
                                await transactionService.updateTransaction(masterTx.id, {
                                    ...masterTx,
                                    paidInstallments: newPaidInst
                                });

                                // Gera a cobrança avulsa na fatura atual como despesa antecipada
                                // Isso fará com que o valor seja cobrado na fatura atual (reduzindo limite disponível)
                                const now = new Date();
                                await transactionService.createTransaction({
                                    type: 'expense',
                                    amount: totalAnticipatedAmount,
                                    description: `Antecipação: ${masterTx.description} (${selectedNumbers.join(',')}/${masterTx.installments})`,
                                    walletId: masterTx.walletId,
                                    categoryId: masterTx.categoryId, // Mantém a categoria original
                                    date: now.toISOString().split('T')[0] // Entra na fatura de hoje
                                });

                                toast.success("Parcelas antecipadas para a fatura atual!");
                                
                                // Refresh na página
                                navigation.replace('/transactions');
                            } catch(e) {
                                toast.error("Erro ao antecipar parcelas.");
                                btnConfirm.disabled = false;
                                btnConfirm.innerHTML = 'Antecipar Selecionadas';
                            }
                        };

                        document.getElementById('sheet-installments').classList.add('open');
                        document.getElementById('sheet-overlay').classList.add('open');
                    };

                    // Expanded txs base
                    let displayTxs = [];
                    txs.forEach(tx => {
                        const wallet = wallets.find(w => w.id === tx.walletId);
                        if (wallet?.type === 'credit_card') {
                            const expanded = creditEngine.expandTransaction(tx, wallet);
                            displayTxs.push(...expanded);
                        } else {
                            displayTxs.push(tx);
                        }
                    });

                    const renderList = () => {
                        // 1. Filter
                        let filtered = displayTxs.filter(tx => {
                            // Status
                            if(filterState.status !== 'all') {
                                if(filterState.status === 'paid' && tx.status !== 'paid') return false;
                                if(filterState.status === 'pending' && tx.status !== 'pending') return false;
                            }
                            // Type
                            if(filterState.type !== 'all' && tx.type !== filterState.type) return false;
                            // Category
                            if(filterState.category !== 'all' && tx.categoryId !== filterState.category) return false;
                            // Wallet
                            if(filterState.wallet !== 'all' && tx.walletId !== filterState.wallet) return false;
                            // Period
                            if(filterState.period !== 'all') {
                                const d = new Date(tx.date);
                                const now = new Date();
                                if(filterState.period === 'today') {
                                    if(d.toDateString() !== now.toDateString()) return false;
                                } else if(filterState.period === 'week') {
                                    const diff = now - d;
                                    if(diff > 7 * 24 * 60 * 60 * 1000 || diff < 0) return false;
                                } else if(filterState.period === 'month') {
                                    if(d.getMonth() !== now.getMonth() || d.getFullYear() !== now.getFullYear()) return false;
                                } else if(filterState.period === 'year') {
                                    if(d.getFullYear() !== now.getFullYear()) return false;
                                }
                            }
                            // Search
                            if(filterState.search.trim() !== '') {
                                const q = filterState.search.toLowerCase();
                                const cName = cats.find(c => c.id === tx.categoryId)?.name?.toLowerCase() || '';
                                const wName = wallets.find(w => w.id === tx.walletId)?.name?.toLowerCase() || '';
                                const desc = (tx.description || '').toLowerCase();
                                const obs = (tx.notes || '').toLowerCase();
                                const val = tx.amount.toString();
                                if(!desc.includes(q) && !cName.includes(q) && !wName.includes(q) && !val.includes(q) && !obs.includes(q)) return false;
                            }
                            return true;
                        });

                        // 2. Sort
                        filtered.sort((a, b) => {
                            if(filterState.sort === 'date_desc') return new Date(b.date) - new Date(a.date);
                            if(filterState.sort === 'date_asc') return new Date(a.date) - new Date(b.date);
                            if(filterState.sort === 'val_desc') return b.amount - a.amount;
                            if(filterState.sort === 'val_asc') return a.amount - b.amount;
                            if(filterState.sort === 'az') return (a.description || '').localeCompare(b.description || '');
                            if(filterState.sort === 'za') return (b.description || '').localeCompare(a.description || '');
                            return 0;
                        });

                        // 3. Render Chips
                        if(chipsEl) {
                            chipsEl.innerHTML = '';
                            const mapLabels = {
                                period: { today: 'Hoje', week: 'Semana', month: 'Mês', year: 'Ano' },
                                type: { income: 'Receita', expense: 'Despesa' },
                                status: { paid: 'Pago', pending: 'Pendente' }
                            };
                            
                            Object.keys(filterState).forEach(k => {
                                if(k === 'sort' || filterState[k] === 'all' || filterState[k] === '') return;
                                
                                let label = '';
                                if(k === 'search') label = `"${filterState[k]}"`;
                                else if(mapLabels[k]) label = mapLabels[k][filterState[k]];
                                else if(k === 'category') label = cats.find(c=>c.id===filterState[k])?.name || '';
                                else if(k === 'wallet') label = wallets.find(w=>w.id===filterState[k])?.name || '';

                                chipsEl.innerHTML += `
                                    <div class="filter-chip">
                                        ${label} <i class="fas fa-times" onclick="window.removeFilter('${k}')"></i>
                                    </div>
                                `;
                            });
                        }

                        // 4. Render DOM
                        listEl.innerHTML = '';
                        if (filtered.length === 0) {
                            listEl.innerHTML = '<p style="text-align:center; color: var(--text-secondary); margin-top: 2rem;">Nenhuma transação encontrada com estes filtros.</p>';
                            return;
                        }

                        // Group by Date for better visual (like Timeline)
                        let lastDate = null;
                        filtered.forEach(tx => {
                            const dateStr = tx.date;
                            if(dateStr !== lastDate) {
                                const dObj = new Date(dateStr);
                                const dFmt = dObj.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
                                listEl.innerHTML += `<p style="font-size: 0.875rem; color: var(--text-secondary); font-weight: 600; margin: 1.5rem 0 0.75rem;">${dFmt}</p>`;
                                lastDate = dateStr;
                            }

                            const el = document.createElement('div');
                            el.className = 'list-item';
                            
                            const icon = tx.type === 'expense' ? 'fa-arrow-up' : 'fa-arrow-down';
                            const color = tx.type === 'expense' ? 'var(--error)' : 'var(--success)';
                            
                            const categoryName = cats.find(c => c.id === tx.categoryId)?.name || 'Outros';
                            const walletName = wallets.find(w => w.id === tx.walletId)?.name || '';
                            const isPending = tx.status === 'pending';
                            const statusBadge = isPending ? `<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.65rem; font-weight: 700; margin-left: 0.5rem;">AGENDADO</span>` : '';
                            const opacity = isPending ? '0.7' : '1';

                            el.innerHTML = `
                                <div class="list-item-left" style="opacity: ${opacity}">
                                    <div class="list-icon" style="background: ${color}15; color: ${color};">
                                        <i class="fas ${icon}"></i>
                                    </div>
                                    <div class="list-content">
                                        <p class="list-title" style="display: flex; align-items: center;">${tx.description} ${statusBadge}</p>
                                        <p class="list-subtitle">${categoryName} • ${walletName}</p>
                                    </div>
                                </div>
                                <div class="list-action">
                                    <p class="list-value" style="color: ${color}; opacity: ${opacity}">
                                        ${tx.type === 'expense' ? '-' : '+'} R$ ${parseFloat(tx.amount).toFixed(2)}
                                    </p>
                                    <div style="display: flex; gap: 0.25rem; justify-content: flex-end; margin-top: 0.25rem;">
                                        ${tx.installmentCount > 1 ? `<button class="icon-btn-small" style="color: var(--primary);" onclick="window.manageInstallments('${tx.parentId}')" title="Gerenciar Parcelas"><i class="fas fa-layer-group"></i></button>` : ''}
                                        <button class="icon-btn-small" onclick="window.editTx('${tx.id}')"><i class="fas fa-edit"></i></button>
                                        <button class="icon-btn-small" style="color: var(--error);" onclick="window.deleteTx('${tx.id}')"><i class="fas fa-trash"></i></button>
                                    </div>
                                </div>
                            `;
                            listEl.appendChild(el);
                        });
                    };

                    // Initial Render
                    renderList();

                    // Event Listeners
                    const searchInput = document.getElementById('tx-search-input');
                    if(searchInput) {
                        searchInput.addEventListener('keyup', (e) => {
                            filterState.search = e.target.value;
                            renderList();
                        });
                    }

                    const btnApply = document.getElementById('btn-apply-filters');
                    if(btnApply) {
                        btnApply.addEventListener('click', () => {
                            filterState.period = document.getElementById('filter-period').value;
                            filterState.type = document.getElementById('filter-type').value;
                            filterState.status = document.getElementById('filter-status').value;
                            filterState.category = document.getElementById('filter-category').value;
                            filterState.wallet = document.getElementById('filter-wallet').value;
                            
                            document.getElementById('sheet-filter').classList.remove('open');
                            document.getElementById('sheet-overlay').classList.remove('open');
                            renderList();
                        });
                    }

                    document.querySelectorAll('input[name="tx_sort"]').forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            if(e.target.checked) {
                                filterState.sort = e.target.value;
                                document.getElementById('sheet-sort').classList.remove('open');
                                document.getElementById('sheet-overlay').classList.remove('open');
                                renderList();
                            }
                        });
                    });

                });
            });
        }
    },
    '/transactions/new': {
        templateUrl: './pages/transaction-form.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/transactionService.js').then(m => m.transactionService),
                import('../services/smartAssistant.js').then(m => m.smartAssistant),
                import('../services/categoryService.js').then(m => m.categoryService),
                import('../services/walletService.js').then(m => m.walletService),
                import('../services/creditEngine.js').then(m => m.creditEngine)
            ]).then(([transactionService, smartAssistant, categoryService, walletService, creditEngine]) => {
                
                let currentType = window.__quickAddType || 'expense';
                window.__quickAddType = null; // Reset after reading

                // Lógica dos Botões Segmentados (Toggle)
                const typeBtns = document.querySelectorAll('.type-btn');
                
                // Pré-selecionar o botão correto (Quick Action)
                const initialBtn = Array.from(typeBtns).find(b => b.dataset.value === currentType);
                if (initialBtn) {
                    typeBtns.forEach(b => b.classList.remove('active', 'expense', 'income'));
                    initialBtn.classList.add('active', currentType);
                }

                let walletsData = [];
                let categoriesData = [];
                let currentTransactions = [];

                const catSelect = document.getElementById('tx-category');
                const walletSelect = document.getElementById('tx-wallet');
                const installmentsRow = document.getElementById('installments-row');
                const installmentsSelect = document.getElementById('tx-installments');
                const simulationBox = document.getElementById('credit-simulation-box');
                const simulationContent = document.getElementById('credit-simulation-content');
                const amountInput = document.getElementById('tx-amount');

                window.openSheet = (id) => {
                    const overlay = document.getElementById('sheet-overlay');
                    const sheet = document.getElementById(id);
                    if(overlay && sheet) {
                        overlay.classList.add('active');
                        sheet.classList.add('active');
                    }
                    if(document.activeElement) document.activeElement.blur();
                };
                window.closeAllSheets = () => {
                    const overlay = document.getElementById('sheet-overlay');
                    if(overlay) overlay.classList.remove('active');
                    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('active'));
                };

                const updateCategoriesDropdown = () => {
                    if (!categoriesData || !catSelect) return;
                    
                    const filteredCats = categoriesData.filter(c => c.type === currentType);
                    
                    catSelect.innerHTML = '';
                    filteredCats.forEach(cat => {
                        const opt = document.createElement('option');
                        opt.value = cat.id;
                        opt.textContent = cat.name;
                        opt.dataset.icon = cat.icon || 'fa-tag';
                        opt.dataset.color = cat.color || '#94a3b8';
                        catSelect.appendChild(opt);
                    });

                    // Populate custom bottom sheet
                    const catSheetList = document.getElementById('category-sheet-list');
                    if (catSheetList) {
                        catSheetList.innerHTML = '';
                        filteredCats.forEach(cat => {
                            const div = document.createElement('div');
                            div.className = 'sheet-item';
                            div.innerHTML = `<span class="sheet-color-dot" style="background: ${cat.color}"></span> ${cat.name}`;
                            div.onclick = () => {
                                document.getElementById('tx-category').value = cat.id;
                                document.getElementById('tx-category').dispatchEvent(new Event('change'));
                                window.closeAllSheets();
                            };
                            catSheetList.appendChild(div);
                        });
                    }

                    // Select first if current not found
                    if (catSelect.options.length > 0) {
                        const hasCurrent = Array.from(catSelect.options).some(o => o.value === catSelect.value);
                        if (!hasCurrent) catSelect.selectedIndex = 0;
                        catSelect.dispatchEvent(new Event('change'));
                    }
                };

                const loadSelects = async () => {
                    const [cats, wallets, txs] = await Promise.all([
                        categoryService.getCategories(),
                        walletService.getWallets(),
                        transactionService.getTransactions()
                    ]);
                    
                    walletsData = wallets;
                    categoriesData = cats;
                    currentTransactions = txs;
                    
                    updateCategoriesDropdown();

                    walletSelect.innerHTML = '';
                    walletsData.forEach(w => {
                        const opt = document.createElement('option');
                        opt.value = w.id;
                        opt.textContent = w.name;
                        opt.dataset.icon = w.type === 'credit_card' ? 'fa-credit-card' : 'fa-university';
                        opt.dataset.color = w.type === 'credit_card' ? 'var(--primary)' : 'var(--success)';
                        walletSelect.appendChild(opt);
                    });

                    // Populate wallet custom bottom sheet
                    const walletSheetList = document.getElementById('wallet-sheet-list');
                    if (walletSheetList) {
                        walletSheetList.innerHTML = '';
                        walletsData.forEach(wallet => {
                            const div = document.createElement('div');
                            div.className = 'sheet-item';
                            const iconClass = wallet.type === 'credit_card' ? 'fa-credit-card' : 'fa-university';
                            const color = wallet.type === 'credit_card' ? 'var(--primary)' : 'var(--success)';
                            div.innerHTML = `<i class="fas ${iconClass}" style="color: ${color}; width: 24px; text-align: center;"></i> ${wallet.name}`;
                            div.onclick = () => {
                                document.getElementById('tx-wallet').value = wallet.id;
                                document.getElementById('tx-wallet').dispatchEvent(new Event('change'));
                                window.closeAllSheets();
                            };
                            walletSheetList.appendChild(div);
                        });
                    }
                    if (walletSelect.options.length > 0) {
                        walletSelect.dispatchEvent(new Event('change'));
                    }
                };
                
                if (catSelect) {
                    catSelect.addEventListener('change', (e) => {
                        const opt = e.target.options[e.target.selectedIndex];
                        if (!opt) return;
                        document.getElementById('label-category').textContent = opt.text;
                        const iconCat = document.querySelector('.icon-cat');
                        if (iconCat) {
                            iconCat.innerHTML = `<i class="fas ${opt.dataset.icon || 'fa-tag'}"></i>`;
                            iconCat.style.color = opt.dataset.color || '#f59e0b';
                            iconCat.style.background = `${opt.dataset.color || '#f59e0b'}20`;
                        }
                    });
                }
                
                if (walletSelect) {
                    walletSelect.addEventListener('change', (e) => {
                        const opt = e.target.options[e.target.selectedIndex];
                        if (!opt) return;
                        document.getElementById('label-wallet').textContent = opt.text;
                        const iconWal = document.querySelector('.icon-wal');
                        if (iconWal) {
                            iconWal.innerHTML = `<i class="fas ${opt.dataset.icon || 'fa-university'}"></i>`;
                            iconWal.style.color = opt.dataset.color || '#3b82f6';
                            iconWal.style.background = `${opt.dataset.color || '#3b82f6'}20`;
                        }
                    });
                }

                typeBtns.forEach(btn => {
                    btn.addEventListener('click', () => {
                        typeBtns.forEach(b => b.classList.remove('active', 'expense', 'income'));
                        
                        currentType = btn.dataset.value;
                        btn.classList.add('active', currentType);
                        updateCategoriesDropdown(); // Dynamic category filtering
                        updateSimulation(); // Check simulation again
                    });
                });
                
                // Smart Assistant Listener
                const txDesc = document.getElementById('tx-desc');
                const aiIndicator = document.getElementById('ai-indicator');
                const descBox = document.getElementById('desc-box');

                if (txDesc) {
                    let debounceTimer;
                    txDesc.addEventListener('keyup', () => {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            const val = txDesc.value;
                            const prediction = smartAssistant.predict(val);

                            if (prediction) {
                                let filled = false;

                                if (amountInput.value === '' || parseFloat(amountInput.value) === 0) {
                                    amountInput.value = prediction.amount;
                                    filled = true;
                                }

                                if (prediction.type && prediction.type !== currentType) {
                                    const targetBtn = Array.from(typeBtns).find(b => b.dataset.value === prediction.type);
                                    if (targetBtn) targetBtn.click();
                                    filled = true;
                                }

                                if (prediction.categoryId && catSelect) {
                                    catSelect.value = prediction.categoryId;
                                    catSelect.dispatchEvent(new Event('change'));
                                    filled = true;
                                }

                                if (prediction.walletId && walletSelect) {
                                    walletSelect.value = prediction.walletId;
                                    walletSelect.dispatchEvent(new Event('change'));
                                    filled = true;
                                }

                                if (prediction.frequency) {
                                    const recurCheckbox = document.getElementById('tx-is-recurring');
                                    if (recurCheckbox && !recurCheckbox.checked) {
                                        recurCheckbox.checked = true;
                                        recurCheckbox.dispatchEvent(new Event('change'));
                                        const freqSelect = document.getElementById('tx-frequency');
                                        if (freqSelect) {
                                            freqSelect.value = prediction.frequency;
                                            freqSelect.dispatchEvent(new Event('change'));
                                        }
                                        filled = true;
                                    }
                                }

                                if (filled) {
                                    descBox.classList.remove('ai-filled'); 
                                    void descBox.offsetWidth; 
                                    descBox.classList.add('ai-filled');
                                    aiIndicator.classList.add('visible');
                                    
                                    setTimeout(() => {
                                        descBox.classList.remove('ai-filled');
                                        setTimeout(() => aiIndicator.classList.remove('visible'), 3000);
                                    }, 1500);
                                }
                            }
                        }, 300);
                    });
                }

                    const updateSimulation = () => {
                        // Tratar esconder/mostrar toggle de "Conta Paga" para Receitas
                        const paidRow = document.getElementById('paid-toggle-row');
                        if (paidRow) {
                            if (currentType === 'income') {
                                paidRow.style.display = 'none';
                            } else {
                                paidRow.style.display = 'flex';
                            }
                        }

                        if (!walletSelect || !amountInput || !walletsData.length) return;
                        
                        const wId = walletSelect.value;
                        const wallet = walletsData.find(w => w.id === wId);
                        
                        if (wallet?.type === 'credit_card' && currentType === 'expense') {
                            installmentsRow.style.display = 'block';
                            
                            const amount = parseFloat(amountInput.value) || 0;
                            if (amount > 0) {
                                simulationBox.style.display = 'block';
                                
                                const engineState = creditEngine.processCard(wallet, currentTransactions);
                                const installments = parseInt(installmentsSelect?.value) || 1;
                                const today = new Date().toISOString().split('T')[0];
                                
                                const sim = creditEngine.simulatePurchase(wallet, engineState.usedLimit, amount, installments, today);
                                const bestDay = creditEngine.getBestPurchaseDay(wallet);
                                const isBestDay = new Date().getDate() === bestDay;
                                
                                const invoiceKeys = Object.keys(sim.invoiceImpact).sort();
                                const firstInvoice = invoiceKeys[0];
                                const lastInvoice = invoiceKeys[invoiceKeys.length - 1];
                                const installmentValue = (amount / installments).toFixed(2);
                                
                                const newAvailable = Math.max(0, engineState.totalLimit - sim.newUsedLimit);
                                
                                let alertClass = "var(--success)";
                                let alertIcon = "fa-check-circle";
                                if (sim.newProgress > 80) {
                                    alertClass = "var(--error)";
                                    alertIcon = "fa-exclamation-triangle";
                                } else if (sim.newProgress > 50) {
                                    alertClass = "#f59e0b"; // yellow
                                    alertIcon = "fa-exclamation-circle";
                                }

                                let html = `
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                                        <div style="background: var(--bg-color); padding: 0.75rem; border-radius: var(--radius-md);">
                                            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Parcelas</div>
                                            <div style="font-size: 1.1rem; font-weight: 700;">${installments}x de R$ ${installmentValue}</div>
                                        </div>
                                        <div style="background: var(--bg-color); padding: 0.75rem; border-radius: var(--radius-md);">
                                            <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase;">Limite Restante</div>
                                            <div style="font-size: 1.1rem; font-weight: 700; color: ${alertClass}">R$ ${newAvailable.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    <div style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
                                        <strong>1ª Cobrança:</strong> Fatura ${firstInvoice}<br>
                                        ${installments > 1 ? `<strong>Última Parcela:</strong> Fatura ${lastInvoice}` : ''}
                                    </div>
                                    <div style="padding: 0.5rem; background: ${alertClass}15; color: ${alertClass}; border-radius: var(--radius-sm); font-size: 0.85rem; font-weight: 600; display: flex; align-items: center; gap: 0.5rem;">
                                        <i class="fas ${alertIcon}"></i>
                                        <span>Limite comprometido passará a ${sim.newProgress.toFixed(1)}%</span>
                                    </div>
                                `;
                                
                                if (isBestDay) {
                                    html += `<div style="margin-top: 0.5rem; color: var(--success); font-size: 0.85rem; font-weight: 600;"><i class="fas fa-calendar-check"></i> Hoje é o melhor dia para compra!</div>`;
                                }

                                simulationContent.innerHTML = html;
                            } else {
                                simulationBox.style.display = 'none';
                            }
                        } else {
                            installmentsRow.style.display = 'none';
                            simulationBox.style.display = 'none';
                        }
                    };

                // Triggers da simulação
                walletSelect?.addEventListener('change', updateSimulation);
                amountInput?.addEventListener('input', updateSimulation);
                installmentsSelect?.addEventListener('change', updateSimulation);
                typeBtns.forEach(b => b.addEventListener('click', updateSimulation));

                loadSelects().then(() => {
                    updateSimulation(); // Rodar no load inicial
                    
                    const dateInput = document.getElementById('tx-date');
                    if (dateInput && !window.__txToEdit) {
                        dateInput.value = new Date().toISOString().split('T')[0];
                        dateInput.dispatchEvent(new Event('change'));
                    }

                    // Forçar atualização dos labels dos selects
                    const triggerChange = (id) => {
                        const el = document.getElementById(id);
                        if(el) el.dispatchEvent(new Event('change'));
                    };
                    triggerChange('tx-category');
                    triggerChange('tx-wallet');

                    // Pre-fill form se for Edição
                    if (window.__txToEdit) {
                        const tx = window.__txToEdit;
                        document.querySelector('.title').textContent = "Editar lançamento";
                        
                        const typeBtn = Array.from(typeBtns).find(b => b.dataset.value === tx.type);
                        if(typeBtn) typeBtn.click();

                        const amountInput = document.getElementById('tx-amount');
                        const descInput = document.getElementById('tx-desc');
                        
                        if(amountInput) amountInput.value = tx.amount;
                        if(descInput) descInput.value = tx.description;
                        if(catSelect) { catSelect.value = tx.categoryId; triggerChange('tx-category'); }
                        if(walletSelect) { walletSelect.value = tx.walletId; triggerChange('tx-wallet'); }

                        const isPaidInput = document.getElementById('tx-is-paid');
                        const isRecurringInput = document.getElementById('tx-is-recurring');
                        
                        if(dateInput && tx.date) { dateInput.value = tx.date; triggerChange('tx-date'); }
                        if(isPaidInput) isPaidInput.checked = tx.status === 'paid';
                        if(isRecurringInput) {
                            isRecurringInput.checked = !!tx.frequency;
                            isRecurringInput.dispatchEvent(new Event('change'));
                            const freqSelect = document.getElementById('tx-frequency');
                            if(freqSelect && tx.frequency) { freqSelect.value = tx.frequency; triggerChange('tx-frequency'); }
                        }
                    }
                });

                // Lógica de Salvar Transação
                document.getElementById('btn-save-tx')?.addEventListener('click', async () => {
                    const amountInput = document.getElementById('tx-amount');
                    const descInput = document.getElementById('tx-desc');
                    const catSelect = document.getElementById('tx-category');
                    const walletSelect = document.getElementById('tx-wallet');

                    const amountVal = parseFloat(amountInput.value);
                    if(!amountVal || amountVal <= 0) {
                        toast.error("Por favor, informe um valor válido.");
                        return;
                    }
                    
                    const descVal = descInput.value || 'Nova Transação';

                    // Level 4: Credit Limit Warning
                    const wId = walletSelect.value;
                    const wallet = walletsData.find(w => w.id === wId);
                    if (wallet?.type === 'credit_card' && currentType === 'expense') {
                        const engineState = creditEngine.processCard(wallet, currentTransactions);
                        const installments = installmentsRow.style.display !== 'none' ? parseInt(installmentsSelect.value) : 1;
                        const dateVal = document.getElementById('tx-date')?.value || new Date().toISOString().split('T')[0];
                        const sim = creditEngine.simulatePurchase(wallet, engineState.usedLimit, amountVal, installments, dateVal);
                        
                        if (sim.newProgress > 80 && !window.__txToEdit) {
                            const proceed = await window.appConfirm('Assistente Inteligente', `Essa compra comprometerá ${sim.newProgress.toFixed(1)}% do limite do cartão ${wallet.name}.\n\nDeseja continuar com o lançamento?`, { type: 'ai', confirmText: 'Continuar' });
                            if (!proceed) {
                                return;
                            }
                        }
                    }

                    // Level 2: Recurring Habit Detection
                    const isRec = document.getElementById('tx-is-recurring')?.checked;
                    if (currentType === 'expense' && !isRec && !window.__txToEdit && smartAssistant.detectRecurring) {
                        const suggestedFreq = smartAssistant.detectRecurring(descVal);
                        if (suggestedFreq) {
                            const automate = await window.appConfirm('Assistente Inteligente', `Notei que você registra "${descVal}" com bastante frequência.\n\nDeseja automatizar transformando essa despesa em uma assinatura/conta recorrente mensal?`, { type: 'ai', confirmText: 'Automatizar' });
                            if (automate) {
                                document.getElementById('tx-is-recurring').checked = true;
                                document.getElementById('tx-frequency').value = suggestedFreq;
                            }
                        }
                    }

                    // Botão Loader
                    const saveBtn = document.getElementById('btn-save-tx');
                    saveBtn.disabled = true;
                    saveBtn.textContent = 'Salvando...';

                    try {
                        const txData = {
                            type: currentType,
                            amount: amountVal,
                            description: descVal,
                            categoryId: catSelect.value,
                            walletId: walletSelect.value,
                            installments: installmentsRow.style.display !== 'none' ? parseInt(installmentsSelect.value) : 1,
                            date: document.getElementById('tx-date')?.value || new Date().toISOString().split('T')[0],
                            isPaid: currentType === 'income' ? true : (document.getElementById('tx-is-paid')?.checked !== false),
                            isRecurring: document.getElementById('tx-is-recurring')?.checked === true,
                            frequency: document.getElementById('tx-frequency')?.value || 'monthly'
                        };

                        const txToEdit = window.__txToEdit;
                        let tx;
                        if (txToEdit) {
                            tx = await transactionService.updateTransaction(txToEdit.id, txData);
                            toast.success("Transação atualizada!");
                            window.__txToEdit = null; // Clear state
                        } else {
                            tx = await transactionService.createTransaction(txData);
                            toast.success("Lançamento concluído!");
                        }
                        
                        navigation.replace('/dashboard');
                    } catch (e) {
                        toast.error("Erro ao salvar lançamento.");
                        saveBtn.disabled = false;
                        saveBtn.textContent = 'Salvar Transação';
                    }
                });
            });
        }
    },
    '/pay-invoice': {
        templateUrl: './pages/pay-invoice.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/walletService.js').then(m => m.walletService),
                import('../services/creditCardService.js').then(m => m.creditCardService),
                import('../services/transactionService.js').then(m => m.transactionService)
            ]).then(([walletService, creditCardService, transactionService]) => {
                const sourceInput = document.getElementById('pay-source-wallet');
                const destInput = document.getElementById('pay-dest-card');
                const sourceDisplay = document.getElementById('display-source-wallet');
                const destDisplay = document.getElementById('display-dest-card');
                const cardsList = document.getElementById('cards-list-container');
                const walletsList = document.getElementById('wallets-list-container');
                
                const amountInput = document.getElementById('pay-amount');
                const btnPayFull = document.getElementById('btn-pay-full');
                const btn = document.getElementById('btn-confirm-payment');

                let cardSummaries = {};

                const closeSheets = () => {
                    document.querySelectorAll('.bottom-sheet').forEach(s => s.classList.remove('open'));
                    document.getElementById('sheet-overlay')?.classList.remove('open');
                };

                walletService.getWallets().then(async wallets => {
                    const checking = wallets.filter(w => w.type !== 'credit_card');
                    const cards = wallets.filter(w => w.type === 'credit_card');

                    let walletsHtml = '';
                    checking.forEach(w => {
                        walletsHtml += `
                            <div class="sheet-item" onclick="window.selectSourceWallet('${w.id}', '${w.name}')">
                                <div class="sheet-item-icon"><i class="fas fa-landmark"></i></div>
                                <div>
                                    <div style="font-weight:600; color: var(--text-primary);">${w.name}</div>
                                    <div style="font-size:0.8rem; color: var(--text-secondary);">Saldo: R$ ${w.currentBalance.toFixed(2)}</div>
                                </div>
                            </div>
                        `;
                    });
                    if(walletsList) walletsList.innerHTML = walletsHtml;

                    window.selectSourceWallet = (id, name) => {
                        if(sourceInput) sourceInput.value = id;
                        if(sourceDisplay) sourceDisplay.textContent = name;
                        closeSheets();
                    };

                    let totalInvoice = 0;
                    let cardsHtml = '';
                    for (const c of cards) {
                        const summary = await creditCardService.getCardSummary(c.id);
                        cardSummaries[c.id] = summary;
                        totalInvoice += summary.openInvoice;
                        
                        cardsHtml += `
                            <div class="sheet-item" onclick="window.selectDestCard('${c.id}', '${c.name}', ${summary.openInvoice})">
                                <div class="sheet-item-icon"><i class="fas fa-credit-card"></i></div>
                                <div>
                                    <div style="font-weight:600; color: var(--text-primary);">${c.name}</div>
                                    <div style="font-size:0.8rem; color: var(--error);">Fatura Atual: R$ ${summary.openInvoice.toFixed(2)}</div>
                                </div>
                            </div>
                        `;
                    }
                    if(cardsList) cardsList.innerHTML = cardsHtml;

                    const updateVal = () => {
                        const selectedId = destInput.value;
                        if(cardSummaries[selectedId]) {
                            amountInput.value = cardSummaries[selectedId].openInvoice.toFixed(2);
                        }
                    };

                    window.selectDestCard = (id, name, invoiceVal) => {
                        if(destInput) destInput.value = id;
                        if(destDisplay) destDisplay.textContent = `${name} (R$ ${invoiceVal.toFixed(2)})`;
                        closeSheets();
                        updateVal();
                    };

                    if(cards.length > 0) {
                        window.selectDestCard(cards[0].id, cards[0].name, cardSummaries[cards[0].id].openInvoice);
                    }
                    if(checking.length > 0) {
                        window.selectSourceWallet(checking[0].id, checking[0].name);
                    }
                    
                    btnPayFull?.addEventListener('click', updateVal);
                });

                btn?.addEventListener('click', async () => {
                    const sourceId = sourceInput.value;
                    const destId = destInput.value;
                    const amountToPay = parseFloat(amountInput.value) || 0;

                    if (amountToPay <= 0) {
                        toast.info("Informe um valor maior que zero.");
                        return;
                    }

                    btn.disabled = true;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pagando...';

                    try {
                        const invoiceId = cardSummaries[destId]?.currentInvoiceId || 'DESCONHECIDO';

                        await transactionService.createTransaction({
                            type: 'expense',
                            amount: amountToPay,
                            description: `Pagamento Fatura ${destDisplay.textContent.split('(')[0].trim()}`,
                            walletId: sourceId,
                            categoryId: 'C-PAYMENT'
                        });

                        await transactionService.createTransaction({
                            type: 'income',
                            amount: amountToPay,
                            description: `Pagamento Fatura ${invoiceId}`,
                            walletId: destId,
                            categoryId: 'C-PAYMENT'
                        });

                        toast.success("Pagamento registrado com sucesso!");
                        navigation.replace('/dashboard');
                    } catch(e) {
                        toast.error("Erro ao pagar fatura.");
                        btn.disabled = false;
                        btn.innerHTML = '<i class="fas fa-check-circle"></i> Confirmar Pagamento';
                    }
                });
            });
        }
    },
    '/analytics': {
        templateUrl: './pages/analytics.html',
        isProtected: true,
        init: () => {
            import('../services/analyticsService.js').then(({ analyticsService }) => {
                let chartInstances = {};

                const renderCharts = (filterVal) => {
                    analyticsService.getAnalyticsData(filterVal).then(data => {
                        const fmt = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
                        
                        // Update KPIs
                        const maxExpEl = document.getElementById('kpi-max-expense');
                        if(maxExpEl) {
                            maxExpEl.textContent = fmt(data.kpis.highestExpense.amount);
                            document.getElementById('kpi-max-expense-desc').textContent = data.kpis.highestExpense.description;
                            
                            document.getElementById('kpi-dominant-cat').textContent = data.kpis.dominantCategory;
                            document.getElementById('kpi-dominant-pct').textContent = 'Maior ofensor';
                            
                            document.getElementById('kpi-dod').textContent = `${data.kpis.dodPct > 0 ? '+' : ''}${data.kpis.dodPct.toFixed(1)}%`;
                            document.getElementById('kpi-dod').style.color = data.kpis.dodPct > 0 ? 'var(--error)' : 'var(--success)';
                            document.getElementById('kpi-dod-desc').textContent = 'vs. ontem';
                            
                            document.getElementById('kpi-max-income').textContent = fmt(data.kpis.highestIncome.amount);
                            document.getElementById('kpi-max-income-desc').textContent = data.kpis.highestIncome.description;

                            document.querySelectorAll('.skeleton-kpi').forEach(el => el.classList.remove('skeleton-kpi'));

                            // Configure Chart.js Defaults
                            Chart.defaults.color = '#94a3b8';
                            Chart.defaults.font.family = 'Poppins, sans-serif';

                            // Destroy old charts if exist
                            Object.values(chartInstances).forEach(chart => chart.destroy());
                            chartInstances = {};
                            
                            // 1. Evolução (Line)
                            const evoKeys = Object.keys(data.charts.evolution);
                            const evoIncome = evoKeys.map(k => data.charts.evolution[k].income);
                            const evoExpense = evoKeys.map(k => data.charts.evolution[k].expense);
                            
                            chartInstances.evo = new Chart(document.getElementById('chart-evolution'), {
                                type: 'line',
                                data: {
                                    labels: evoKeys,
                                    datasets: [
                                        { label: 'Receitas', data: evoIncome, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.1)', fill: true, tension: 0.4 },
                                        { label: 'Despesas', data: evoExpense, borderColor: '#ef4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', fill: true, tension: 0.4 }
                                    ]
                                },
                                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                            });

                            // 2. Balanço (Doughnut)
                            chartInstances.bal = new Chart(document.getElementById('chart-balance'), {
                                type: 'doughnut',
                                data: {
                                    labels: ['Receitas', 'Despesas'],
                                    datasets: [{
                                        data: [data.kpis.totalIncome, data.kpis.totalExpense],
                                        backgroundColor: ['#10b981', '#ef4444'],
                                        borderWidth: 0
                                    }]
                                },
                                options: { responsive: true, maintainAspectRatio: false, cutout: '70%', plugins: { legend: { position: 'bottom' } } }
                            });

                            // 3. Categorias (Bar)
                            const catKeys = Object.keys(data.charts.categoryTotals);
                            const catVals = catKeys.map(k => data.charts.categoryTotals[k]);
                            chartInstances.cat = new Chart(document.getElementById('chart-categories'), {
                                type: 'bar',
                                data: {
                                    labels: catKeys,
                                    datasets: [{
                                        label: 'Gastos',
                                        data: catVals,
                                        backgroundColor: '#8b5cf6',
                                        borderRadius: 6
                                    }]
                                },
                                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                            });

                            // 4. Carteiras (Pie)
                            const walKeys = Object.keys(data.charts.walletTotals);
                            const walVals = walKeys.map(k => data.charts.walletTotals[k]);
                            chartInstances.wal = new Chart(document.getElementById('chart-wallets'), {
                                type: 'pie',
                                data: {
                                    labels: walKeys,
                                    datasets: [{
                                        data: walVals,
                                        backgroundColor: ['#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'],
                                        borderWidth: 0
                                    }]
                                },
                                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
                            });
                        }
                    });
                };

                const filterEl = document.getElementById('analytics-time-filter');
                if(filterEl) {
                    filterEl.addEventListener('change', (e) => renderCharts(e.target.value));
                    renderCharts(filterEl.value);
                }
            });
        }
    },
    '/budgets': {
        templateUrl: './pages/budgets.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/budgetService.js').then(m => m.budgetService),
                import('../services/transactionService.js').then(m => m.transactionService),
                import('../services/categoryService.js').then(m => m.categoryService)
            ]).then(([budgetService, transactionService, categoryService]) => {
                const listEl = document.getElementById('budgets-list');
                const modal = document.getElementById('budget-modal');
                const btnNew = document.getElementById('btn-new-budget');
                const btnClose = document.getElementById('btn-close-budget');
                const btnSave = document.getElementById('btn-save-budget');
                const catSelect = document.getElementById('budget-category');

                let allCategories = [];
                let currentBudgets = [];

                const loadCategories = async () => {
                    allCategories = await categoryService.getCategories();
                    const expCats = allCategories.filter(c => c.type === 'expense');
                    if (catSelect) {
                        catSelect.innerHTML = expCats.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
                    }
                };

                const loadBudgets = async () => {
                    currentBudgets = await budgetService.getBudgets();
                    const txs = await transactionService.getTransactions();
                    
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();

                    // Soma os gastos reais do mês por categoria
                    const spentPerCat = {};
                    txs.forEach(tx => {
                        const d = new Date(tx.date);
                        if(tx.type === 'expense' && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
                            const c = tx.categoryId || 'Outros';
                            spentPerCat[c] = (spentPerCat[c] || 0) + tx.amount;
                        }
                    });

                    if(!listEl) return;
                    listEl.innerHTML = '';

                    if(currentBudgets.length === 0) {
                        listEl.innerHTML = `<p style="text-align: center; color: var(--text-secondary); margin-top: 2rem;">Nenhuma meta definida ainda.</p>`;
                        return;
                    }

                    currentBudgets.forEach(b => {
                        const spent = spentPerCat[b.categoryId] || 0;
                        const pct = b.limit > 0 ? (spent / b.limit) * 100 : 0;
                        const threshold = b.warningThreshold || 80;
                        
                        let color = 'var(--primary)';
                        if (pct > threshold) color = 'orange';
                        if (pct >= 100) color = 'var(--error)';

                        listEl.innerHTML += `
                            <div style="background: var(--surface-color); padding: 1.25rem; border-radius: var(--radius-md); border: 1px solid var(--border-color); margin-bottom: 1rem; box-shadow: var(--shadow-sm);">
                                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                                    <div style="font-weight: 600;">
                                        <div style="font-size: 1.05rem;">${b.categoryName}</div>
                                        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.25rem;">Aviso em ${threshold}%</div>
                                    </div>
                                    <div style="display: flex; gap: 0.75rem; align-items: center;">
                                        <button class="btn-edit-budget" data-id="${b.categoryId}" style="background: none; border: none; color: var(--primary); cursor: pointer;"><i class="fas fa-edit"></i></button>
                                        <button class="btn-delete-budget" data-id="${b.categoryId}" style="background: none; border: none; color: var(--error); cursor: pointer;"><i class="fas fa-trash-alt"></i></button>
                                    </div>
                                </div>
                                <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-weight: 600; font-size: 0.9rem;">
                                    <span>Gasto atual:</span>
                                    <span style="color: ${color}">R$ ${spent.toFixed(2)} / R$ ${b.limit.toFixed(2)}</span>
                                </div>
                                <div style="width: 100%; height: 8px; background: var(--border-color); border-radius: 4px; overflow: hidden;">
                                    <div style="width: ${Math.min(pct, 100)}%; height: 100%; background: ${color}; transition: width 1s ease;"></div>
                                </div>
                                ${pct >= 100 ? `<p style="color: var(--error); font-size: 0.75rem; margin-top: 0.5rem; margin-bottom: 0;">Você estourou a meta!</p>` : ''}
                            </div>
                        `;
                    });

                    // Event Listeners for Edit and Delete
                    document.querySelectorAll('.btn-edit-budget').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            const id = e.currentTarget.dataset.id;
                            const budget = currentBudgets.find(b => b.categoryId === id);
                            if(budget) {
                                document.getElementById('budget-category').value = budget.categoryId;
                                document.getElementById('budget-limit').value = budget.limit;
                                document.getElementById('budget-warning').value = budget.warningThreshold || 80;
                                modal?.showModal();
                            }
                        });
                    });

                    document.querySelectorAll('.btn-delete-budget').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            const id = e.currentTarget.dataset.id;
                            if(await window.appConfirm('Excluir', 'Tem certeza que deseja excluir esta meta?', { type: 'danger', confirmText: 'Excluir' })) {
                                try {
                                    await budgetService.deleteBudget(id);
                                    toast.success('Meta excluída!');
                                    loadBudgets();
                                } catch(err) {
                                    toast.error('Erro ao excluir.');
                                }
                            }
                        });
                    });
                };

                btnNew?.addEventListener('click', () => {
                    document.getElementById('budget-limit').value = '';
                    document.getElementById('budget-warning').value = '80';
                    if (catSelect && catSelect.options.length > 0) catSelect.selectedIndex = 0;
                    modal?.showModal();
                });
                btnClose?.addEventListener('click', () => modal?.close());
                
                btnSave?.addEventListener('click', async () => {
                    const catId = catSelect.value;
                    const catName = catSelect.options[catSelect.selectedIndex]?.text;
                    const limit = document.getElementById('budget-limit').value;
                    const warning = document.getElementById('budget-warning').value || 80;

                    if(!catId || !limit) return toast.error("Preencha categoria e limite.");
                    
                    btnSave.disabled = true;
                    btnSave.textContent = 'Salvando...';

                    try {
                        await budgetService.setBudget(catId, limit, catName, warning);
                        toast.success("Meta salva com sucesso!");
                        modal?.close();
                        loadBudgets();
                    } catch(e) {
                        toast.error("Erro ao salvar meta.");
                    } finally {
                        btnSave.disabled = false;
                        btnSave.textContent = 'Salvar';
                    }
                });

                loadCategories().then(loadBudgets);
            });
        }
    },
    '/dashboard': {
        templateUrl: './pages/dashboard.html',
        isProtected: true,
        init: () => {
            Promise.all([
                import('../services/dashboardService.js'),
                import('../core/eventBus.js'),
                import('../services/smartAssistant.js'),
                import('../services/notificationService.js')
            ]).then(([{ dashboardService }, { eventBus }, { smartAssistant }, { notificationService }]) => {
                
                const logoutBtn = document.getElementById('logout-btn');
                if(logoutBtn) {
                    logoutBtn.addEventListener('click', async () => {
                        await authService.logout();
                        toast.show("Você saiu da conta.", "info");
                        navigation.go('/login');
                    });
                }

                // Popular o nome do usuário
                const firstName = authService.currentUser?.displayName?.split(' ')[0] || 'Usuário';
                document.querySelectorAll('.user-display-name').forEach(el => {
                    el.textContent = firstName;
                });
                
                // NOTIFICATIONS LOGIC
                const btnNotifications = document.getElementById('btn-notifications');
                const badge = document.getElementById('notification-badge');
                const notifModal = document.getElementById('global-notification-center');
                const notifList = document.getElementById('notification-list');
                const btnMarkAll = document.getElementById('btn-mark-all-read');

                const renderNotifications = () => {
                    const notifs = notificationService.getNotifications();
                    const unread = notificationService.getUnreadCount();
                    const bellIcon = document.querySelector('#btn-notifications i.fa-bell');

                    if (badge) {
                        if (unread > 0) {
                            badge.textContent = unread > 99 ? '99+' : unread;
                            badge.style.display = 'flex';
                            if (bellIcon) bellIcon.classList.add('ring-animation');
                        } else {
                            badge.style.display = 'none';
                            if (bellIcon) bellIcon.classList.remove('ring-animation');
                        }
                    }

                    if (!notifList) return;

                    if (notifs.length === 0) {
                        notifList.innerHTML = `
                            <div style="padding: 2rem; text-align: center; color: var(--text-secondary);">
                                <i class="fas fa-check-circle" style="font-size: 2rem; margin-bottom: 1rem; color: var(--success); opacity: 0.5;"></i>
                                <p>Tudo em dia por aqui!</p>
                            </div>
                        `;
                        return;
                    }

                    notifList.innerHTML = notifs.map(n => `
                        <div class="notif-item" style="padding: 1rem; border-bottom: 1px solid var(--border-color); display: flex; gap: 1rem; opacity: ${n.isRead ? '0.6' : '1'}; background: ${n.isRead ? 'transparent' : 'var(--bg-color)'};">
                            <div style="width: 40px; height: 40px; border-radius: 50%; background: ${n.color}15; color: ${n.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 1.1rem;">
                                <i class="fas ${n.icon}"></i>
                            </div>
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 0.25rem 0; font-size: 0.9rem; color: var(--text-primary); font-weight: ${n.isRead ? '500' : '700'};">${n.title}</h4>
                                <p style="margin: 0; font-size: 0.8rem; color: var(--text-secondary); line-height: 1.4;">${n.message}</p>
                                <div style="margin-top: 0.5rem; display: flex; gap: 0.75rem;">
                                    ${!n.isRead ? `<button onclick="window.markNotifRead('${n.id}')" style="background: transparent; border: none; color: var(--primary); font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0;">Marcar como lida</button>` : ''}
                                    <button onclick="window.deleteNotif('${n.id}')" style="background: transparent; border: none; color: var(--error); font-size: 0.75rem; font-weight: 600; cursor: pointer; padding: 0;">Excluir</button>
                                </div>
                            </div>
                            ${!n.isRead ? `<div style="width: 8px; height: 8px; background: var(--primary); border-radius: 50%; margin-top: 0.5rem;"></div>` : ''}
                        </div>
                    `).join('');
                };

                window.markNotifRead = (id) => { notificationService.markAsRead(id); };
                window.deleteNotif = (id) => { notificationService.deleteNotification(id); };

                window.promptPayPending = (txId, currentAmount) => {
                    const overlay = document.createElement('div');
                    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:9999;backdrop-filter:blur(3px);animation:fadeIn 0.2s;';
                    
                    const popup = document.createElement('div');
                    popup.style.cssText = 'background:var(--surface-color);padding:1.5rem;border-radius:var(--radius-md);width:90%;max-width:350px;box-shadow:0 10px 25px rgba(0,0,0,0.2);animation:slideUp 0.2s;';
                    
                    popup.innerHTML = `
                        <h3 style="margin-top:0;color:var(--text-primary);font-size:1.1rem;margin-bottom:1rem;">Confirmar Pagamento</h3>
                        <p style="color:var(--text-secondary);font-size:0.9rem;margin-bottom:0.5rem;">Se o valor pago for diferente, edite abaixo (use ponto para centavos):</p>
                        <div style="margin-bottom:1.5rem;background:var(--bg-color);border:1px solid var(--border-color);border-radius:var(--radius-sm);padding:0.75rem;display:flex;align-items:center;">
                            <span style="color:var(--text-secondary);font-weight:600;margin-right:0.5rem;">R$</span>
                            <input type="number" id="pay-popup-amount" value="${currentAmount}" step="0.01" style="background:transparent;border:none;outline:none;color:var(--text-primary);font-size:1.1rem;width:100%;font-weight:700;">
                        </div>
                        <div style="display:flex;gap:1rem;justify-content:flex-end;">
                            <button id="pay-popup-cancel" style="background:transparent;border:none;color:var(--text-secondary);font-weight:600;cursor:pointer;padding:0.5rem 1rem;">Cancelar</button>
                            <button id="pay-popup-confirm" style="background:linear-gradient(135deg, var(--primary), #a855f7);border:none;color:white;border-radius:var(--radius-sm);font-weight:600;cursor:pointer;padding:0.5rem 1.5rem;box-shadow:0 4px 10px rgba(139,92,246,0.3);">Confirmar</button>
                        </div>
                    `;
                    
                    overlay.appendChild(popup);
                    document.body.appendChild(overlay);
                    
                    document.getElementById('pay-popup-cancel').onclick = () => overlay.remove();
                    document.getElementById('pay-popup-confirm').onclick = () => {
                        const newAmountStr = document.getElementById('pay-popup-amount').value;
                        const parsedAmount = parseFloat(newAmountStr);
                        if (!isNaN(parsedAmount) && parsedAmount > 0) {
                            import('../services/transactionService.js').then(async ({ transactionService }) => {
                                await transactionService.markAsPaid(txId, parsedAmount);
                                toast.success("Pagamento confirmado!");
                                // Atualizar dashboard simulando reload
                                navigation.replace('/dashboard');
                            });
                            overlay.remove();
                        } else {
                            toast.error("Valor inválido.");
                        }
                    };
                };
                
                if(btnMarkAll) {
                    btnMarkAll.onclick = () => { notificationService.markAllAsRead(); };
                }

                if(btnNotifications && notifModal) {
                    btnNotifications.onclick = () => notifModal.showModal();
                }

                eventBus.on('notifications_updated', renderNotifications);

                // Initialize notifications
                notificationService.generateSmartNotifications();

                // ----------------

                const updateDashboard = async () => {
                    const balanceEl = document.getElementById('total-balance');
                    const incomeEl = document.getElementById('total-income');
                    const expenseEl = document.getElementById('total-expense');
                    const invoiceEl = document.getElementById('total-credit-invoice');
                    const insightEl = document.getElementById('smart-insight-text');
                    const predictedEl = document.getElementById('predicted-balance');

                    // Skeleton já está na classe via HTML inicial
                    try {
                        const filterVal = document.getElementById('dashboard-month-filter')?.value || 'current';
                        const summary = await dashboardService.getSummary(filterVal);
                        
                        // Remover skeletons
                        balanceEl?.classList.remove('skeleton');
                        incomeEl?.classList.remove('skeleton');
                        expenseEl?.classList.remove('skeleton');
                        invoiceEl?.classList.remove('skeleton');
                        predictedEl?.classList.remove('skeleton');

                        if(balanceEl) balanceEl.textContent = `R$ ${summary.balance.toFixed(2)}`;
                        if(incomeEl) incomeEl.textContent = `R$ ${summary.income.toFixed(2)}`;
                        if(expenseEl) expenseEl.textContent = `R$ ${summary.expense.toFixed(2)}`;
                        if(invoiceEl) invoiceEl.textContent = `R$ ${summary.creditInvoice.toFixed(2)}`;
                        if(predictedEl) predictedEl.textContent = `R$ ${summary.predictedBalance.toFixed(2)}`;
                        
                        if(insightEl) {
                            let insightIndex = 0;
                            
                            const updateInsightUI = async () => {
                                try {
                                    const txs = await import('../services/transactionService.js').then(m => m.transactionService.getTransactions());
                                    const wls = await import('../services/walletService.js').then(m => m.walletService.getWallets());
                                    const vaults = await import('../services/vaultService.js').then(m => m.vaultService.getVaults());
                                    
                                    const insightsArray = await smartAssistant.getInsights(txs, wls, vaults, summary);
                                    
                                    const container = document.querySelector('.premium-insight');
                                    if (!container) return;
                                
                                if (insightsArray.length > 0) {
                                    const currentInsight = insightsArray[insightIndex % insightsArray.length];
                                    
                                    if (!container.dataset.initialized) {
                                        container.innerHTML = `
                                            <div id="smart-insight-icon-container" style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                            </div>
                                            <div id="smart-insight-text-wrapper" style="display: flex; flex-direction: column; gap: 3px; transition: opacity 0.4s ease; width: 100%;">
                                                <strong id="smart-insight-title" style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.5px;"></strong>
                                                <p id="smart-insight-text" style="font-size: 0.85rem; color: var(--text-primary); margin: 0; line-height: 1.4; font-weight: 500;"></p>
                                            </div>
                                        `;
                                        const iconContainer = document.getElementById('smart-insight-icon-container');
                                        window.carolOrb = new CarolOrb(iconContainer);
                                        container.dataset.initialized = 'true';
                                    }
                                    
                                    const textWrapper = document.getElementById('smart-insight-text-wrapper');
                                    textWrapper.style.opacity = 0;
                                    
                                    setTimeout(() => {
                                        container.style.borderLeft = `4px solid ${currentInsight.color}`;
                                        
                                        window.carolOrb.setState(currentInsight.priority);
                                        window.carolOrb.pulse();

                                        const titleEl = document.getElementById('smart-insight-title');
                                        titleEl.style.color = currentInsight.color;
                                        titleEl.innerHTML = `<i class="${currentInsight.icon.includes('fa-') ? 'fas ' + currentInsight.icon : currentInsight.icon}" style="margin-right: 4px;"></i>${currentInsight.title}`;

                                        const textEl = document.getElementById('smart-insight-text');
                                        textEl.innerHTML = currentInsight.message;

                                        textWrapper.style.opacity = 1;
                                    }, 400);
                                    
                                    if (insightsArray.length > 1) {
                                        insightIndex++;
                                    }
                                }
                                } catch(e) {
                                    console.error("Erro no updateInsightUI: ", e);
                                }
                            };
                            
                            updateInsightUI();
                            
                            if (window._insightInterval) clearInterval(window._insightInterval);
                            
                            window._insightInterval = setInterval(() => {
                                if (!document.querySelector('.premium-insight')) {
                                    clearInterval(window._insightInterval);
                                    return;
                                }
                                updateInsightUI();
                            }, 20000);
                        }

                        // Próximos Vencimentos e Transações Recentes
                        const upcomingList = document.getElementById('upcoming-bills-list');
                        const recentList = document.getElementById('recent-transactions');
                        if (upcomingList || recentList) {
                            import('../services/transactionService.js').then(async ({ transactionService }) => {
                                const allTxs = await transactionService.getTransactions();
                                const todayDate = new Date();
                                const todayStr = `${todayDate.getFullYear()}-${String(todayDate.getMonth()+1).padStart(2,'0')}-${String(todayDate.getDate()).padStart(2,'0')}`;
                                
                                const limitDate = new Date();
                                limitDate.setDate(limitDate.getDate() + 3);
                                const limitStr = `${limitDate.getFullYear()}-${String(limitDate.getMonth()+1).padStart(2,'0')}-${String(limitDate.getDate()).padStart(2,'0')}`;

                                // Filtrar transações pendentes (ignorando compras de cartão bruto)
                                const ccWalletIds = wallets.filter(w => w.type === 'credit_card').map(w => w.id);
                                let basePending = allTxs.filter(t => t.status === 'pending' && !ccWalletIds.includes(t.walletId));

                                // Injetar faturas abertas dos cartões
                                wallets.forEach(w => {
                                    if (w.type === 'credit_card') {
                                        const engineData = creditEngine.processCard(w, allTxs);
                                        engineData.invoices.forEach(inv => {
                                            if (inv.totalAmount > 0) {
                                                basePending.push({
                                                    id: `inv_${w.id}_${inv.id}`,
                                                    description: `Fatura ${w.name}`,
                                                    amount: inv.totalAmount,
                                                    date: inv.dueDate,
                                                    type: 'expense',
                                                    status: 'pending',
                                                    isInvoice: true
                                                });
                                            }
                                        });
                                    }
                                });

                                const pendingTxs = basePending.filter(t => t.date <= limitStr).sort((a, b) => new Date(a.date) - new Date(b.date));
                                
                                if (upcomingList) {
                                    if (pendingTxs.length === 0) {
                                        upcomingList.innerHTML = `<p style="text-align: center; color: var(--text-secondary); margin: 1rem 0;">Nenhuma conta agendada.</p>`;
                                    } else {
                                        const tomorrow = new Date();
                                        tomorrow.setDate(tomorrow.getDate() + 1);
                                        const tomorrowStr = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth()+1).padStart(2,'0')}-${String(tomorrow.getDate()).padStart(2,'0')}`;

                                        upcomingList.innerHTML = pendingTxs.slice(0, 8).map(tx => {
                                            let tagHtml = '';
                                            const dateParts = tx.date.split('-');
                                            const shortDate = `${dateParts[2]}/${dateParts[1]}`;
                                            
                                            const isOverdue = tx.date < todayStr;
                                            const cardBg = isOverdue ? 'rgba(239, 68, 68, 0.08)' : 'var(--surface-color)';
                                            const cardBorder = isOverdue ? 'rgba(239, 68, 68, 0.4)' : 'var(--border-color)';
                                            const titleColor = isOverdue ? '#ef4444' : 'var(--text-primary)';

                                            if (isOverdue) tagHtml = `<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">Vencida &bull; ${shortDate}</span>`;
                                            else if (tx.date === todayStr) tagHtml = `<span style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">Hoje &bull; ${shortDate}</span>`;
                                            else if (tx.date === tomorrowStr) tagHtml = `<span style="background: #f59e0b; color: white; padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">Amanhã &bull; ${shortDate}</span>`;
                                            else tagHtml = `<span style="background: var(--border-color); color: var(--text-primary); padding: 2px 6px; border-radius: 4px; font-size: 0.7rem; font-weight: 700;">${shortDate}</span>`;

                                            return `
                                                <div style="background: ${cardBg}; border: 1px solid ${cardBorder}; padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                                    <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                        <span style="font-size: 0.95rem; font-weight: 700; color: ${titleColor};">${tx.description}</span>
                                                        <div>${tagHtml}</div>
                                                    </div>
                                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                                        <span style="font-weight: 700; color: ${tx.type === 'expense' ? 'var(--error)' : 'var(--success)'}">R$ ${tx.amount.toFixed(2)}</span>
                                                        ${tx.isInvoice 
                                                            ? `<button onclick="navigation.goTo('/cards')" style="background: linear-gradient(135deg, var(--primary), #a855f7); color: white; border: none; border-radius: var(--radius-sm); padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(139,92,246,0.2);">Pagar</button>`
                                                            : `<button onclick="window.promptPayPending('${tx.id}', ${tx.amount})" style="background: linear-gradient(135deg, var(--primary), #a855f7); color: white; border: none; border-radius: var(--radius-sm); padding: 0.5rem 1rem; font-weight: 600; cursor: pointer; box-shadow: 0 4px 10px rgba(139,92,246,0.2);">Pagar</button>`
                                                        }
                                                    </div>
                                                </div>
                                            `;
                                        }).join('');
                                    }
                                }

                                if (recentList) {
                                    // Pega transacoes efetivadas ou antigas (que nao sao pending de hoje pra frente)
                                    // ou apenas as ultimas de qualquer tipo. O usuario pediu transacoes recentes.
                                    const recent = [...allTxs]
                                        .filter(t => t.status !== 'pending' || t.date < todayStr)
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .slice(0, 5);

                                    if (recent.length === 0) {
                                        recentList.innerHTML = `<p style="text-align: center; color: var(--text-secondary); margin: 1rem 0;">Nenhuma transação recente.</p>`;
                                    } else {
                                        recentList.innerHTML = recent.map(tx => {
                                            const icon = tx.type === 'expense' ? 'fa-arrow-up' : 'fa-arrow-down';
                                            const color = tx.type === 'expense' ? 'var(--error)' : 'var(--success)';
                                            const dateFmt = tx.date.split('-').reverse().join('/');
                                            
                                            return `
                                                <div style="background: var(--surface-color); border: 1px solid var(--border-color); padding: 1rem; border-radius: var(--radius-md); display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem;">
                                                    <div style="display: flex; align-items: center; gap: 1rem;">
                                                        <div style="background: ${color}15; color: ${color}; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                                            <i class="fas ${icon}"></i>
                                                        </div>
                                                        <div style="display: flex; flex-direction: column; gap: 0.25rem;">
                                                            <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">${tx.description}</span>
                                                            <span style="font-size: 0.75rem; color: var(--text-secondary);">${dateFmt}</span>
                                                        </div>
                                                    </div>
                                                    <div style="display: flex; align-items: baseline; gap: 4px;">
                                                        <span style="font-weight: 700; color: ${color}">${tx.type === 'expense' ? '-' : '+'} R$ ${tx.amount.toFixed(2)}</span>
                                                        ${tx.installments && tx.installments > 1 ? `<span style="font-size: 0.75rem; color: var(--text-secondary); font-weight: normal;">em ${tx.installments}x</span>` : ''}
                                                    </div>
                                                </div>
                                            `;
                                        }).join('');
                                    }
                                }
                            });
                        }

                    } catch (e) {
                        toast.error("Erro ao carregar resumo");
                    }
                };

                // Carregar na entrada
                updateDashboard();

                // Reagir a mudanças no filtro
                document.getElementById('dashboard-month-filter')?.addEventListener('change', () => {
                    // Readiciona skeleton pra feedback visual
                    document.getElementById('total-income')?.classList.add('skeleton');
                    document.getElementById('total-expense')?.classList.add('skeleton');
                    updateDashboard();
                });

                // Sincronizar UI do Modo Escuro logo ao carregar a tela
                if (window.themeManager) {
                    window.themeManager.syncUI();
                }

                // Reagir a novas transações para atualizar na mesma hora!
                eventBus.on('transaction_added', updateDashboard);
            });
        }
    },
    '/vaults': {
        templateUrl: 'pages/vaults.html',
        isProtected: false,
        init: () => {
            Promise.all([
                import('../services/vaultService.js'),
                import('../services/walletService.js'),
                import('../core/ui.js'),
                import('../core/eventBus.js')
            ]).then(([{ vaultService }, { walletService }, { ui }, { eventBus }]) => {
                const vaultsList = document.getElementById('vaults-list');
                const newVaultForm = document.getElementById('new-vault-form');
                const newVaultModal = document.getElementById('new-vault-modal');
                const tvForm = document.getElementById('transfer-vault-form');
                const tvModal = document.getElementById('transfer-vault-modal');
                const tvWalletSelect = document.getElementById('tv-wallet');

                const formatCurrency = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

                // Carregar contas para transferência
                walletService.getWallets().then(wallets => {
                    if (tvWalletSelect) {
                        tvWalletSelect.innerHTML = wallets.filter(w=>w.type!=='credit_card').map(w => 
                            `<option value="${w.id}">${w.name} (R$ ${parseFloat(w.currentBalance).toFixed(2)})</option>`
                        ).join('');
                    }
                });

                const renderVaults = async () => {
                    const vaults = await vaultService.getVaults();
                    if (!vaultsList) return;
                    
                    if (vaults.length === 0) {
                        vaultsList.innerHTML = `<div style="text-align:center; margin-top:2rem; color:var(--text-secondary);"><i class="fas fa-piggy-bank" style="font-size:3rem; opacity:0.2; margin-bottom:1rem;"></i><br>Nenhum cofre criado ainda.</div>`;
                        return;
                    }

                    window.editVault = (id) => {
                        const vault = vaults.find(v => v.id === id);
                        if(vault) {
                            document.getElementById('nv-title').textContent = 'Editar Cofre';
                            document.getElementById('nv-id').value = vault.id;
                            document.getElementById('nv-name').value = vault.name;
                            document.getElementById('nv-target').value = vault.targetAmount;
                            document.getElementById('nv-color').value = vault.color;
                            newVaultModal.showModal();
                        }
                    };

                    window.deleteVault = async (id, name) => {
                        if(await window.appConfirm('Excluir', `Tem certeza que deseja excluir o cofre "${name}"?\n(O saldo ficará inacessível se não for resgatado antes)`, { type: 'danger', confirmText: 'Excluir' })) {
                            const pwd = prompt("Para confirmar a exclusão deste cofre, digite EXCLUIR:");
                            if (pwd === "EXCLUIR") {
                                try {
                                    await vaultService.deleteVault(id);
                                    toast.success("Cofre excluído!");
                                } catch (e) {
                                    toast.error("Erro ao excluir cofre");
                                }
                            } else {
                                toast.error("Exclusão cancelada (palavra incorreta).");
                            }
                        }
                    };

                    let html = '';
                    vaults.forEach(v => {
                        const percent = Math.min(100, (v.currentAmount / v.targetAmount) * 100) || 0;
                        html += `
                            <div class="vault-card animate-fade-up" style="--vault-color: ${v.color}; user-select: none; -webkit-user-select: none;" oncontextmenu="window.openActionSheet(event, '${v.name}', 'window.editVault(\\'${v.id}\\')', 'window.deleteVault(\\'${v.id}\\', \\'${v.name}\\')')">
                                <div class="vault-header">
                                    <div>
                                        <h3 style="font-size: 1.1rem; margin-bottom:0.25rem;">${v.name}</h3>
                                        <p style="color: var(--text-secondary); font-size: 0.8rem; margin:0;">Meta: ${formatCurrency(v.targetAmount)}</p>
                                    </div>
                                    <div class="vault-icon-box" style="background: ${v.color}20; color: ${v.color}">
                                        <i class="fas ${v.icon}"></i>
                                    </div>
                                </div>
                                <h2 style="font-size: 1.5rem; margin-bottom: 0;">${formatCurrency(v.currentAmount)}</h2>
                                
                                <div class="vault-progress-bar">
                                    <div class="vault-progress-fill" style="width: ${percent}%;"></div>
                                </div>
                                
                                <div class="vault-actions">
                                    <button class="vault-btn btn-withdraw" onclick="window.openTransferVault('${v.id}', '${v.name}', 'withdraw')">
                                        <i class="fas fa-arrow-up"></i> Resgatar
                                    </button>
                                    <button class="vault-btn btn-deposit" onclick="window.openTransferVault('${v.id}', '${v.name}', 'deposit')">
                                        <i class="fas fa-arrow-down"></i> Guardar
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    vaultsList.innerHTML = html;
                };

                renderVaults();
                eventBus.on('vault_updated', renderVaults);

                // Novo Cofre
                if (newVaultForm) {
                    newVaultForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const btn = newVaultForm.querySelector('[type="submit"]');
                        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
                        try {
                            const vId = document.getElementById('nv-id').value;
                            const payload = {
                                name: document.getElementById('nv-name').value,
                                targetAmount: document.getElementById('nv-target').value,
                                color: document.getElementById('nv-color').value,
                                icon: 'fa-piggy-bank'
                            };

                            if (vId) {
                                await vaultService.updateVault(vId, payload);
                                toast.success('Cofre atualizado!');
                            } else {
                                await vaultService.createVault(payload);
                                toast.success('Cofre criado!');
                            }

                            newVaultModal.close();
                            newVaultForm.reset();
                            document.getElementById('nv-id').value = '';
                            document.getElementById('nv-title').textContent = 'Novo Cofre';
                        } catch (err) {
                            toast.error('Erro ao salvar cofre');
                        } finally {
                            btn.innerHTML = 'Salvar Cofre';
                        }
                    };
                }

                // Guardar/Resgatar
                window.openTransferVault = (id, name, type) => {
                    document.getElementById('tv-vault-id').value = id;
                    document.getElementById('tv-type').value = type;
                    
                    document.getElementById('tv-title').textContent = type === 'deposit' ? 'Guardar Dinheiro' : 'Resgatar Dinheiro';
                    document.getElementById('tv-desc').textContent = type === 'deposit' 
                        ? `Quanto você quer guardar no cofre "${name}"?`
                        : `Quanto você quer resgatar do cofre "${name}"?`;
                        
                    document.getElementById('tv-submit').textContent = type === 'deposit' ? 'Guardar' : 'Resgatar';
                    
                    tvModal.showModal();
                };

                if (tvForm) {
                    tvForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const btn = document.getElementById('tv-submit');
                        const originalText = btn.textContent;
                        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
                        try {
                            const id = document.getElementById('tv-vault-id').value;
                            const type = document.getElementById('tv-type').value;
                            const amount = parseFloat(document.getElementById('tv-amount').value);
                            const walletId = document.getElementById('tv-wallet').value;
                            
                            await vaultService.updateVaultBalance(id, amount, type === 'deposit', walletId);
                            tvModal.close();
                            tvForm.reset();
                            toast.success('Transferência realizada!');
                        } catch (err) {
                            toast.error('Erro na transferência');
                        } finally {
                            btn.innerHTML = originalText;
                        }
                    };
                }
            });
        }
    },
    '/reports': {
        templateUrl: 'pages/reports.html',
        isProtected: false,
        init: () => {
            Promise.all([
                import('../services/reportService.js').then(m => m.reportService),
                import('../services/transactionService.js').then(m => m.transactionService),
                import('../services/walletService.js').then(m => m.walletService),
                import('../services/smartAssistant.js').then(m => m.smartAssistant)
            ]).then(async ([reportService, transactionService, walletService, smartAssistant]) => {
                
                // 1. Calcular Score Financeiro
                const txs = await transactionService.getTransactions();
                const wallets = await walletService.getWallets();
                
                // Lógica de Score Base (0 a 100)
                let score = 50; // Começa na média
                
                // Calcula balanço do mês atual
                const now = new Date();
                const currentMonth = now.toISOString().slice(0,7);
                const currentTxs = txs.filter(t => t.date && t.date.startsWith(currentMonth) && t.status !== 'deleted');
                
                const income = currentTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
                const expense = currentTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
                
                if (income > 0) {
                    const ratio = expense / income;
                    if (ratio < 0.5) score += 30; // Gasta menos da metade (Excelente)
                    else if (ratio < 0.8) score += 15; // Gasta até 80% (Bom)
                    else if (ratio < 1) score -= 10; // Gasta quase tudo (Atenção)
                    else score -= 30; // Gasta mais do que ganha (Perigo)
                }

                // Penalidade por contas pendentes atrasadas
                const todayStr = now.toISOString().split('T')[0];
                const overdue = txs.filter(t => t.type === 'expense' && t.status === 'pending' && t.date < todayStr).length;
                if (overdue > 0) score -= (overdue * 5);
                
                // Bônus por consistência de uso (se tem muitos hábitos detectados)
                if (Object.keys(smartAssistant.habits).length > 5) score += 10;

                score = Math.max(0, Math.min(100, Math.round(score))); // Clamp 0-100
                
                // Atualizar UI do Score
                const scoreText = document.getElementById('score-text');
                const scoreRing = document.getElementById('score-ring');
                const scoreDesc = document.getElementById('score-desc');
                
                if (scoreText && scoreRing && scoreDesc) {
                    scoreText.textContent = score;
                    // O ring tem 314 de dasharray total (escondido). 0 = cheio.
                    const dashoffset = 314 - ((score / 100) * 314);
                    
                    // Delay para animação
                    setTimeout(() => {
                        scoreRing.style.strokeDashoffset = dashoffset;
                        
                        if (score >= 80) {
                            scoreRing.style.stroke = 'var(--success)';
                            scoreText.style.color = 'var(--success)';
                            scoreDesc.textContent = "Sua saúde financeira está excelente!";
                        } else if (score >= 50) {
                            scoreRing.style.stroke = '#f59e0b'; // warning
                            scoreText.style.color = '#f59e0b';
                            scoreDesc.textContent = "Sua saúde financeira está estável, mas requer atenção.";
                        } else {
                            scoreRing.style.stroke = 'var(--error)';
                            scoreText.style.color = 'var(--error)';
                            scoreDesc.textContent = "Sua saúde financeira está em risco. Cuidado com os gastos!";
                        }
                    }, 100);
                }

                // 2. Renderizar Insights
                const insightsList = document.getElementById('reports-insights-list');
                if (insightsList) {
                    const vaults = await import('../services/vaultService.js').then(m => m.vaultService.getVaults());
                    const summary = await import('../services/dashboardService.js').then(m => m.dashboardService.getSummary('current'));
                    
                    const insightsData = await smartAssistant.getInsights(txs, wallets, vaults, summary);
                    insightsList.innerHTML = '';
                    
                    if (insightsData.length === 0) {
                        insightsList.innerHTML = '<div style="text-align: center; color: var(--text-secondary); padding: 1rem;">Nenhum insight disponível no momento.</div>';
                    } else {
                        insightsData.forEach(ins => {
                            const div = document.createElement('div');
                            div.className = `insight-card insight-${ins.priority}`;
                            div.style.borderLeft = `4px solid ${ins.color}`;
                            div.innerHTML = `
                                <div class="insight-icon" style="width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                                </div>
                                <div class="insight-content" style="display: flex; flex-direction: column; justify-content: center;">
                                    <strong style="color: ${ins.color}; font-size: 0.8rem; text-transform: uppercase;">
                                        <i class="${ins.icon.includes('fa-') ? 'fas ' + ins.icon : ins.icon}" style="margin-right: 4px;"></i>${ins.title}
                                    </strong>
                                    <p style="margin: 3px 0 0 0;">${ins.message}</p>
                                </div>
                            `;
                            insightsList.appendChild(div);
                            
                            const iconContainer = div.querySelector('.insight-icon');
                            const orb = new CarolOrb(iconContainer);
                            orb.setState(ins.priority);
                        });
                    }
                }

                // 3. Export Form Logic
                const form = document.getElementById('export-form');
                const monthInput = document.getElementById('report-month');
                const formatRadios = document.querySelectorAll('input[name="report-format"]');
                
                if (monthInput) {
                    const now = new Date();
                    const m = (now.getMonth() + 1).toString().padStart(2, '0');
                    monthInput.value = `${now.getFullYear()}-${m}`;
                }

                if (formatRadios) {
                    formatRadios.forEach(radio => {
                        radio.addEventListener('change', (e) => {
                            document.querySelectorAll('.format-label').forEach(l => l.classList.remove('selected'));
                            e.target.parentElement.classList.add('selected');
                            
                            const btnText = document.getElementById('export-btn-text');
                            if(btnText) {
                                btnText.textContent = e.target.value === 'csv' ? 'Baixar Excel' : 'Gerar PDF';
                            }
                        });
                    });
                }

                if (form) {
                    form.onsubmit = async (e) => {
                        e.preventDefault();
                        const btn = form.querySelector('[type="submit"]');
                        const originalHtml = btn.innerHTML;
                        btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
                        
                        try {
                            const month = monthInput.value;
                            const format = document.querySelector('input[name="report-format"]:checked').value;
                            await reportService.export(month, format);
                            ui.toast.success('Relatório gerado!');
                        } catch (err) {
                            ui.toast.error(err.message || 'Erro ao gerar relatório');
                        } finally {
                            btn.innerHTML = originalHtml;
                        }
                    };
                }
            });
        }
    },
    '/settings': {
        templateUrl: './pages/settings.html',
        isProtected: true,
        init: () => {
            // Placeholder para configurações futuras
            // A tela possui apenas links no momento (ex: Categorias)
        }
    },
    '/profile': {
        templateUrl: './pages/profile.html',
        isProtected: true,
        init: () => {
            const user = authService.currentUser;
            if (!user) return navigation.go('/login');

            const nameEl = document.getElementById('profile-display-name');
            const emailEl = document.getElementById('profile-display-email');
            const nameInput = document.getElementById('profile-name');
            const emailInput = document.getElementById('profile-email');
            
            // Populate
            nameEl.textContent = user.displayName || 'Usuário';
            emailEl.textContent = user.email;
            nameInput.value = user.displayName || '';
            emailInput.value = user.email;

            // Form Submit (Save)
            const form = document.getElementById('profile-form');
            if (form) {
                form.onsubmit = async (e) => {
                    e.preventDefault();
                    const btn = form.querySelector('[type="submit"]');
                    const origHtml = btn.innerHTML;
                    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
                    
                    try {
                        await authService.updateProfile(nameInput.value.trim());
                        nameEl.textContent = nameInput.value.trim();
                        
                        // O cabeçalho é atualizado via banco no reload, ou forçado agora
                        const headerName = document.querySelector('.header-text h2');
                        if (headerName) headerName.textContent = nameInput.value.trim();
                        
                        toast.success('Perfil atualizado com sucesso!');
                    } catch (err) {
                        toast.error('Erro ao atualizar perfil.');
                    } finally {
                        btn.innerHTML = origHtml;
                    }
                };
            }

            // Danger Zone (Delete Intent)
            const btnIntent = document.getElementById('btn-delete-account-intent');
            if (btnIntent) {
                btnIntent.onclick = () => {
                    document.getElementById('delete-account-modal').showModal();
                };
            }

            // Confirm Delete (with Password)
            const deleteForm = document.getElementById('delete-account-form');
            if (deleteForm) {
                deleteForm.onsubmit = async (e) => {
                    e.preventDefault();
                    const pwd = document.getElementById('delete-password').value;
                    const btn = document.getElementById('btn-confirm-delete');
                    const origHtml = btn.innerHTML;
                    btn.innerHTML = '<div class="spinner" style="width:20px;height:20px;border-width:2px;margin:0;"></div>';
                    
                    try {
                        await authService.deleteAccount(pwd);
                        document.getElementById('delete-account-modal').close();
                        toast.success('Conta excluída definitivamente.');
                        navigation.go('/login');
                    } catch (err) {
                        console.error(err);
                        if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                            toast.error('Senha incorreta.');
                        } else {
                            toast.error('Erro ao excluir conta. Tente novamente.');
                        }
                    } finally {
                        btn.innerHTML = origHtml;
                    }
                };
            }
        }
    }
};
