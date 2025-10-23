/*
 * script.js - Pet Manager Pro (Com Roteamento)
 * Core: Client-Side Routing (showPage), CRUD e LocalStorage.
 */

// 1. Variáveis Globais do DOM
const petForm = document.getElementById('pet-form');
const petList = document.getElementById('pet-list');
const themeToggle = document.getElementById('theme-toggle');
const petCountSpan = document.getElementById('pet-count');
const emptyState = document.getElementById('empty-state');
const submitButton = document.getElementById('submit-button');
const searchInput = document.getElementById('search-input');
const filterSpecies = document.getElementById('filter-species');
const cancelButton = document.getElementById('cancel-edit');

// Elementos de Roteamento
const dashboardPage = document.getElementById('dashboard');
const managePetPage = document.getElementById('manage-pet');
const navLinks = document.querySelectorAll('.nav-link');
const allPages = [dashboardPage, managePetPage]; // Para iterar facilmente

let editingPetId = null;
let pets = [];

// 2. Persistência de Dados (Local Storage)
const loadPets = () => {
    try {
        const petsJson = localStorage.getItem('pets');
        return petsJson ? JSON.parse(petsJson) : [];
    } catch (e) {
        console.error("Erro ao carregar pets do localStorage:", e);
        return [];
    }
};

const savePets = (petsToSave) => {
    try {
        localStorage.setItem('pets', JSON.stringify(petsToSave));
    } catch (e) {
        console.error("Erro ao salvar pets no localStorage:", e);
    }
};

// 3. Gerenciamento de Tema (Código omitido para brevidade, mas idêntico ao anterior)
const loadThemePreference = () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    let themeToSet = 'light';
    if (savedTheme) { themeToSet = savedTheme; } 
    else if (systemPrefersDark) { themeToSet = 'dark'; }
    setTheme(themeToSet);
};
const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeToggleIcon(theme);
};
const updateThemeToggleIcon = (theme) => {
    themeToggle.innerHTML = theme === 'dark' ? '<span class="icon-sun" aria-hidden="true">☀️</span>' : '<span class="icon-moon" aria-hidden="true">🌙</span>';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
};
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
};

// 4. ROTEAMENTO DE PÁGINAS (NOVO CORE)

/**
 * Mostra uma página, esconde as outras e atualiza o histórico do navegador.
 * @param {string} pageId - O ID da página a ser exibida (ex: 'dashboard').
 */
