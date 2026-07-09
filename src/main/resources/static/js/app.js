// Arena Beach Tennis - Application Logic

const API_BASE = '/api';

class BeachTennisApp {
    constructor() {
        this.players = [];
        this.tournaments = [];
        
        // Estado do formulário de novo torneio
        this.selectedPlayerIds = new Set();
        this.createdTeams = []; // Array de { id, player1, player2 }
        
        // Estado de visualização
        this.activeTournamentId = null;
        this.activeRoundFilter = 'all';
        this.currentMatchEditing = null;

        // Elementos de Instalação PWA
        this.deferredPrompt = null;

        // Estado de edição de jogador
        this.currentPlayerEditingId = null;
    }

    init() {
        this.registerServiceWorker();
        this.setupEventListeners();
        this.setupTabNavigation();
        
        // Carregamento inicial
        this.loadPlayers();
        this.loadTournaments();
    }

    // --- PWA ---
    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                    .then(reg => {
                        console.log('Service Worker registrado com sucesso:', reg.scope);
                        
                        // Verificar atualizações periodicamente (bom para iOS)
                        setInterval(() => {
                            reg.update();
                        }, 30000); // 30 segundos
                        
                        // Atualizar quando voltar para o app
                        document.addEventListener('visibilitychange', () => {
                            if (document.visibilityState === 'visible') {
                                reg.update();
                            }
                        });

                        // Forçar atualização do app se o Service Worker for atualizado
                        reg.addEventListener('updatefound', () => {
                            const newWorker = reg.installing;
                            newWorker.addEventListener('statechange', () => {
                                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                    console.log('Novo Service Worker instalado. Forçando recarregamento...');
                                    this.forceUpdateApp();
                                }
                            });
                        });
                    })
                    .catch(err => console.error('Falha ao registrar Service Worker:', err));
            });

            // Atualiza a página quando o novo service worker assume o controle
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    window.location.reload();
                }
            });
        }

        // Capturar o evento de instalação do PWA
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            const installBtnContainer = document.getElementById('install-btn-container');
            if (installBtnContainer) installBtnContainer.style.display = 'block';
        });

        const installBtn = document.getElementById('btn-install-pwa');
        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (this.deferredPrompt) {
                    this.deferredPrompt.prompt();
                    const { outcome } = await this.deferredPrompt.userChoice;
                    console.log(`User response to install prompt: ${outcome}`);
                    this.deferredPrompt = null;
                    const installBtnContainer = document.getElementById('install-btn-container');
                    if (installBtnContainer) installBtnContainer.style.display = 'none';
                }
            });
        }
    }

    async forceUpdateApp() {
        console.log('Forçando limpeza de cache e atualização...');
        if ('serviceWorker' in navigator) {
            try {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            } catch (e) {
                console.error('Erro ao remover Service Worker:', e);
            }
        }
        if (window.caches) {
            try {
                const cacheNames = await caches.keys();
                for (let name of cacheNames) {
                    await caches.delete(name);
                }
            } catch (e) {
                console.error('Erro ao deletar caches:', e);
            }
        }
        // Forçar reload completo limpando cache no Safari/iOS
        window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
    }

    async fetchWithRetry(url, options = {}, retries = 3, delay = 2000) {
        const titleEl = document.getElementById('wakeup-title');
        const textEl = document.getElementById('wakeup-text');
        const wakeupAlert = document.getElementById('wakeup-alert');

        // Adiciona cache buster para requisições GET para evitar cache agressivo (Safari/iOS)
        const method = (options.method || 'GET').toUpperCase();
        if (method === 'GET') {
            const separator = url.includes('?') ? '&' : '?';
            url = `${url}${separator}t=${Date.now()}`;
        }

        // Exibe imediatamente como carregamento do sistema
        if (titleEl) titleEl.innerText = "Carregando...";
        if (textEl) textEl.style.display = "none";
        if (wakeupAlert) wakeupAlert.style.display = "flex";

        // Se demorar mais de 1.8 segundos, muda a mensagem indicando inicialização do servidor
        let wakeupTimer = setTimeout(() => {
            if (titleEl) titleEl.innerText = "Servidor carregando...";
            if (textEl) textEl.style.display = "block";
        }, 1800);

        try {
            for (let i = 0; i < retries; i++) {
                try {
                    // Adiciona timeout na requisição se demorar muito (ex: travado no Render gratuito)
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos timeout
                    
                    const fetchOptions = { ...options, signal: controller.signal };
                    const response = await fetch(url, fetchOptions);
                    clearTimeout(timeoutId);

                    if (response.status >= 500 && i < retries - 1) {
                        console.warn(`Erro no servidor (status ${response.status}). Tentando novamente...`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        continue;
                    }

                    return response;
                } catch (err) {
                    if (i === retries - 1) throw err;
                    console.warn(`Falha na requisição. Tentando novamente em ${delay}ms...`, err);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        } finally {
            clearTimeout(wakeupTimer);
            if (wakeupAlert) wakeupAlert.style.display = 'none';
        }
    }

    // --- Event Listeners ---
    setupEventListeners() {
        // Form de novo jogador
        document.getElementById('add-player-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreatePlayer();
        });

        // Botão de cancelar edição do jogador
        const cancelEditBtn = document.getElementById('btn-cancel-edit-player');
        if (cancelEditBtn) {
            cancelEditBtn.addEventListener('click', () => this.cancelPlayerEdit());
        }

        // Botão de importação
        document.getElementById('btn-import-players').addEventListener('click', () => {
            this.handleImportPlayers();
        });

        // Busca de jogadores
        document.getElementById('player-search').addEventListener('input', (e) => {
            this.filterPlayersList(e.target.value);
        });

        // Tipo de torneio muda o formulário (mostra/esconde montagem de dupla)
        const typeRadios = document.querySelectorAll('input[name="tournament-type"]');
        typeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                // Remove classe active de todos os radio cards e adiciona no selecionado
                document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('active'));
                radio.closest('.radio-card').classList.add('active');

                const teamBuilder = document.getElementById('dupla-fixa-team-builder');
                if (e.target.value === 'DUPLA_FIXA') {
                    teamBuilder.style.display = 'block';
                    this.updateTeamBuilderWorkspace();
                } else {
                    teamBuilder.style.display = 'none';
                }
            });
        });

        // Inicializar a exibição do painel de duplas de acordo com a opção selecionada por padrão
        const activeTypeRadio = document.querySelector('input[name="tournament-type"]:checked');
        if (activeTypeRadio) {
            const teamBuilder = document.getElementById('dupla-fixa-team-builder');
            if (activeTypeRadio.value === 'DUPLA_FIXA') {
                teamBuilder.style.display = 'block';
            } else {
                teamBuilder.style.display = 'none';
            }
        }

        // Botões de seleção em massa
        document.getElementById('btn-select-all-players').addEventListener('click', () => {
            this.selectAllPlayers(true);
        });
        document.getElementById('btn-deselect-all-players').addEventListener('click', () => {
            this.selectAllPlayers(false);
        });

        // Botão de auto pareamento de duplas
        document.getElementById('btn-auto-pair-teams').addEventListener('click', () => {
            this.autoPairTeams();
        });

        // Form de novo torneio
        document.getElementById('new-tournament-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleCreateTournament();
        });

        // Seleção de torneio nas abas de Partidas e Classificação
        document.getElementById('matches-tournament-select').addEventListener('change', (e) => {
            this.activeTournamentId = e.target.value ? parseInt(e.target.value) : null;
            this.loadTournamentMatches();
        });

        document.getElementById('standings-tournament-select').addEventListener('change', (e) => {
            const id = e.target.value ? parseInt(e.target.value) : null;
            this.loadTournamentStandings(id);
        });

        // Modal de placar
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-score').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-save-score').addEventListener('click', () => this.saveMatchScore());

        // Modal de adicionar jogo
        const btnOpenAddMatch = document.getElementById('btn-open-add-match-modal');
        if (btnOpenAddMatch) {
            btnOpenAddMatch.addEventListener('click', () => this.openAddMatchModal());
        }
        const btnGenerateMissing = document.getElementById('btn-generate-missing-matches');
        if (btnGenerateMissing) {
            btnGenerateMissing.addEventListener('click', () => this.handleGenerateMissingMatches());
        }
        const btnCloseAddMatch = document.getElementById('btn-close-add-match-modal');
        if (btnCloseAddMatch) {
            btnCloseAddMatch.addEventListener('click', () => this.closeAddMatchModal());
        }
        const btnCancelAddMatch = document.getElementById('btn-cancel-add-match');
        if (btnCancelAddMatch) {
            btnCancelAddMatch.addEventListener('click', () => this.closeAddMatchModal());
        }
        const addMatchForm = document.getElementById('add-match-form');
        if (addMatchForm) {
            addMatchForm.addEventListener('submit', (e) => this.saveNewMatch(e));
        }

        // Botão de forçar atualização
        const forceUpdateBtn = document.getElementById('btn-force-update-app');
        if (forceUpdateBtn) {
            forceUpdateBtn.addEventListener('click', () => this.forceUpdateApp());
        }
    }

    // --- Navegação de Abas ---
    setupTabNavigation() {
        const handleTabSwitch = (tabId) => {
            document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(item => {
                if (item.getAttribute('data-tab') === tabId) {
                    item.classList.add('active');
                } else {
                    item.classList.remove('active');
                }
            });

            document.querySelectorAll('.tab-content').forEach(content => {
                if (content.id === `tab-${tabId}`) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });

            // Carregamento específico da aba
            if (tabId === 'dashboard') {
                this.loadTournaments();
            } else if (tabId === 'players') {
                this.loadPlayers();
            } else if (tabId === 'new-tournament') {
                this.loadPlayers().then(() => this.renderTournamentPlayerSelection());
            } else if (tabId === 'matches') {
                this.populateTournamentDropdown('matches-tournament-select');
            } else if (tabId === 'standings') {
                this.populateTournamentDropdown('standings-tournament-select');
                // Auto-selecionar e carregar o torneio ativo se houver um
                if (this.activeTournamentId) {
                    const standingsSelect = document.getElementById('standings-tournament-select');
                    standingsSelect.value = this.activeTournamentId;
                    this.loadTournamentStandings(this.activeTournamentId);
                }
            }
        };

        const navLinks = document.querySelectorAll('.nav-item, .mobile-nav-item');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const tabId = link.getAttribute('data-tab');
                window.location.hash = tabId;
                handleTabSwitch(tabId);
            });
        });

        // Checar hash inicial
        if (window.location.hash) {
            const initialTab = window.location.hash.replace('#', '');
            const tabExists = Array.from(navLinks).some(link => link.getAttribute('data-tab') === initialTab);
            if (tabExists) {
                handleTabSwitch(initialTab);
            }
        }
    }

    switchTab(tabId) {
        window.location.hash = tabId;
        const navItem = document.querySelector(`.nav-item[data-tab="${tabId}"]`) || 
                        document.querySelector(`.mobile-nav-item[data-tab="${tabId}"]`);
        if (navItem) navItem.click();
    }

    // --- Métodos de API (Players) ---
    async loadPlayers() {
        try {
            const res = await this.fetchWithRetry(`${API_BASE}/players`);
            this.players = await res.json();
            this.renderPlayersList();
            document.getElementById('stat-players-count').innerText = this.players.length;
        } catch (err) {
            console.error('Erro ao carregar jogadores:', err);
        }
    }

    async handleCreatePlayer() {
        const nameInput = document.getElementById('player-name');
        const genderInput = document.getElementById('player-gender');
        const categoryInput = document.getElementById('player-category');

        const player = {
            name: nameInput.value.trim(),
            gender: genderInput.value,
            category: categoryInput.value
        };

        const isEditing = this.currentPlayerEditingId !== null;
        const url = isEditing ? `${API_BASE}/players/${this.currentPlayerEditingId}` : `${API_BASE}/players`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const res = await this.fetchWithRetry(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(player)
            });

            if (res.ok) {
                if (isEditing) {
                    this.cancelPlayerEdit();
                } else {
                    nameInput.value = '';
                }
                await this.loadPlayers();
                this.renderTournamentPlayerSelection();
                this.updateSelectedPlayersCount();
                this.updateTeamBuilderWorkspace();
            } else {
                alert(isEditing ? 'Erro ao atualizar jogador.' : 'Erro ao criar jogador.');
            }
        } catch (err) {
            console.error('Erro ao salvar jogador:', err);
        }
    }

    async handleImportPlayers() {
        const text = document.getElementById('import-text').value;
        if (!text.trim()) return;

        const lines = text.split('\n');
        const importedList = [];
        const selectedIds = new Set();
        
        const existingNamesMap = new Map(this.players.map(p => [p.name.trim().toLowerCase(), p]));
        const seenInList = new Set();

        for (let line of lines) {
            if (!line.trim()) continue;
            // Formato: Nome, Gênero (M/F), Categoria (A/B/C/D)
            const parts = line.split(',');
            
            // Retirar números e pontuações do nome
            let rawName = parts[0] ? parts[0] : '';
            const cleanName = rawName
                .replace(/[^a-zA-ZáâãàéêíóôõúüçÁÂÃÀÉÊÍÓÔÕÚÜÇ\s]/g, '')
                .replace(/\s+/g, ' ')
                .trim();
                
            if (!cleanName) continue;
            
            let gender = parts[1] ? parts[1].trim().toUpperCase() : 'M';
            let category = parts[2] ? parts[2].trim().toUpperCase() : 'C';

            // Normalização rápida de gênero
            if (gender !== 'M' && gender !== 'F') {
                gender = gender.startsWith('F') ? 'F' : 'M';
            }

            const lowerName = cleanName.toLowerCase();
            
            // Se já foi visto nesta lista
            if (seenInList.has(lowerName)) {
                continue;
            }
            seenInList.add(lowerName);

            if (existingNamesMap.has(lowerName)) {
                // Já existe no banco: adicionamos o ID existente para seleção posterior
                selectedIds.add(existingNamesMap.get(lowerName).id);
            } else {
                // Não existe: colocamos na lista para importação no banco
                importedList.push({ name: cleanName, gender, category });
            }
        }

        // Se todos os colados já existiam no banco de dados e nenhum novo precisa ser adicionado
        if (importedList.length === 0) {
            if (selectedIds.size > 0) {
                // Limpar campos
                document.getElementById('import-text').value = '';
                
                // Mudar seleção e ir para torneios
                this.selectedPlayerIds = selectedIds;
                this.renderTournamentPlayerSelection();
                this.updateSelectedPlayersCount();
                this.updateTeamBuilderWorkspace();
                this.switchTab('new-tournament');
            } else {
                alert('Nenhum jogador novo ou válido encontrado no texto.');
            }
            return;
        }

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/players/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(importedList)
            });

            if (res.ok) {
                const savedPlayers = await res.json();
                document.getElementById('import-text').value = '';
                
                // Recarrega todos os jogadores na lista interna
                await this.loadPlayers();

                // Adiciona os IDs dos novos jogadores importados aos selecionados
                savedPlayers.forEach(p => {
                    selectedIds.add(p.id);
                });

                // Limpa e define a seleção do torneio
                this.selectedPlayerIds = selectedIds;
                
                // Atualiza os componentes visuais do torneio
                this.renderTournamentPlayerSelection();
                this.updateSelectedPlayersCount();
                this.updateTeamBuilderWorkspace();

                // Muda de aba
                this.switchTab('new-tournament');
            } else {
                alert('Erro ao importar jogadores.');
            }
        } catch (err) {
            console.error('Erro ao importar jogadores:', err);
        }
    }

    async deletePlayer(id) {
        if (!confirm('Deseja realmente excluir este jogador?')) return;

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/players/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                this.selectedPlayerIds.delete(id);
                await this.loadPlayers();
                this.renderTournamentPlayerSelection();
                this.updateSelectedPlayersCount();
                this.updateTeamBuilderWorkspace();
            } else {
                alert('Não foi possível excluir o jogador. Pode ser que ele esteja em um torneio ativo.');
            }
        } catch (err) {
            console.error('Erro ao excluir jogador:', err);
        }
    }

    editPlayer(id) {
        const player = this.players.find(p => p.id === id);
        if (!player) return;

        this.currentPlayerEditingId = id;
        
        document.getElementById('player-name').value = player.name;
        document.getElementById('player-gender').value = player.gender;
        document.getElementById('player-category').value = player.category;

        const cardHeader = document.getElementById('player-card-header');
        if (cardHeader) {
            cardHeader.innerHTML = '<h2><i class="fa-solid fa-user-pen text-orange"></i> Editar Jogador</h2>';
        }

        const saveBtn = document.getElementById('btn-save-player');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fa-solid fa-check"></i> Atualizar Jogador';
        }

        const cancelBtn = document.getElementById('btn-cancel-edit-player');
        if (cancelBtn) {
            cancelBtn.style.display = 'block';
        }

        document.getElementById('player-name').scrollIntoView({ behavior: 'smooth' });
    }

    cancelPlayerEdit() {
        this.currentPlayerEditingId = null;

        document.getElementById('player-name').value = '';
        document.getElementById('player-gender').value = 'M';
        document.getElementById('player-category').value = 'C';

        const cardHeader = document.getElementById('player-card-header');
        if (cardHeader) {
            cardHeader.innerHTML = '<h2><i class="fa-solid fa-user-plus text-orange"></i> Novo Jogador</h2>';
        }

        const saveBtn = document.getElementById('btn-save-player');
        if (saveBtn) {
            saveBtn.innerHTML = '<i class="fa-solid fa-save"></i> Salvar Jogador';
        }

        const cancelBtn = document.getElementById('btn-cancel-edit-player');
        if (cancelBtn) {
            cancelBtn.style.display = 'none';
        }
    }

    // --- Métodos de API (Tournaments) ---
    async loadTournaments() {
        try {
            const res = await this.fetchWithRetry(`${API_BASE}/tournaments`);
            this.tournaments = await res.json();
            this.renderTournamentsDashboard();
            this.populateTournamentDropdown('matches-tournament-select');
            this.populateTournamentDropdown('standings-tournament-select');
            document.getElementById('stat-tournaments-count').innerText = this.tournaments.length;
        } catch (err) {
            console.error('Erro ao carregar torneios:', err);
        }
    }

    async handleCreateTournament() {
        const name = document.getElementById('tournament-name').value.trim();
        const type = document.querySelector('input[name="tournament-type"]:checked').value;
        const validationAlert = document.getElementById('tournament-validation-msg');
        const validationText = document.getElementById('validation-msg-text');

        validationAlert.style.display = 'none';

        if (this.selectedPlayerIds.size < 4) {
            validationText.innerText = 'Selecione pelo menos 4 jogadores para iniciar um torneio.';
            validationAlert.style.display = 'flex';
            return;
        }

        let body = {};
        let url = '';

        if (type === 'DUPLA_FIXA') {
            // Validar se todos os jogadores foram pareados
            const unpaired = Array.from(this.selectedPlayerIds).filter(id => 
                !this.createdTeams.some(t => t.player1.id === id || t.player2.id === id)
            );

            if (unpaired.length > 0) {
                validationText.innerText = 'Existem jogadores selecionados que ainda não estão em uma dupla. Crie as duplas ou remova os jogadores da seleção.';
                validationAlert.style.display = 'flex';
                return;
            }

            url = `${API_BASE}/tournaments/dupla-fixa`;
            body = {
                name: name,
                teams: this.createdTeams.map(t => [t.player1.id, t.player2.id])
            };
        } else {
            // REI_DA_PRAIA
            url = `${API_BASE}/tournaments/rei-da-praia`;
            body = {
                name: name,
                playerIds: Array.from(this.selectedPlayerIds)
            };
        }

        try {
            const res = await this.fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const tournament = await res.json();
                // Limpar campos
                document.getElementById('tournament-name').value = '';
                this.selectedPlayerIds.clear();
                this.createdTeams = [];
                
                // Recarregar lista de torneios antes de mudar de aba
                await this.loadTournaments();
                
                // Ir para a tela de partidas e selecionar o novo torneio
                this.activeTournamentId = tournament.id;
                this.switchTab('matches');
            } else {
                alert('Erro ao criar torneio.');
            }
        } catch (err) {
            console.error('Erro ao criar torneio:', err);
        }
    }

    async deleteTournament(id) {
        if (!confirm('Deseja realmente excluir este torneio? Todos os jogos e tabelas serão perdidos permanentemente.')) return;

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/tournaments/${id}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                await this.loadTournaments();
            }
        } catch (err) {
            console.error('Erro ao excluir torneio:', err);
        }
    }

    async loadTournamentMatches() {
        const container = document.getElementById('matches-list-container');
        const filterContainer = document.getElementById('rounds-filter-container');
        const addMatchBtn = document.getElementById('btn-open-add-match-modal');
        const generateMissingBtn = document.getElementById('btn-generate-missing-matches');
        
        if (!this.activeTournamentId) {
            container.innerHTML = `
                <div class="no-data-card">
                    <i class="fa-solid fa-circle-info"></i>
                    <p>Selecione um torneio ativo para visualizar e lançar os resultados das partidas.</p>
                </div>
            `;
            filterContainer.innerHTML = '';
            if (addMatchBtn) addMatchBtn.style.display = 'none';
            if (generateMissingBtn) generateMissingBtn.style.display = 'none';
            return;
        }

        if (addMatchBtn) addMatchBtn.style.display = 'inline-block';
        if (generateMissingBtn) generateMissingBtn.style.display = 'inline-block';

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/tournaments/${this.activeTournamentId}/matches`);
            const matches = await res.json();
            
            if (matches.length === 0) {
                container.innerHTML = `
                    <div class="no-data-card">
                        <i class="fa-solid fa-circle-info"></i>
                        <p>Nenhuma partida gerada para este torneio.</p>
                    </div>
                `;
                filterContainer.innerHTML = '';
                return;
            }

            // Descobrir o número máximo de rodadas
            const rounds = [...new Set(matches.map(m => m.roundNumber))].sort((a, b) => a - b);
            this.renderRoundFilter(rounds);

            // Filtrar partidas
            let filteredMatches = matches;
            if (this.activeRoundFilter !== 'all') {
                filteredMatches = matches.filter(m => m.roundNumber === parseInt(this.activeRoundFilter));
            }

            this.renderMatchesList(filteredMatches);
        } catch (err) {
            console.error('Erro ao carregar partidas:', err);
        }
    }

    async loadTournamentStandings(tournamentId) {
        const tbody = document.getElementById('standings-list-tbody');
        const typeBadge = document.getElementById('standings-type-badge');
        
        if (!tournamentId) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center py-8 text-muted">
                        <i class="fa-solid fa-circle-info d-block mb-2 text-xl"></i>
                        Selecione um torneio para ver a classificação.
                    </td>
                </tr>
            `;
            typeBadge.innerText = '--';
            return;
        }

        try {
            // Obter detalhes do torneio para saber o tipo
            const tRes = await this.fetchWithRetry(`${API_BASE}/tournaments/${tournamentId}`);
            const tournament = await tRes.json();
            
            typeBadge.innerText = tournament.type === 'DUPLA_FIXA' ? 'Dupla Fixa' : 'Rei da Praia';
            typeBadge.className = tournament.type === 'DUPLA_FIXA' ? 'badge badge-secondary' : 'badge badge-primary';

            const res = await this.fetchWithRetry(`${API_BASE}/tournaments/${tournamentId}/standings`);
            const standings = await res.json();

            tbody.innerHTML = '';
            
            if (standings.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" class="text-center py-8 text-muted">Nenhum dado de classificação disponível.</td>
                    </tr>
                `;
                return;
            }

            standings.forEach((row, idx) => {
                const tr = document.createElement('tr');
                
                // Nome a exibir
                let displayName = '';
                if (tournament.type === 'DUPLA_FIXA') {
                    displayName = `<strong>${row.team.player1.name} / ${row.team.player2.name}</strong>`;
                } else {
                    displayName = `<strong>${row.player.name}</strong> <span class="text-xs text-muted">(${row.player.category})</span>`;
                }

                tr.innerHTML = `
                    <td class="text-center"><strong>${idx + 1}º</strong></td>
                    <td>${displayName}</td>
                    <td class="text-center">${row.matchesPlayed}</td>
                    <td class="text-center text-success"><strong>${row.matchesWon}</strong></td>
                    <td class="text-center text-danger">${row.matchesLost}</td>
                    <td class="text-center">${row.gamesWon}</td>
                    <td class="text-center">${row.gamesLost}</td>
                    <td class="text-center"><strong>${row.gamesDifference > 0 ? '+' + row.gamesDifference : row.gamesDifference}</strong></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Erro ao carregar classificação:', err);
        }
    }

    // --- Renderizadores da UI ---
    renderPlayersList() {
        const tbody = document.getElementById('players-list-tbody');
        tbody.innerHTML = '';

        if (this.players.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">Nenhum jogador cadastrado. Adicione um novo jogador ou importe uma lista!</td>
                </tr>
            `;
            return;
        }

        this.players.forEach(player => {
            const tr = document.createElement('tr');
            
            let genderBadge = player.gender === 'F' ? 
                '<span class="badge badge-secondary"><i class="fa-solid fa-venus"></i> F</span>' : 
                '<span class="badge badge-primary"><i class="fa-solid fa-mars"></i> M</span>';

            let catBadge = '';
            if (player.category === 'A') catBadge = '<span class="badge badge-danger">Cat A</span>';
            else if (player.category === 'B') catBadge = '<span class="badge badge-warning">Cat B</span>';
            else if (player.category === 'C') catBadge = '<span class="badge badge-success">Cat C</span>';
            else catBadge = '<span class="badge badge-secondary">Cat ' + player.category + '</span>';

            tr.innerHTML = `
                <td><strong>${player.name}</strong></td>
                <td>${genderBadge}</td>
                <td>${catBadge}</td>
                <td class="text-right">
                    <button class="btn btn-secondary btn-xs" onclick="app.editPlayer(${player.id})" style="margin-right: 4px;">
                        <i class="fa-solid fa-pencil text-primary"></i>
                    </button>
                    <button class="btn btn-secondary btn-xs" onclick="app.deletePlayer(${player.id})">
                        <i class="fa-solid fa-trash text-danger"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    filterPlayersList(query) {
        const rows = document.querySelectorAll('#players-list-tbody tr');
        rows.forEach(row => {
            const name = row.querySelector('td:first-child')?.innerText.toLowerCase() || '';
            if (name.includes(query.toLowerCase())) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    renderTournamentsDashboard() {
        const container = document.getElementById('active-tournaments-list');
        container.innerHTML = '';

        if (this.tournaments.length === 0) {
            container.innerHTML = `
                <div class="no-data-card">
                    <i class="fa-solid fa-circle-info"></i>
                    <p>Nenhum torneio ativo no momento. Vá em "Novo Torneio" para começar!</p>
                </div>
            `;
            return;
        }

        this.tournaments.forEach(t => {
            const card = document.createElement('div');
            card.className = `tournament-card ${t.type.toLowerCase().replace('_', '-')}`;
            
            const typeLabel = t.type === 'DUPLA_FIXA' ? 'Dupla Fixa' : 'Rei da Praia';
            const playerCount = t.players ? t.players.length : 0;

            card.innerHTML = `
                <div class="tournament-card-info">
                    <h3>${t.name}</h3>
                    <p><i class="fa-solid fa-sitemap"></i> Formato: <strong>${typeLabel}</strong></p>
                    <p><i class="fa-solid fa-users"></i> Participantes: <strong>${playerCount}</strong></p>
                </div>
                <div class="tournament-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="app.viewTournamentMatches(${t.id})">
                        <i class="fa-solid fa-table-tennis-paddle-ball"></i> Partidas
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.viewTournamentStandings(${t.id})">
                        <i class="fa-solid fa-ranking-star"></i> Tabela
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="app.deleteTournament(${t.id})" title="Excluir Torneio">
                        <i class="fa-solid fa-trash text-danger"></i>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    viewTournamentMatches(id) {
        this.activeTournamentId = id;
        this.switchTab('matches');
        // A aba de partidas vai ler o activeTournamentId e carregar os jogos
    }

    viewTournamentStandings(id) {
        this.switchTab('standings');
        const select = document.getElementById('standings-tournament-select');
        select.value = id;
        this.loadTournamentStandings(id);
    }

    populateTournamentDropdown(elementId) {
        const select = document.getElementById(elementId);
        const currentValue = select.value;
        select.innerHTML = '<option value="">Selecione um Torneio...</option>';
        
        this.tournaments.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.id;
            opt.innerText = `${t.name} (${t.type === 'DUPLA_FIXA' ? 'Dupla' : 'Rei'})`;
            select.appendChild(opt);
        });

        if (currentValue && this.tournaments.some(t => t.id === parseInt(currentValue))) {
            select.value = currentValue;
        } else if (this.activeTournamentId && this.tournaments.some(t => t.id === this.activeTournamentId)) {
            select.value = this.activeTournamentId;
        }
    }

    // --- Configuração do Novo Torneio ---
    renderTournamentPlayerSelection() {
        const container = document.getElementById('tournament-player-selection');
        container.innerHTML = '';

        if (this.players.length === 0) {
            container.innerHTML = '<p class="text-muted col-span-all text-center">Nenhum jogador disponível. Cadastre jogadores primeiro.</p>';
            return;
        }

        // Ordenar jogadores por nome
        const sortedPlayers = [...this.players].sort((a, b) => a.name.localeCompare(b.name));

        sortedPlayers.forEach(player => {
            const label = document.createElement('label');
            label.className = 'player-checkbox-label';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = player.id;
            checkbox.checked = this.selectedPlayerIds.has(player.id);
            
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedPlayerIds.add(player.id);
                } else {
                    this.selectedPlayerIds.delete(player.id);
                    // Remover de qualquer dupla se já estiver pareado
                    this.createdTeams = this.createdTeams.filter(t => 
                        t.player1.id !== player.id && t.player2.id !== player.id
                    );
                }
                this.updateSelectedPlayersCount();
                this.updateTeamBuilderWorkspace();
            });

            label.appendChild(checkbox);
            label.appendChild(document.createTextNode(`${player.name} (${player.category})`));
            container.appendChild(label);
        });

        this.updateSelectedPlayersCount();
        this.updateTeamBuilderWorkspace();
    }

    selectAllPlayers(checked) {
        const checkboxes = document.querySelectorAll('#tournament-player-selection input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.checked = checked;
            const id = parseInt(cb.value);
            if (checked) {
                this.selectedPlayerIds.add(id);
            } else {
                this.selectedPlayerIds.delete(id);
            }
        });
        if (!checked) {
            this.createdTeams = [];
        }
        this.updateSelectedPlayersCount();
        this.updateTeamBuilderWorkspace();
    }

    updateSelectedPlayersCount() {
        const count = this.selectedPlayerIds.size;
        document.getElementById('selected-players-count-label').innerText = `Selecionados: ${count} jogadores`;
    }

    // --- Team Builder de Duplas Fixas ---
    updateTeamBuilderWorkspace() {
        const type = document.querySelector('input[name="tournament-type"]:checked').value;
        if (type !== 'DUPLA_FIXA') return;

        const unpairedListContainer = document.getElementById('unpaired-players-list');
        const createdTeamsContainer = document.getElementById('created-teams-list');

        unpairedListContainer.innerHTML = '';
        createdTeamsContainer.innerHTML = '';

        // Obter os objetos Player completos que estão selecionados
        const selectedPlayers = this.players.filter(p => this.selectedPlayerIds.has(p.id));

        // Filtrar quais ainda não estão em dupla
        const unpairedPlayers = selectedPlayers.filter(p => 
            !this.createdTeams.some(t => t.player1.id === p.id || t.player2.id === p.id)
        );

        // Renderizar jogadores sem dupla
        if (unpairedPlayers.length === 0) {
            unpairedListContainer.innerHTML = '<p class="text-xs text-muted">Todos os jogadores selecionados já estão em duplas.</p>';
        } else {
            unpairedPlayers.forEach(player => {
                const badge = document.createElement('div');
                badge.className = 'player-badge-draggable';
                if (this.firstPlayerSelectedForPair && this.firstPlayerSelectedForPair.id === player.id) {
                    badge.classList.add('selected-for-team');
                }
                
                badge.innerHTML = `
                    <i class="fa-solid fa-user"></i>
                    <span>${player.name}</span>
                `;
                
                badge.addEventListener('click', () => {
                    this.handlePlayerSelectForPair(player);
                });
                
                unpairedListContainer.appendChild(badge);
            });
        }

        // Renderizar duplas criadas
        if (this.createdTeams.length === 0) {
            createdTeamsContainer.innerHTML = '<p class="text-xs text-muted text-center py-4">Nenhuma dupla formada. Clique em dois jogadores ao lado para formar uma dupla.</p>';
        } else {
            this.createdTeams.forEach((team, idx) => {
                const card = document.createElement('div');
                card.className = 'team-card-builder';
                card.innerHTML = `
                    <span><strong>D${idx + 1}:</strong> ${team.player1.name} + ${team.player2.name}</span>
                    <button type="button" onclick="app.removeTeam(${idx})">
                        <i class="fa-solid fa-circle-xmark"></i>
                    </button>
                `;
                createdTeamsContainer.appendChild(card);
            });
        }
    }

    handlePlayerSelectForPair(player) {
        if (!this.firstPlayerSelectedForPair) {
            this.firstPlayerSelectedForPair = player;
            this.updateTeamBuilderWorkspace();
        } else {
            if (this.firstPlayerSelectedForPair.id === player.id) {
                // Desmarcar se clicar no mesmo
                this.firstPlayerSelectedForPair = null;
            } else {
                // Criar dupla
                this.createdTeams.push({
                    player1: this.firstPlayerSelectedForPair,
                    player2: player
                });
                this.firstPlayerSelectedForPair = null;
            }
            this.updateTeamBuilderWorkspace();
        }
    }

    removeTeam(idx) {
        this.createdTeams.splice(idx, 1);
        this.updateTeamBuilderWorkspace();
    }

    autoPairTeams() {
        const selectedPlayers = this.players.filter(p => this.selectedPlayerIds.has(p.id));
        // Jogadores sem dupla
        const unpaired = selectedPlayers.filter(p => 
            !this.createdTeams.some(t => t.player1.id === p.id || t.player2.id === p.id)
        );

        // Embaralhar para fazer pares aleatórios ou apenas fazer em ordem
        const shuffled = [...unpaired];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        while (shuffled.length >= 2) {
            const p1 = shuffled.pop();
            const p2 = shuffled.pop();
            this.createdTeams.push({ player1: p1, player2: p2 });
        }

        this.firstPlayerSelectedForPair = null;
        this.updateTeamBuilderWorkspace();
    }

    // --- Renderizadores de Partidas e Filtros ---
    renderRoundFilter(rounds) {
        const container = document.getElementById('rounds-filter-container');
        container.innerHTML = '';

        // Botão para todas
        const btnAll = document.createElement('button');
        btnAll.className = `round-tab-btn ${this.activeRoundFilter === 'all' ? 'active' : ''}`;
        btnAll.innerText = 'Todos os Jogos';
        btnAll.addEventListener('click', () => {
            this.activeRoundFilter = 'all';
            this.loadTournamentMatches();
        });
        container.appendChild(btnAll);

        // Botões para cada rodada
        rounds.forEach(r => {
            const btn = document.createElement('button');
            btn.className = `round-tab-btn ${this.activeRoundFilter === String(r) ? 'active' : ''}`;
            btn.innerText = `Rodada ${r}`;
            btn.addEventListener('click', () => {
                this.activeRoundFilter = String(r);
                this.loadTournamentMatches();
            });
            container.appendChild(btn);
        });
    }

    renderMatchesList(matches) {
        const container = document.getElementById('matches-list-container');
        container.innerHTML = '';

        matches.forEach(match => {
            const card = document.createElement('div');
            card.className = 'match-card';

            const team1Name = match.team1 ? 
                `${match.player1.name} / ${match.player2.name}` : 
                `${match.player1.name} + ${match.player2.name}`;
            
            const team2Name = match.team2 ? 
                `${match.player3.name} / ${match.player4.name}` : 
                `${match.player3.name} + ${match.player4.name}`;

            const isFinished = match.status === 'FINISHED';
            const winner1 = isFinished && match.score1 > match.score2;
            const winner2 = isFinished && match.score2 > match.score1;

            card.innerHTML = `
                <div class="match-header">
                    <span>Rodada ${match.roundNumber} • ${match.courtName || 'Quadra'}</span>
                    <span class="badge ${isFinished ? 'badge-success' : 'badge-warning'}">
                        ${isFinished ? 'Finalizado' : 'Pendente'}
                    </span>
                </div>
                <div class="match-body">
                    <div class="match-team-row">
                        <span class="match-team-names ${winner1 ? 'winner' : ''}">${team1Name}</span>
                        <div class="match-score-badge ${winner1 ? 'winner' : ''}">${isFinished ? match.score1 : '-'}</div>
                    </div>
                    <div class="match-team-row">
                        <span class="match-team-names ${winner2 ? 'winner' : ''}">${team2Name}</span>
                        <div class="match-score-badge ${winner2 ? 'winner' : ''}">${isFinished ? match.score2 : '-'}</div>
                    </div>
                </div>
                <div class="match-footer">
                    <button class="btn btn-secondary btn-sm btn-block" onclick="app.openScoreModal(${JSON.stringify(match).replace(/"/g, '&quot;')})">
                        <i class="fa-solid fa-pen-to-square"></i> ${isFinished ? 'Alterar Placar' : 'Lançar Placar'}
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // --- Modal de Resultados ---
    openScoreModal(match) {
        this.currentMatchEditing = match;

        const team1Name = match.team1 ? 
            `${match.player1.name} / ${match.player2.name}` : 
            `${match.player1.name} + ${match.player2.name}`;
        
        const team2Name = match.team2 ? 
            `${match.player3.name} / ${match.player4.name}` : 
            `${match.player3.name} + ${match.player4.name}`;

        document.getElementById('modal-team1-name').innerText = team1Name;
        document.getElementById('modal-team2-name').innerText = team2Name;
        document.getElementById('modal-score1').value = match.score1 || 0;
        document.getElementById('modal-score2').value = match.score2 || 0;

        document.getElementById('score-modal').classList.add('active');
    }

    closeModal() {
        document.getElementById('score-modal').classList.remove('active');
        this.currentMatchEditing = null;
    }

    async saveMatchScore() {
        if (!this.currentMatchEditing) return;

        const score1 = parseInt(document.getElementById('modal-score1').value) || 0;
        const score2 = parseInt(document.getElementById('modal-score2').value) || 0;

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/tournaments/matches/${this.currentMatchEditing.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ score1, score2 })
            });

            if (res.ok) {
                this.closeModal();
                // Recarregar partidas e classificação em paralelo
                await Promise.all([
                    this.loadTournamentMatches(),
                    this.loadTournamentStandings(this.activeTournamentId)
                ]);
                // Sincronizar o select de classificação com o torneio atual
                if (this.activeTournamentId) {
                    const standingsSelect = document.getElementById('standings-tournament-select');
                    standingsSelect.value = this.activeTournamentId;
                }
            } else {
                alert('Erro ao salvar placar da partida.');
            }
        } catch (err) {
            console.error('Erro ao salvar placar:', err);
        }
    }

    openAddMatchModal() {
        if (!this.activeTournamentId) return;
        const tournament = this.tournaments.find(t => t.id === this.activeTournamentId);
        if (!tournament) return;

        const players = [...tournament.players].sort((a, b) => a.name.localeCompare(b.name));

        const selects = ['add-match-p1', 'add-match-p2', 'add-match-p3', 'add-match-p4'];
        selects.forEach(selectId => {
            const selectEl = document.getElementById(selectId);
            if (selectEl) {
                selectEl.innerHTML = '<option value="">Selecione...</option>';
                players.forEach(p => {
                    const opt = document.createElement('option');
                    opt.value = p.id;
                    opt.innerText = p.name;
                    selectEl.appendChild(opt);
                });
            }
        });

        document.getElementById('add-match-round').value = 1;
        document.getElementById('add-match-court').value = tournament.type === 'REI_DA_PRAIA' ? 'Grupo 1' : 'Quadra 1';

        document.getElementById('add-match-modal').classList.add('active');
    }

    closeAddMatchModal() {
        document.getElementById('add-match-modal').classList.remove('active');
        document.getElementById('add-match-form').reset();
    }

    async saveNewMatch(e) {
        e.preventDefault();
        if (!this.activeTournamentId) return;

        const player1Id = parseInt(document.getElementById('add-match-p1').value);
        const player2Id = parseInt(document.getElementById('add-match-p2').value);
        const player3Id = parseInt(document.getElementById('add-match-p3').value);
        const player4Id = parseInt(document.getElementById('add-match-p4').value);
        const roundNumber = parseInt(document.getElementById('add-match-round').value) || 1;
        const courtName = document.getElementById('add-match-court').value.trim();

        const selectedIds = new Set([player1Id, player2Id, player3Id, player4Id]);
        if (selectedIds.size < 4) {
            alert('Por favor, selecione 4 jogadores diferentes. Não pode haver jogadores repetidos na mesma partida.');
            return;
        }

        const body = {
            player1Id,
            player2Id,
            player3Id,
            player4Id,
            roundNumber,
            courtName
        };

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/tournaments/${this.activeTournamentId}/matches`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                this.closeAddMatchModal();
                await Promise.all([
                    this.loadTournamentMatches(),
                    this.loadTournamentStandings(this.activeTournamentId)
                ]);
            } else {
                alert('Erro ao adicionar partida.');
            }
        } catch (err) {
            console.error('Erro ao adicionar partida:', err);
        }
    }

    async handleGenerateMissingMatches() {
        if (!this.activeTournamentId) return;
        
        if (!confirm('Deseja gerar automaticamente todas as partidas que faltam para que todos os jogadores se enfrentem?')) {
            return;
        }

        try {
            const res = await this.fetchWithRetry(`${API_BASE}/tournaments/${this.activeTournamentId}/matches/generate-missing`, {
                method: 'POST'
            });

            if (res.ok) {
                const newMatches = await res.json();
                if (newMatches.length === 0) {
                    alert('Todas as combinações possíveis de confrontos já foram geradas para este torneio!');
                } else {
                    alert(`${newMatches.length} novas partidas foram geradas com sucesso!`);
                    await Promise.all([
                        this.loadTournamentMatches(),
                        this.loadTournamentStandings(this.activeTournamentId)
                    ]);
                }
            } else {
                alert('Erro ao gerar partidas faltantes.');
            }
        } catch (err) {
            console.error('Erro ao gerar partidas faltantes:', err);
        }
    }
}

// Inicialização
const app = new BeachTennisApp();
document.addEventListener('DOMContentLoaded', () => app.init());
window.app = app;
