// Configuration de l'API
const API_URL = 'https://bycommute-anomalies-detector.fly.dev';

// État global
const STATE = {
    config: null,
    anomalies: [],
    history: null
};

// ============================================================================
// INITIALISATION
// ============================================================================

document.addEventListener('DOMContentLoaded', async () => {
    // Charger la configuration
    await loadConfig();
    
    // Initialiser les tabs
    initTabs();
    
    // Initialiser les event listeners
    initEventListeners();
    
    // Charger l'historique
    await loadHistory();
});

// ============================================================================
// GESTION DES TABS
// ============================================================================

function initTabs() {
    const tabs = document.querySelectorAll('.tab');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Désactiver tous les tabs
    document.querySelectorAll('.tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Activer le tab sélectionné
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Charger les données si nécessaire
    if (tabName === 'history') {
        loadHistory();
    }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function initEventListeners() {
    // Bouton sauvegarder configuration
    document.getElementById('save-config').addEventListener('click', saveConfig);
    
    // Bouton réinitialiser
    document.getElementById('reset-config').addEventListener('click', resetConfig);
    
    // Bouton lancer analyse
    document.getElementById('start-analysis').addEventListener('click', startAnalysis);
    
    // Bouton créer activités
    document.getElementById('create-activities').addEventListener('click', createActivities);
}

// ============================================================================
// CONFIGURATION
// ============================================================================

async function loadConfig() {
    try {
        showNotification('Chargement de la configuration...', 'info');
        
        const response = await fetch(`${API_URL}/api/config`);
        
        if (!response.ok) {
            throw new Error('Erreur chargement configuration');
        }
        
        STATE.config = await response.json();
        renderConfig();
        
        showNotification('Configuration chargée', 'success');
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
        console.error(error);
    }
}

function renderConfig() {
    const container = document.getElementById('rules-container');
    container.innerHTML = '';
    
    const rules = STATE.config.rules;
    
    // Règle 1: Installation Manquante
    container.appendChild(createRuleCard('installation_manquante', rules.installation_manquante, [
        { type: 'number', key: 'delai_jours', label: 'Délai avant sortie d\'atelier', unit: 'jours', help: 'Nombre de jours avant la sortie d\'atelier pour alerter' },
        { type: 'number', key: 'delai_urgent_jours', label: 'Délai urgent', unit: 'jours', help: 'En dessous de ce délai, l\'anomalie devient URGENTE' },
        { type: 'tags', key: 'fabricants', label: 'Fabricants d\'abris', help: 'Noms des fournisseurs fabriquant les abris (ex: Camflex, Axinov)' },
        { type: 'tags', key: 'installateurs', label: 'Installateurs', help: 'Noms des entreprises d\'installation (ex: WEVEE, J43)' },
        { type: 'tags', key: 'mots_cles_abris', label: 'Mots-clés abris', help: 'Mots dans les produits qui indiquent un abri (ex: abri, arceau)' },
        { type: 'tags', key: 'mots_cles_installation', label: 'Mots-clés installation', help: 'Mots dans les produits qui indiquent une installation' }
    ]));
    
    // Règle 2: Commande Non Passée
    container.appendChild(createRuleCard('commande_non_passee', rules.commande_non_passee, [
        { type: 'number', key: 'delai_jours', label: 'Délai avant installation', unit: 'jours', help: 'Nombre de jours avant l\'installation pour vérifier les commandes' },
        { type: 'number', key: 'delai_urgent_jours', label: 'Délai urgent', unit: 'jours', help: 'En dessous de ce délai, l\'anomalie devient URGENTE' },
        { type: 'tags', key: 'exclusions', label: 'Fournisseurs exclus', help: 'Fournisseurs qui peuvent rester en brouillon (transports, etc.)' }
    ]));
    
    // Règle 3: Commande Bloquée
    container.appendChild(createRuleCard('commande_bloquee', rules.commande_bloquee, []));
    
    // Règle 4: Prêt à l'Enlèvement
    container.appendChild(createRuleCard('pret_enlevement', rules.pret_enlevement, [
        { type: 'number', key: 'delai_jours', label: 'Délai maximum d\'attente', unit: 'jours', help: 'Nombre de jours max avant d\'alerter' }
    ]));
}

function createRuleCard(ruleKey, ruleData, fields) {
    const card = document.createElement('div');
    card.className = `rule-card ${ruleData.enabled ? '' : 'disabled'}`;
    card.dataset.rule = ruleKey;
    
    // Header
    const header = document.createElement('div');
    header.className = 'rule-header';
    
    const title = document.createElement('div');
    title.className = 'rule-title';
    title.textContent = ruleData.name;
    
    const toggle = document.createElement('div');
    toggle.className = `toggle-switch ${ruleData.enabled ? 'active' : ''}`;
    toggle.addEventListener('click', () => toggleRule(ruleKey));
    
    header.appendChild(title);
    header.appendChild(toggle);
    
    // Description
    const description = document.createElement('div');
    description.className = 'rule-description';
    description.textContent = ruleData.description;
    
    card.appendChild(header);
    card.appendChild(description);
    
    // Champs de configuration
    fields.forEach(field => {
        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';
        
        const label = document.createElement('label');
        label.className = 'form-label';
        label.textContent = field.label;
        formGroup.appendChild(label);
        
        if (field.help) {
            const subLabel = document.createElement('label');
            subLabel.className = 'form-label-sub';
            subLabel.textContent = field.help;
            formGroup.appendChild(subLabel);
        }
        
        if (field.type === 'number') {
            const inputContainer = document.createElement('div');
            inputContainer.className = 'input-with-unit';
            
            const input = document.createElement('input');
            input.type = 'number';
            input.className = 'form-input';
            input.value = ruleData[field.key];
            input.dataset.rule = ruleKey;
            input.dataset.key = field.key;
            input.addEventListener('change', updateConfigValue);
            
            inputContainer.appendChild(input);
            
            if (field.unit) {
                const unit = document.createElement('span');
                unit.className = 'input-unit';
                unit.textContent = field.unit;
                inputContainer.appendChild(unit);
            }
            
            formGroup.appendChild(inputContainer);
        } else if (field.type === 'tags') {
            const tagsContainer = createTagsInput(ruleKey, field.key, ruleData[field.key]);
            formGroup.appendChild(tagsContainer);
        }
        
        card.appendChild(formGroup);
    });
    
    return card;
}

function createTagsInput(ruleKey, key, values) {
    const container = document.createElement('div');
    container.className = 'tags-container';
    container.dataset.rule = ruleKey;
    container.dataset.key = key;
    
    // Ajouter les tags existants
    values.forEach(value => {
        container.appendChild(createTag(value, ruleKey, key));
    });
    
    // Input pour ajouter
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tag-input';
    input.placeholder = 'Ajouter...';
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim()) {
            addTag(ruleKey, key, input.value.trim());
            input.value = '';
        }
    });
    
    container.appendChild(input);
    
    return container;
}