const showPage = (pageId) => {
    let pageFound = false;
    
    // 1. Alterna a visibilidade das páginas
    allPages.forEach(page => {
        if (page.id === pageId) {
            page.classList.add('active-page');
            page.style.display = 'block'; // Exibe a página (ativa o fade-in)
            pageFound = true;
        } else {
            page.classList.remove('active-page');
            // Timeout para garantir que o fade-out termine antes de sumir
            setTimeout(() => { page.style.display = 'none'; }, 400); 
        }
    });

    // 2. Fallback para a página padrão
    if (!pageFound) {
        pageId = 'dashboard';
        dashboardPage.classList.add('active-page');
        dashboardPage.style.display = 'block';
    }

    // 3. Atualiza a URL e o histórico (Client-Side Routing)
    window.history.pushState({ page: pageId }, '', `#${pageId}`);

    // 4. Atualiza o estado visual da navegação
    navLinks.forEach(link => {
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
    
    // 5. Ações específicas ao mudar de página
    if (pageId === 'dashboard') {
        renderPets(); // Garante que a lista está atualizada ao visualizar
    } else if (pageId === 'manage-pet' && !editingPetId) {
        resetForm(); // Garante formulário limpo ao entrar no modo de adição
    }
};

/**
 * Processa a URL atual (hash) para decidir qual página mostrar.
 * É usado na inicialização e ao usar os botões Voltar/Avançar do navegador.
 */
const handleLocation = () => {
    // Pega o hash da URL (ex: #manage-pet) e remove o #
    const hash = window.location.hash.replace('#', '');
    const pageId = hash || 'dashboard'; // Padrão é dashboard
    showPage(pageId);
};


// 5. Manipulação Dinâmica do DOM (Renderização)

/**
 * Cria um elemento <li> para um pet.
 */
const createPetElement = (pet) => {
    const li = document.createElement('li');
    li.className = 'pet-item';
    li.setAttribute('data-id', pet.id);
    li.setAttribute('role', 'region');
    li.setAttribute('aria-label', `Detalhes de ${pet.name}`);

    li.innerHTML = `
        <div class="pet-info">
            <h3 aria-label="Nome do pet">${pet.name}</h3>
            <p><strong>Espécie:</strong> ${pet.species}</p>
            <p><strong>Idade:</strong> ${pet.age} anos</p>
        </div>
        <div class="pet-actions">
            <button class="btn btn-primary edit-btn" aria-label="Editar ${pet.name}" data-id="${pet.id}">
                Editar
            </button>
            <button class="btn btn-danger delete-btn" aria-label="Deletar ${pet.name}" data-id="${pet.id}">
                Deletar
            </button>
        </div>
    `;

    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(pet.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deletePet(pet.id));

    return li;
};

/**
 * Renderiza a lista de pets no DOM com filtros e busca.
 */
const renderPets = () => {
    petList.innerHTML = '';
    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSpecies.value.toLowerCase(); 

    const filteredPets = pets.filter(pet => {
        const petSpeciesLower = pet.species.toLowerCase();
        
        // Lógica de busca e filtro combinada (case-insensitive)
        const matchesSearch = pet.name.toLowerCase().includes(searchTerm) || petSpeciesLower.includes(searchTerm);
        const matchesFilter = filterValue === 'all' || petSpeciesLower === filterValue;
        
        return matchesSearch && matchesFilter;
    });

    if (filteredPets.length === 0) {
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        filteredPets.forEach(pet => {
            petList.appendChild(createPetElement(pet));
        });
    }
    petCountSpan.textContent = filteredPets.length;
};


// 6. Funções CRUD (Criação, Leitura, Atualização, Exclusão)

const handleFormSubmit = (e) => {
    e.preventDefault();

    // Captura dos dados do formulário
    const petData = {
        name: document.getElementById('pet-name').value.trim(),
        species: document.getElementById('pet-species').value,
        age: parseInt(document.getElementById('pet-age').value, 10),
    };

    if (editingPetId) {
        updatePet(editingPetId, petData);
    } else {
        addPet(petData);
    }

    // Após o CRUD, retorna à lista de pets
    resetForm();
    showPage('dashboard');
};

const addPet = (petData) => {
    const newPet = { id: Date.now(), ...petData };
    pets.push(newPet);
    savePets(pets);
};

const updatePet = (id, newPetData) => {
    const index = pets.findIndex(p => p.id === id);
    if (index !== -1) {
        pets[index] = { ...pets[index], ...newPetData };
        savePets(pets);
    }
};

const startEdit = (id) => {
    const petToEdit = pets.find(p => p.id === id);

    if (petToEdit) {
        // Preenche o formulário
        document.getElementById('pet-name').value = petToEdit.name;
        document.getElementById('pet-species').value = petToEdit.species;
        document.getElementById('pet-age').value = petToEdit.age;
        
        // Entra no modo de edição visual
        editingPetId = id;
        submitButton.textContent = 'Salvar Alterações';
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-success'); 
        cancelButton.style.display = 'inline-block';

        // MUDA PARA A PÁGINA DO FORMULÁRIO
        showPage('manage-pet'); 
        
        document.getElementById('pet-name').focus(); 
    }
};

const deletePet = (id) => {
    const petItem = petList.querySelector(`[data-id="${id}"]`);

    if (petItem) {
        petItem.classList.add('fade-out');

        setTimeout(() => {
            pets = pets.filter(p => p.id !== id);
            savePets(pets);
            renderPets();

            if (editingPetId === id) {
                resetForm();
                showPage('dashboard'); 
            }
        }, 400); 
    }
};

const resetForm = () => {
    petForm.reset();
    editingPetId = null;
    submitButton.textContent = 'Adicionar Pet';
    submitButton.classList.remove('btn-success');
    submitButton.classList.add('btn-primary');
    cancelButton.style.display = 'none';
};


// 7. Inicialização e Event Listeners

const init = () => {
    // Carregamento inicial de dados e tema
    pets = loadPets();
    loadThemePreference();
    
    // 1. Roteamento: Define qual página mostrar na carga inicial
    handleLocation();

    // 2. Roteamento: Lida com os botões de Voltar/Avançar do navegador
    window.addEventListener('popstate', handleLocation); 

    // 3. Roteamento: Lida com cliques nos links da navegação interna
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.getAttribute('href').startsWith('#')) {
                e.preventDefault();
                const pageId = link.getAttribute('href').replace('#', '');
                // showPage é chamada para alternar
                showPage(pageId); 
            }
        });
    });

    // 4. CRUD e Interatividade
    petForm.addEventListener('submit', handleFormSubmit);
    cancelButton.addEventListener('click', () => {
        resetForm();
        showPage('dashboard'); // Volta para o dashboard ao cancelar
    });
    themeToggle.addEventListener('click', toggleTheme);
    searchInput.addEventListener('input', renderPets);
    filterSpecies.addEventListener('change', renderPets);

    document.getElementById('current-year').textContent = new Date().getFullYear();
};

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);