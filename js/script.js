/*
 * script.js - Pet Manager Pro
 * Lógica: CRUD de Pets, LocalStorage, Tema Claro/Escuro, Filtros robustos.
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
const cancelButton = document.getElementById('cancel-edit'); // Novo botão

// Variável global para rastrear o estado de edição
let editingPetId = null;
let pets = []; // Inicialmente vazia, será carregada na inicialização

// 2. Persistência de Dados (Local Storage)

/**
 * Carrega a lista de pets do LocalStorage.
 * @returns {Array} Lista de pets, ou um array vazio se não houver dados.
 */
const loadPets = () => {
    try {
        const petsJson = localStorage.getItem('pets');
        return petsJson ? JSON.parse(petsJson) : [];
    } catch (e) {
        console.error("Erro ao carregar pets do localStorage:", e);
        return [];
    }
};

/**
 * Salva a lista de pets no LocalStorage.
 * @param {Array} petsToSave - A lista de pets a ser salva.
 */
const savePets = (petsToSave) => {
    try {
        localStorage.setItem('pets', JSON.stringify(petsToSave));
    } catch (e) {
        console.error("Erro ao salvar pets no localStorage:", e);
    }
};

// 3. Gerenciamento de Tema Claro/Escuro

/**
 * Carrega o tema preferido e define o estado inicial.
 */
const loadThemePreference = () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Define o tema com a ordem: LocalStorage > Sistema > Padrão (light)
    let themeToSet = 'light';
    if (savedTheme) {
        themeToSet = savedTheme;
    } else if (systemPrefersDark) {
        themeToSet = 'dark';
    }

    setTheme(themeToSet);
};

/**
 * Aplica e salva o novo tema.
 * @param {string} theme - 'light' ou 'dark'.
 */
const setTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    updateThemeToggleIcon(theme);
};

/**
 * Atualiza o ícone do botão de alternância (Sol/Lua).
 * @param {string} theme - 'light' ou 'dark'.
 */
const updateThemeToggleIcon = (theme) => {
    themeToggle.innerHTML = theme === 'dark' ? '<span class="icon-sun" aria-hidden="true">☀️</span>' : '<span class="icon-moon" aria-hidden="true">🌙</span>';
    themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro');
};

/**
 * Alterna entre tema claro e escuro.
 */
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
};

// 4. Manipulação Dinâmica do DOM (Renderização)

/**
 * Cria um elemento HTML (li) para um pet.
 * @param {Object} pet - O objeto pet.
 * @returns {HTMLLIElement} O elemento <li> do pet.
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

    // Adiciona ouvintes de eventos
    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(pet.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deletePet(pet.id));

    return li;
};

/**
 * Renderiza a lista de pets no DOM com filtros e busca.
 */
const renderPets = () => {
    petList.innerHTML = ''; // Limpa a lista atual

    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSpecies.value.toLowerCase(); // Padroniza para robustez

    // Aplica Filtros e Busca
    const filteredPets = pets.filter(pet => {
        const petSpeciesLower = pet.species.toLowerCase();
        
        // 1. Busca por nome OU espécie
        const matchesSearch = pet.name.toLowerCase().includes(searchTerm) || petSpeciesLower.includes(searchTerm);
        
        // 2. Filtro por espécie (case-insensitive)
        const matchesFilter = filterValue === 'all' || petSpeciesLower === filterValue;
        
        return matchesSearch && matchesFilter;
    });

    if (filteredPets.length === 0) {
        // Exibe o estado vazio se não houver pets
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        // Adiciona pets ao DOM
        filteredPets.forEach(pet => {
            petList.appendChild(createPetElement(pet));
        });
    }

    // Atualiza a contagem
    petCountSpan.textContent = filteredPets.length;
};

// 5. Funções CRUD (Criação, Leitura, Atualização, Exclusão)

/**
 * Lida com o envio do formulário (Adicionar ou Atualizar).
 * @param {Event} e - O evento de submissão.
 */