function createTag(value, ruleKey, key) {
    const tag = document.createElement('div');
    tag.className = 'tag';
    
    const text = document.createElement('span');
    text.textContent = value;
    
    const remove = document.createElement('span');
    remove.className = 'tag-remove';
    remove.textContent = '×';
    remove.addEventListener('click', () => removeTag(ruleKey, key, value));
    
    tag.appendChild(text);
    tag.appendChild(remove);
    
    return tag;
}

function toggleRule(ruleKey) {
    STATE.config.rules[ruleKey].enabled = !STATE.config.rules[ruleKey].enabled;
    renderConfig();
}

function updateConfigValue(e) {
    const ruleKey = e.target.dataset.rule;
    const key = e.target.dataset.key;
    const value = parseInt(e.target.value);
    
    STATE.config.rules[ruleKey][key] = value;
}

function addTag(ruleKey, key, value) {
    if (!STATE.config.rules[ruleKey][key].includes(value)) {
        STATE.config.rules[ruleKey][key].push(value);
        renderConfig();
    }
}

function removeTag(ruleKey, key, value) {
    STATE.config.rules[ruleKey][key] = STATE.config.rules[ruleKey][key].filter(v => v !== value);
    renderConfig();
}

async function saveConfig() {
    try {
        showNotification('Sauvegarde...', 'info');
        
        const response = await fetch(`${API_URL}/api/config`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(STATE.config)
        });
        
        if (!response.ok) {
            throw new Error('Erreur sauvegarde');
        }
        
        showNotification('✅ Configuration sauvegardée !', 'success');
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
        console.error(error);
    }
}

async function resetConfig() {
    if (!confirm('Voulez-vous vraiment réinitialiser la configuration ?')) {
        return;
    }
    
    await loadConfig();
    showNotification('Configuration réinitialisée', 'success');
}

// ============================================================================
// ANALYSE
// ============================================================================

