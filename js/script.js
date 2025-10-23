/*
 * script.js - Pet Manager Pro
 * Lógica: CRUD de Pets, LocalStorage, Tema Claro/Escuro, Animações, Filtros.
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

// Variável para armazenar o ID do pet sendo editado (null se for adição)
let editingPetId = null;

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
 * @param {Array} pets - A lista de pets a ser salva.
 */
const savePets = (pets) => {
    try {
        localStorage.setItem('pets', JSON.stringify(pets));
    } catch (e) {
        console.error("Erro ao salvar pets no localStorage:", e);
    }
};

let pets = loadPets();

// 3. Gerenciamento de Tema Claro/Escuro

/**
 * Carrega o tema preferido do usuário (Local Storage ou preferência do sistema).
 */
const loadThemePreference = () => {
    // 1. Tenta carregar do localStorage
    const savedTheme = localStorage.getItem('theme');

    // 2. Tenta detectar a preferência do sistema
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Define o tema com a ordem de prioridade: LocalStorage > Sistema > Padrão (light)
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
    li.setAttribute('role', 'region'); // Acessibilidade
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

    // Adiciona ouvintes de eventos aos botões dentro do item
    li.querySelector('.edit-btn').addEventListener('click', () => startEdit(pet.id));
    li.querySelector('.delete-btn').addEventListener('click', () => deletePet(pet.id));

    return li;
};

/**
 * Renderiza a lista de pets no DOM com base nos filtros e busca atuais.
 * @param {Array} [currentPets=pets] - A lista de pets a ser renderizada (pode ser filtrada).
 */
const renderPets = (currentPets = pets) => {
    petList.innerHTML = ''; // Limpa a lista atual

    const searchTerm = searchInput.value.toLowerCase();
    const filterValue = filterSpecies.value;

    // Aplica Filtros e Busca
    const filteredPets = currentPets.filter(pet => {
        const matchesSearch = pet.name.toLowerCase().includes(searchTerm) || pet.species.toLowerCase().includes(searchTerm);
        const matchesFilter = filterValue === 'all' || pet.species === filterValue;
        return matchesSearch && matchesFilter;
    });

    if (filteredPets.length === 0) {
        // Exibe o estado vazio se não houver pets após a filtragem
        emptyState.style.display = 'block';
    } else {
        emptyState.style.display = 'none';
        
        // Adiciona pets ao DOM
        filteredPets.forEach(pet => {
            petList.appendChild(createPetElement(pet));
        });
    }

    // Atualiza a contagem (Acessibilidade: aria-live="polite" no index.html)
    petCountSpan.textContent = filteredPets.length;
};

// 5. Funções CRUD (Criação, Leitura, Atualização, Exclusão)

/**
 * Lida com o envio do formulário (Adicionar ou Atualizar).
 * @param {Event} e - O evento de submissão.
 */
const handleFormSubmit = (e) => {
    e.preventDefault();

    // Cria um objeto pet a partir dos dados do formulário
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
    // Move o foco de volta para o primeiro elemento (Acessibilidade)
    document.getElementById('pet-name').focus();
};

/**
 * Adiciona um novo pet.
 * @param {Object} petData - Dados do novo pet.
 */
const addPet = (petData) => {
    const newPet = {
        id: Date.now(), // ID simples e único
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
        document.getElementById('pet-id').value = id;

        // Atualiza variáveis e botão
        editingPetId = id;
        submitButton.textContent = 'Salvar Alterações';
        submitButton.classList.add('btn-success'); // Efeito visual de edição
        submitButton.classList.remove('btn-primary');
        
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
 * Deleta um pet e aplica a animação de fade-out.
 * @param {number} id - O ID do pet a ser deletado.
 */
const deletePet = (id) => {
    // 1. Encontra o elemento DOM para aplicar a animação
    const petItem = petList.querySelector(`[data-id="${id}"]`);

    if (petItem) {
        // 2. Aplica a classe de animação (CSS transition)
        petItem.classList.add('fade-out');

        // 3. Deleta o item após a animação (0.4s definido no CSS)
        setTimeout(() => {
            pets = pets.filter(p => p.id !== id);
            savePets(pets);
            renderPets();
        }, 400); // Deve ser igual ou maior que a transition-duration no CSS
    }
};

/**
 * Reseta o formulário e sai do modo de edição.
 */
const resetForm = () => {
    petForm.reset();
    editingPetId = null;
    submitButton.textContent = 'Adicionar Pet';
    submitButton.classList.remove('btn-success');
    submitButton.classList.add('btn-primary');
    document.getElementById('pet-id').value = '';
};


// 6. Inicialização e Event Listeners

/**
 * Inicializa a aplicação.
 */
const init = () => {
    // Carrega o tema e renderiza os pets
    loadThemePreference();
    renderPets();

    // Event Listener: Envio do Formulário (CRUD)
    petForm.addEventListener('submit', handleFormSubmit);

    // Event Listener: Alternância de Tema
    themeToggle.addEventListener('click', toggleTheme);

    // Event Listener: Busca (Performance: debounce opcional, mas vamos direto)
    searchInput.addEventListener('input', renderPets);

    // Event Listener: Filtro
    filterSpecies.addEventListener('change', renderPets);

    // Event Listener: Reset do formulário no clique do botão Adicionar (se já estiver no modo edição)
    // Opcional, mas melhora a UX
    submitButton.addEventListener('click', (e) => {
        if (editingPetId && !e.target.closest('form').checkValidity()) {
            // Se estiver editando e o formulário for inválido, apenas submete.
            // Se for um novo pet, o submit padrão lida.
            return;
        }
        if (editingPetId) {
            // Se o botão foi clicado, mas o formulário não foi submetido (ex: clique fora do botão)
            // e o formulário está limpo.
        }
    });

    // Define o ano atual no footer
    document.getElementById('current-year').textContent = new Date().getFullYear();
};

// Inicia a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', init);