const handleFormSubmit = (e) => {
    e.preventDefault(); // Impede o recarregamento da página

    // Captura dos dados do formulário
    const petData = {
        name: document.getElementById('pet-name').value.trim(),
        species: document.getElementById('pet-species').value,
        age: parseInt(document.getElementById('pet-age').value, 10),
    };

    if (editingPetId) {
        // Modo Edição
        updatePet(editingPetId, petData);
    } else {
        // Modo Criação
        addPet(petData);
    }

    resetForm();
    renderPets();
    // Foca na busca após adicionar/editar (boa UX)
    searchInput.focus();
};

/**
 * Adiciona um novo pet.
 * @param {Object} petData - Dados do novo pet.
 */
const addPet = (petData) => {
    const newPet = {
        id: Date.now(), // ID simples baseado no tempo
        ...petData,
    };
    pets.push(newPet);
    savePets(pets);
};

/**
 * Inicia o modo de edição, preenchendo o formulário.
 * @param {number} id - O ID do pet a ser editado.
 */
const startEdit = (id) => {
    const petToEdit = pets.find(p => p.id === id);

    if (petToEdit) {
        // Preenche o formulário
        document.getElementById('pet-name').value = petToEdit.name;
        document.getElementById('pet-species').value = petToEdit.species;
        document.getElementById('pet-age').value = petToEdit.age;
        
        // Atualiza variáveis e botões para o modo de edição
        editingPetId = id;
        submitButton.textContent = 'Salvar Alterações';
        submitButton.classList.remove('btn-primary');
        submitButton.classList.add('btn-success'); 
        cancelButton.style.display = 'inline-block'; // Mostra o botão cancelar
        
        // Foca no primeiro campo do formulário (Acessibilidade)
        document.getElementById('pet-name').focus(); 
    }
};

/**
 * Atualiza os dados de um pet existente.
 * @param {number} id - O ID do pet.
 * @param {Object} newPetData - Os novos dados do pet.
 */
const updatePet = (id, newPetData) => {
    const index = pets.findIndex(p => p.id === id);
    if (index !== -1) {
        pets[index] = { ...pets[index], ...newPetData };
        savePets(pets);
    }
};

/**
 * Deleta um pet com animação de fade-out.
 * @param {number} id - O ID do pet a ser deletado.
 */
const deletePet = (id) => {
    const petItem = petList.querySelector(`[data-id="${id}"]`);

    if (petItem) {
        // Aplica a classe de animação CSS
        petItem.classList.add('fade-out');

        // Deleta o item após a animação de 400ms (definida no CSS)
        setTimeout(() => {
            pets = pets.filter(p => p.id !== id);
            savePets(pets);
            renderPets();

            // Se estivermos editando o pet que acabamos de deletar, resetamos o form
            if (editingPetId === id) {
                resetForm();
            }
        }, 400); 
    }
};

/**
 * Reseta o formulário e sai do modo de edição.
 */
const resetForm = () => {
    petForm.reset();
    editingPetId = null;
    
    // Volta o botão ao estado original
    submitButton.textContent = 'Adicionar Pet';
    submitButton.classList.remove('btn-success');
    submitButton.classList.add('btn-primary');
    cancelButton.style.display = 'none'; // Esconde o botão cancelar
};


// 6. Inicialização e Event Listeners

/**
 * Inicializa a aplicação.
 */
const init = () => {
    // 1. Carrega os dados persistidos
    pets = loadPets();
    
    // 2. Carrega as preferências do usuário (Tema)
    loadThemePreference();
    
    // 3. Renderiza a lista inicial
    renderPets();

    // 4. Configura Event Listeners

    // CRUD: Envio do Formulário (Adicionar/Editar)
    petForm.addEventListener('submit', handleFormSubmit);

    // CRUD: Cancelar Edição
    cancelButton.addEventListener('click', resetForm);

    // Interatividade: Alternância de Tema
    themeToggle.addEventListener('click', toggleTheme);

    // Interatividade: Busca e Filtro (Disparam a renderização)
    searchInput.addEventListener('input', renderPets);
    filterSpecies.addEventListener('change', renderPets);

    // Define o ano atual no footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
};

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);