import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Chemins vers les fichiers de configuration
const RULES_PATH = path.join(__dirname, 'config', 'rules.json');
const HISTORY_PATH = path.join(__dirname, 'config', 'history.json');

// ============================================================================
// UTILITAIRES
// ============================================================================

async function readJSON(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Erreur lecture ${filePath}:`, error.message);
        throw error;
    }
}

async function writeJSON(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error(`Erreur écriture ${filePath}:`, error.message);
        throw error;
    }
}

function log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    console.log(`[${timestamp}] ${prefix} ${message}`);
}

// ============================================================================
// API ODOO
// ============================================================================

async function callOdooAPI(model, method, args = [], kwargs = {}) {
    const config = await readJSON(RULES_PATH);
    
    const payload = {
        model: model,
        method: method,
        args: args
    };
    
    if (Object.keys(kwargs).length > 0) {
        payload.kwargs = kwargs;
    }
    
    log(`Appel Odoo: ${model}.${method}`);
    
    const response = await fetch(config.odoo.api_url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${config.odoo.api_token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
    }
    
    return await response.json();
}

// ============================================================================
// ROUTES - CONFIGURATION
// ============================================================================

// GET /api/config - Récupérer la configuration
app.get('/api/config', async (req, res) => {
    try {
        const config = await readJSON(RULES_PATH);
        res.json(config);
    } catch (error) {
        log(`Erreur GET config: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// POST /api/config - Sauvegarder la configuration
app.post('/api/config', async (req, res) => {
    try {
        await writeJSON(RULES_PATH, req.body);
        log('Configuration sauvegardée', 'success');
        res.json({ success: true, message: 'Configuration sauvegardée' });
    } catch (error) {
        log(`Erreur POST config: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ROUTES - HISTORIQUE
// ============================================================================

// GET /api/history - Récupérer l'historique
app.get('/api/history', async (req, res) => {
    try {
        const history = await readJSON(HISTORY_PATH);
        res.json(history);
    } catch (error) {
        log(`Erreur GET history: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ROUTES - ANALYSE
// ============================================================================

// POST /api/analyze - Lancer l'analyse
app.post('/api/analyze', async (req, res) => {
    try {
        log('Démarrage analyse...');
        
        const config = await readJSON(RULES_PATH);
        const history = await readJSON(HISTORY_PATH);
        
        // 1. Récupérer les commandes en cours
        const domain = [
            "&", "|",
            ["x_studio_commande_client.delivery_status", "!=", "full"],
            "&",
            ["x_studio_opportunuit_lie", "=", false],
            ["receipt_status", "!=", "full"],
            ["state", "not in", ["cancel", "done"]]
        ];
        
        const fields = [
            "name", "partner_id", "date_planned", "state", "receipt_status",
            "x_studio_commande_client", "order_line", "amount_total",
            "x_studio_statut_chez_le_fournisseur", "x_studio_dimension_du_colis",
            "x_studio_poids", "x_studio_opportunuit_lie"
        ];
        
        const commandesResult = await callOdooAPI('purchase.order', 'search_read', [], {
            domain: domain,
            fields: fields,
            order: 'x_studio_commande_client, date_planned'
        });
        
        const commandes = Array.isArray(commandesResult) ? commandesResult : commandesResult.result || [];
        log(`${commandes.length} commandes récupérées`, 'success');
        
        // 2. Grouper par projet
        const projets = grouperParProjet(commandes);
        log(`${Object.keys(projets).length} projets trouvés`, 'success');
        
        // 3. Récupérer les lignes de commande
        const orderIds = commandes.map(cmd => cmd.id);
        const linesResult = await callOdooAPI('purchase.order.line', 'search_read', [], {
            domain: [["order_id", "in", orderIds]],
            fields: ["order_id", "name", "product_id", "product_qty", "price_unit"]
        });
        
        const allLines = Array.isArray(linesResult) ? linesResult : linesResult.result || [];
        log(`${allLines.length} lignes récupérées`, 'success');
        
        // 4. Analyser chaque projet
        const anomalies = [];
        for (const [projetName, projet] of Object.entries(projets)) {
            const projetAnomalies = await analyserProjet(projet, allLines, config);
            anomalies.push(...projetAnomalies);
        }
        
        log(`${anomalies.length} anomalie(s) détectée(s)`, 'success');
        
        // 5. Mettre à jour l'historique
        history.last_analysis = new Date().toISOString();
        await writeJSON(HISTORY_PATH, history);
        
        res.json({
            success: true,
            projets: Object.keys(projets).length,
            anomalies: anomalies,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        log(`Erreur analyse: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ROUTES - ACTIVITÉS
// ============================================================================

// POST /api/activities/create - Créer les activités pour les anomalies
app.post('/api/activities/create', async (req, res) => {
    try {
        const { anomalies } = req.body;
        
        if (!anomalies || !Array.isArray(anomalies)) {
            return res.status(400).json({ error: 'Anomalies requises (array)' });
        }
        
        log(`Création de ${anomalies.length} activité(s)...`);
        
        const config = await readJSON(RULES_PATH);
        const history = await readJSON(HISTORY_PATH);
        
        const results = {
            created: [],
            skipped: [],
            errors: []
        };
        
        for (const anomalie of anomalies) {
            try {
                // Vérifier si déjà créée
                const activityKey = `${anomalie.commandeId}_${anomalie.type}`;
                const alreadyCreated = history.activities_created.find(
                    a => a.key === activityKey
                );
                
                if (alreadyCreated) {
                    results.skipped.push({
                        anomalie: anomalie.projet,
                        reason: 'Activité déjà créée précédemment',
                        date: alreadyCreated.created_at
                    });
                    continue;
                }
                
                // Créer l'activité (avec retry)
                const activityId = await createActivityWithRetry(anomalie, config);
                
                if (activityId) {
                    // Sauvegarder dans l'historique
                    history.activities_created.push({
                        key: activityKey,
                        activity_id: activityId,
                        projet: anomalie.projet,
                        type: anomalie.type,
                        commande_id: anomalie.commandeId,
                        created_at: new Date().toISOString()
                    });
                    
                    history.stats.total_created++;
                    
                    results.created.push({
                        anomalie: anomalie.projet,
                        activity_id: activityId
                    });
                    
                    log(`Activité créée pour ${anomalie.projet}`, 'success');
                } else {
                    results.errors.push({
                        anomalie: anomalie.projet,
                        error: 'Échec création après retry'
                    });
                }
                
            } catch (error) {
                results.errors.push({
                    anomalie: anomalie.projet,
                    error: error.message
                });
                history.stats.total_errors++;
            }
        }
        
        // Sauvegarder l'historique
        await writeJSON(HISTORY_PATH, history);
        
        log(`Résultat: ${results.created.length} créées, ${results.skipped.length} ignorées, ${results.errors.length} erreurs`);
        
        res.json({
            success: true,
            results: results
        });
        
    } catch (error) {
        log(`Erreur création activités: ${error.message}`, 'error');
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// LOGIQUE DE DÉTECTION
// ============================================================================

function grouperParProjet(commandes) {
    const projets = {};
    
    for (const cmd of commandes) {
        const client = cmd.x_studio_commande_client;
        if (client && Array.isArray(client) && client.length >= 2) {
            const projetId = client[0];
            const projetName = client[1];
            
            if (!projets[projetName]) {
                projets[projetName] = {
                    id: projetId,
                    name: projetName,
                    commandes: []
                };
            }
            
            projets[projetName].commandes.push(cmd);
        }
    }
    
    return projets;
}

function identifierTypeCommande(partnerName, orderLines, config) {
    const rules = config.rules;
    
    // Vérifier fabricant
    if (rules.installation_manquante.fabricants.some(fab => partnerName.includes(fab))) {
        return 'fabricant';
    }
    
    // Vérifier installateur
    if (rules.installation_manquante.installateurs.some(inst => partnerName.includes(inst))) {
        return 'installation';
    }
    
    // Vérifier transport
    if (rules.commande_non_passee.exclusions.some(trans => partnerName.includes(trans))) {
        return 'transport';
    }
    
    // Vérifier lignes de commande
    for (const line of orderLines) {
        const lineName = (line.name || '').toLowerCase();
        
        if (rules.installation_manquante.mots_cles_installation.some(mot => lineName.includes(mot))) {
            return 'installation';
        }
        
        if (rules.installation_manquante.mots_cles_abris.some(mot => lineName.includes(mot))) {
            return 'fabricant';
        }
    }
    
    return 'autre';
}

async function analyserProjet(projet, allLines, config) {
    const anomalies = [];
    const rules = config.rules;
    
    // Règle 1: Commande bloquée
    if (rules.commande_bloquee.enabled) {
        const anomalie = verifierCommandeBloquee(projet);
        if (anomalie) anomalies.push(anomalie);
    }
    
    // Règle 2: Installation manquante
    if (rules.installation_manquante.enabled) {
        const anomalie = verifierInstallationManquante(projet, allLines, config);
        if (anomalie) anomalies.push(anomalie);
    }
    
    // Règle 3: Commandes non passées
    if (rules.commande_non_passee.enabled) {
        const projetAnomalies = verifierCommandesNonPassees(projet, config);
        anomalies.push(...projetAnomalies);
    }
    
    // Règle 4: Prêt à l'enlèvement
    if (rules.pret_enlevement.enabled) {
        const anomalie = verifierPretEnlevement(projet, config);
        if (anomalie) anomalies.push(anomalie);
    }
    
    return anomalies;
}

function verifierCommandeBloquee(projet) {
    const today = new Date();
    const datesFutures = [];
    const datesPassees = [];
    
    for (const cmd of projet.commandes) {
        if (cmd.date_planned) {
            const date = new Date(cmd.date_planned);
            if (date < today) {
                datesPassees.push({ name: cmd.name, date: date });
            } else {
                datesFutures.push({ name: cmd.name, date: date });
            }
        }
    }
    
    if (datesPassees.length > 0 && datesFutures.length === 0) {
        return {
            type: 'COMMANDE_BLOQUEE',
            projet: projet.name,
            projetId: projet.id,
            commandeId: projet.commandes[0].id,
            message: `Toutes les livraisons prévues sont passées mais le projet est encore en cours`,
            details: {
                nb_commandes: projet.commandes.length,
                dates_passees: datesPassees
            }
        };
    }
    
    return null;
}

function verifierInstallationManquante(projet, allLines, config) {
    const rules = config.rules.installation_manquante;
    const today = new Date();
    const limite = new Date(today.getTime() + rules.delai_jours * 24 * 60 * 60 * 1000);
    
    // Trouver fabricant
    let commandeFabricant = null;
    let dateSortieFabricant = null;
    
    for (const cmd of projet.commandes) {
        const partnerName = cmd.partner_id ? cmd.partner_id[1] : '';
        const cmdLines = allLines.filter(line => line.order_id[0] === cmd.id);
        const type = identifierTypeCommande(partnerName, cmdLines, config);
        
        if (type === 'fabricant' && cmd.date_planned) {
            commandeFabricant = cmd;
            dateSortieFabricant = new Date(cmd.date_planned);
            break;
        }
    }
    
    if (!commandeFabricant || !dateSortieFabricant || dateSortieFabricant > limite) {
        return null;
    }
    
    // Chercher installation
    let installationOk = false;
    
    for (const cmd of projet.commandes) {
        const partnerName = cmd.partner_id ? cmd.partner_id[1] : '';
        const cmdLines = allLines.filter(line => line.order_id[0] === cmd.id);
        const type = identifierTypeCommande(partnerName, cmdLines, config);
        
        if (type === 'installation' && ['purchase', 'sent'].includes(cmd.state)) {
            installationOk = true;
            break;
        }
    }
    
    if (!installationOk) {
        const joursRestants = Math.ceil((dateSortieFabricant - today) / (24 * 60 * 60 * 1000));
        
        return {
            type: 'INSTALLATION_MANQUANTE',
            projet: projet.name,
            projetId: projet.id,
            commandeId: commandeFabricant.id,
            message: joursRestants < 0 
                ? `Sortie d'atelier il y a ${Math.abs(joursRestants)} jours mais installation toujours pas commandée`
                : `Sortie d'atelier dans ${joursRestants} jours mais installation toujours pas commandée`,
            details: {
                commande_fabricant: commandeFabricant.name,
                fournisseur: commandeFabricant.partner_id[1],
                date_sortie: dateSortieFabricant.toISOString(),
                jours_restants: joursRestants
            }
        };
    }
    
    return null;
}

function verifierCommandesNonPassees(projet, config) {
    const rules = config.rules.commande_non_passee;
    const today = new Date();
    const limite = new Date(today.getTime() + rules.delai_jours * 24 * 60 * 60 * 1000);
    const anomalies = [];
    
    // Trouver date installation
    let dateInstallation = null;
    
    for (const cmd of projet.commandes) {
        const partnerName = cmd.partner_id ? cmd.partner_id[1] : '';
        if (rules.installateurs && rules.installateurs.some(inst => partnerName.includes(inst)) && cmd.date_planned) {
            const date = new Date(cmd.date_planned);
            if (!dateInstallation || date < dateInstallation) {
                dateInstallation = date;
            }
        }
    }
    
    if (!dateInstallation || dateInstallation > limite) {
        return anomalies;
    }
    
    // Vérifier commandes draft
    for (const cmd of projet.commandes) {
        if (cmd.state === 'draft') {
            const partnerName = cmd.partner_id ? cmd.partner_id[1] : '';
            
            // Exclure transports et installateurs
            if (rules.exclusions.some(ex => partnerName.includes(ex))) {
                continue;
            }
            
            const joursAvant = Math.ceil((dateInstallation - today) / (24 * 60 * 60 * 1000));
            
            anomalies.push({
                type: 'COMMANDE_NON_PASSEE',
                projet: projet.name,
                projetId: projet.id,
                commandeId: cmd.id,
                message: joursAvant < 0
                    ? `Installation prévue il y a ${Math.abs(joursAvant)} jours mais commande ${partnerName} toujours en brouillon`
                    : `Installation dans ${joursAvant} jours mais commande ${partnerName} toujours en brouillon`,
                details: {
                    commande: cmd.name,
                    fournisseur: partnerName,
                    montant: cmd.amount_total || 0,
                    jours_avant_installation: joursAvant
                }
            });
        }
    }
    
    return anomalies;
}

function verifierPretEnlevement(projet, config) {
    const rules = config.rules.pret_enlevement;
    const today = new Date();
    const limite = new Date(today.getTime() - rules.delai_jours * 24 * 60 * 60 * 1000);
    
    for (const cmd of projet.commandes) {
        const statut = cmd.x_studio_statut_chez_le_fournisseur || [];
        
        if (statut.includes(1) && cmd.receipt_status !== 'full' && cmd.date_planned) {
            const date = new Date(cmd.date_planned);
            
            if (date < limite) {
                const joursAttente = Math.ceil((today - date) / (24 * 60 * 60 * 1000));
                const partnerName = cmd.partner_id ? cmd.partner_id[1] : '';
                
                return {
                    type: 'PRET_ENLEVEMENT_TROP_LONG',
                    projet: projet.name,
                    projetId: projet.id,
                    commandeId: cmd.id,
                    message: `En attente chez ${partnerName} depuis ${joursAttente} jours`,
                    details: {
                        commande: cmd.name,
                        fournisseur: partnerName,
                        jours_attente: joursAttente,
                        dimensions: cmd.x_studio_dimension_du_colis || 'Non spécifié',
                        poids: cmd.x_studio_poids || 'Non spécifié'
                    }
                };
            }
        }
    }
    
    return null;
}

async function createActivityWithRetry(anomalie, config) {
    const maxRetries = 1; // 1 tentative de retry
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 2);
            const deadlineStr = deadline.toISOString().split('T')[0];
            
            const noteHtml = `
                <p><strong>📋 Contexte :</strong></p>
                <p>${anomalie.message}</p>
                <hr/>
                <p><strong>✅ Actions à réaliser :</strong></p>
                <ul>
                    ${getActionsToDo(anomalie)}
                </ul>
            `;
            
            const result = await callOdooAPI('mail.activity', 'create', [[{
                activity_type_id: config.odoo.activity_type_urgent_id,
                user_id: config.odoo.mathieu_raynaud_id,
                res_model: "purchase.order",
                res_model_id: config.odoo.purchase_order_model_id,
                res_id: anomalie.commandeId,
                summary: `🚨 ${anomalie.type.replace(/_/g, ' ')} - ${anomalie.projet}`,
                note: noteHtml,
                date_deadline: deadlineStr
            }]], {});
            
            if (result && result.length > 0) {
                return result[0];
            }
            
        } catch (error) {
            log(`Tentative ${attempt + 1}/${maxRetries + 1} échouée: ${error.message}`, 'error');
            
            if (attempt === maxRetries) {
                return null;
            }
            
            // Attendre 1 seconde avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    return null;
}

function getActionsToDo(anomalie) {
    switch (anomalie.type) {
        case 'INSTALLATION_MANQUANTE':
            return '<li>Commander l\'installation chez WeeVee ou un installateur</li><li>Prévoir la date d\'installation</li>';
        case 'COMMANDE_NON_PASSEE':
            return `<li>Passer la commande chez ${anomalie.details.fournisseur}</li><li>Valider le bon de commande</li>`;
        case 'PRET_ENLEVEMENT_TROP_LONG':
            return '<li>Organiser le transport</li><li>Coordonner l\'enlèvement</li>';
        case 'COMMANDE_BLOQUEE':
            return '<li>Vérifier le blocage SAV</li><li>Résoudre le problème et clôturer le projet</li>';
        default:
            return '<li>Voir les détails de l\'anomalie</li>';
    }
}

// ============================================================================
// DÉMARRAGE SERVEUR
// ============================================================================

app.listen(PORT, () => {
    log(`🚀 Serveur démarré sur le port ${PORT}`, 'success');
    log(`📊 API disponible sur http://localhost:${PORT}`);
});