async function startAnalysis() {
    try {
        // UI
        document.getElementById('analysis-progress').style.display = 'block';
        document.getElementById('analysis-results').style.display = 'none';
        document.getElementById('start-analysis').disabled = true;
        
        updateProgress(0, 'Connexion à Odoo...');
        
        // Appel API
        const response = await fetch(`${API_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erreur analyse');
        }
        
        const result = await response.json();
        
        updateProgress(100, 'Analyse terminée !');
        
        // Sauvegarder les anomalies
        STATE.anomalies = result.anomalies;
        
        // Afficher les résultats
        setTimeout(() => {
            document.getElementById('analysis-progress').style.display = 'none';
            displayResults(result);
        }, 500);
        
        document.getElementById('start-analysis').disabled = false;
        
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
        console.error(error);
        document.getElementById('start-analysis').disabled = false;
        document.getElementById('analysis-progress').style.display = 'none';
    }
}

function updateProgress(percent, text) {
    document.getElementById('progress-fill').style.width = `${percent}%`;
    document.getElementById('progress-fill').textContent = `${percent}%`;
    document.getElementById('progress-text').textContent = text;
}

function displayResults(result) {
    document.getElementById('analysis-results').style.display = 'block';
    
    // Stats
    document.getElementById('stat-projets').textContent = result.projets;
    document.getElementById('stat-anomalies').textContent = result.anomalies.length;
    
    // Liste des anomalies
    const list = document.getElementById('anomalies-list');
    list.innerHTML = '';
    
    if (result.anomalies.length === 0) {
        list.innerHTML = '<div class="info-box"><p>✅ Aucune anomalie détectée !</p></div>';
        document.getElementById('create-activities').style.display = 'none';
        return;
    }
    
    document.getElementById('create-activities').style.display = 'block';
    
    result.anomalies.forEach((anomalie, index) => {
        const card = document.createElement('div');
        card.className = `anomaly-card ${anomalie.type}`;
        
        const title = document.createElement('div');
        title.className = 'anomaly-title';
        title.textContent = `[${index + 1}] ${anomalie.projet}`;
        
        const message = document.createElement('div');
        message.className = 'anomaly-message';
        message.textContent = anomalie.message;
        
        const details = document.createElement('div');
        details.className = 'anomaly-details';
        details.innerHTML = `<strong>Détails:</strong> ${JSON.stringify(anomalie.details, null, 2)}`;
        
        card.appendChild(title);
        card.appendChild(message);
        card.appendChild(details);
        
        list.appendChild(card);
    });
}

// ============================================================================
// ACTIVITÉS
// ============================================================================

async function createActivities() {
    if (!confirm(`Créer ${STATE.anomalies.length} activité(s) dans Odoo ?`)) {
        return;
    }
    
    try {
        document.getElementById('create-activities').disabled = true;
        document.getElementById('create-activities').textContent = '⏳ Création en cours...';
        
        const response = await fetch(`${API_URL}/api/activities/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ anomalies: STATE.anomalies })
        });
        
        if (!response.ok) {
            throw new Error('Erreur création activités');
        }
        
        const result = await response.json();
        
        const message = `✅ ${result.results.created.length} créées\n⏭️ ${result.results.skipped.length} ignorées\n❌ ${result.results.errors.length} erreurs`;
        alert(message);
        
        showNotification('Activités créées !', 'success');
        
        document.getElementById('create-activities').disabled = false;
        document.getElementById('create-activities').textContent = '📋 Créer les Activités Odoo';
        
        // Recharger l'historique
        await loadHistory();
        
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
        console.error(error);
        document.getElementById('create-activities').disabled = false;
        document.getElementById('create-activities').textContent = '📋 Créer les Activités Odoo';
    }
}

// ============================================================================
// HISTORIQUE
// ============================================================================

async function loadHistory() {
    try {
        const response = await fetch(`${API_URL}/api/history`);
        
        if (!response.ok) {
            throw new Error('Erreur chargement historique');
        }
        
        STATE.history = await response.json();
        displayHistory();
        
    } catch (error) {
        showNotification(`Erreur: ${error.message}`, 'error');
        console.error(error);
    }
}

function displayHistory() {
    // Stats
    document.getElementById('hist-total').textContent = STATE.history.stats.total_created;
    document.getElementById('hist-errors').textContent = STATE.history.stats.total_errors;
    
    // Liste
    const list = document.getElementById('history-list');
    list.innerHTML = '';
    
    if (STATE.history.activities_created.length === 0) {
        list.innerHTML = '<div class="info-box"><p>Aucune activité créée pour le moment.</p></div>';
        return;
    }
    
    // Trier par date (plus récent en premier)
    const sorted = [...STATE.history.activities_created].sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
    );
    
    sorted.forEach(activity => {
        const item = document.createElement('div');
        item.className = 'history-item';
        
        const date = document.createElement('div');
        date.className = 'history-date';
        date.textContent = new Date(activity.created_at).toLocaleString('fr-FR');
        
        const content = document.createElement('div');
        content.className = 'history-content';
        content.textContent = `${activity.projet} - ${activity.type} (Activité #${activity.activity_id})`;
        
        item.appendChild(date);
        item.appendChild(content);
        
        list.appendChild(item);
    });
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

function showNotification(message, type = 'info') {
    const notif = document.createElement('div');
    notif.className = `notification ${type}`;
    notif.textContent = message;
    
    document.body.appendChild(notif);
    
    setTimeout(() => {
        notif.remove();
    }, 3000);
}

