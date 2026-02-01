/* ==================== SAFARI ZONE GAME ==================== */

const BIOMES = [
    { id: 'forest', name: 'Forest Zone', icon: 'assets/jungle-front.png', creatures: ['Jungle', 'Inferno', 'Molty'] },
    { id: 'mountain', name: 'Mountain Zone', icon: 'assets/thunder-front.png', creatures: ['Thunder', 'Storm', 'Inferno'] },
    { id: 'shadow', name: 'Shadow Zone', icon: 'assets/molty-front.png', creatures: ['Molty', 'Thunder', 'Jungle'] }
];

const CREATURES = {
    'Inferno': { name: 'INFERNO', image: 'assets/inferno-front.png', rarity: 'uncommon', catchRate: 45, fleeRate: 25 },
    'Storm': { name: 'STORM', image: 'assets/storm-front.png', rarity: 'rare', catchRate: 35, fleeRate: 30 },
    'Molty': { name: 'MOLTY', image: 'assets/molty-front.png', rarity: 'epic', catchRate: 25, fleeRate: 35 },
    'Thunder': { name: 'THUNDER', image: 'assets/thunder-front.png', rarity: 'rare', catchRate: 30, fleeRate: 30 },
    'Jungle': { name: 'JUNGLE', image: 'assets/jungle-front.png', rarity: 'common', catchRate: 55, fleeRate: 20 }
};

const SafariGame = {
    tickets: 1,
    currentBiome: null,
    actionsLeft: 10,
    capsules: 5,
    bait: 3,
    rocks: 3,
    caughtCreatures: [],
    fledCreatures: 0,
    currentCreature: null,
    creatureAngry: false,
    creatureEating: false,

    init() {
        this.updateTicketDisplay();
        this.populateBiomes();
    },

    updateTicketDisplay() {
        const el = document.getElementById('ticket-count');
        if (el) el.textContent = this.tickets;
    },

    populateBiomes() {
        const grid = document.getElementById('biome-grid');
        if (!grid) return;
        
        grid.innerHTML = BIOMES.map(biome => `
            <div class="biome-card" onclick="SafariGame.selectBiome('${biome.id}')">
                <div class="biome-icon"><img src="${biome.icon}" alt="${biome.name}"></div>
                <div class="biome-name">${biome.name}</div>
                <div class="biome-creatures">${biome.creatures.length} beasts</div>
            </div>
        `).join('');
    },

    selectBiome(biomeId) {
        this.currentBiome = BIOMES.find(b => b.id === biomeId);
        if (!this.currentBiome) return;

        document.getElementById('safari-biome-name').innerHTML = 
            `<img src="${this.currentBiome.icon}" alt="" class="biome-header-icon"> ${this.currentBiome.name}`;
        
        this.showScreen('explore-screen');
        this.addMessage(`You entered the ${this.currentBiome.name}! Look for beasts...`);
    },

    explore() {
        if (this.actionsLeft <= 0) {
            this.endSafari();
            return;
        }

        this.actionsLeft--;
        this.updateActions();

        // 70% chance to find a creature
        if (Math.random() < 0.7) {
            this.encounterCreature();
        } else {
            const messages = [
                "You searched but found nothing...",
                "The area seems empty...",
                "You hear something in the distance...",
                "Just rustling leaves...",
                "A shadow passes by but disappears..."
            ];
            this.addMessage(messages[Math.floor(Math.random() * messages.length)]);
            
            if (this.actionsLeft <= 0) {
                setTimeout(() => this.endSafari(), 1500);
            }
        }
    },

    encounterCreature() {
        // Pick random creature from current biome
        const creatureNames = this.currentBiome.creatures;
        const creatureName = creatureNames[Math.floor(Math.random() * creatureNames.length)];
        this.currentCreature = { ...CREATURES[creatureName] };
        this.creatureAngry = false;
        this.creatureEating = false;

        // Update encounter screen
        document.getElementById('encounter-creature-name').textContent = this.currentCreature.name;
        document.getElementById('encounter-creature-rarity').textContent = this.currentCreature.rarity;
        document.getElementById('encounter-creature-rarity').className = `creature-rarity ${this.currentCreature.rarity}`;
        
        // Use image from assets
        const creatureEl = document.getElementById('encounter-creature');
        creatureEl.innerHTML = `<img src="${this.currentCreature.image}" alt="${this.currentCreature.name}" id="encounter-creature-img">`;
        creatureEl.className = 'encounter-creature';
        
        document.getElementById('creature-status').textContent = '';
        document.getElementById('encounter-log').innerHTML = '';

        this.updateInventoryDisplay();
        this.addEncounterLog(`A wild ${this.currentCreature.name} appeared!`, 'success');
        this.showScreen('encounter-screen');
    },

    throwCapsule() {
        if (this.capsules <= 0 || !this.currentCreature) return;
        
        this.capsules--;
        this.actionsLeft--;
        this.updateInventoryDisplay();
        this.updateActions();

        // Calculate catch chance
        let catchRate = this.currentCreature.catchRate;
        if (this.creatureEating) catchRate += 20;
        if (this.creatureAngry) catchRate -= 15;

        this.addEncounterLog(`You threw a capsule...`, 'warning');

        const creatureEl = document.getElementById('encounter-creature');
        creatureEl.classList.add('shake');
        setTimeout(() => creatureEl.classList.remove('shake'), 300);

        setTimeout(() => {
            if (Math.random() * 100 < catchRate) {
                // Caught!
                this.addEncounterLog(`Gotcha! ${this.currentCreature.name} was caught!`, 'success');
                this.caughtCreatures.push({ ...this.currentCreature });
                creatureEl.classList.add('caught');
                
                setTimeout(() => {
                    if (this.actionsLeft <= 0) {
                        this.endSafari();
                    } else {
                        this.showScreen('explore-screen');
                        this.addMessage(`You caught ${this.currentCreature.name}! Keep exploring...`);
                    }
                }, 800);
            } else {
                // Failed
                this.addEncounterLog(`Oh no! It broke free!`, 'danger');
                this.checkFlee();
            }
        }, 500);
    },

    throwBait() {
        if (this.bait <= 0 || !this.currentCreature) return;
        
        this.bait--;
        this.actionsLeft--;
        this.updateInventoryDisplay();
        this.updateActions();

        this.creatureEating = true;
        this.creatureAngry = false;
        document.getElementById('creature-status').textContent = 'Eating...';
        this.addEncounterLog(`${this.currentCreature.name} is eating the bait! Catch rate UP!`, 'success');
        
        this.checkFlee();
    },

    throwRock() {
        if (this.rocks <= 0 || !this.currentCreature) return;
        
        this.rocks--;
        this.actionsLeft--;
        this.updateInventoryDisplay();
        this.updateActions();

        this.creatureAngry = true;
        this.creatureEating = false;
        
        // Rock makes flee rate lower but catch rate lower too
        this.currentCreature.fleeRate -= 10;
        document.getElementById('creature-status').textContent = 'Angry!';
        this.addEncounterLog(`${this.currentCreature.name} is angry! It won't flee easily but is harder to catch!`, 'warning');
        
        const creatureEl = document.getElementById('encounter-creature');
        creatureEl.classList.add('shake');
        setTimeout(() => creatureEl.classList.remove('shake'), 300);
        
        this.checkFlee();
    },

    runAway() {
        this.addEncounterLog(`You ran away safely!`, 'warning');
        setTimeout(() => {
            if (this.actionsLeft <= 0) {
                this.endSafari();
            } else {
                this.showScreen('explore-screen');
                this.addMessage('You escaped! Keep exploring...');
            }
        }, 500);
    },

    checkFlee() {
        if (!this.currentCreature) return;
        
        let fleeRate = this.currentCreature.fleeRate;
        if (this.creatureAngry) fleeRate -= 10;
        if (this.creatureEating) fleeRate -= 5;

        setTimeout(() => {
            if (Math.random() * 100 < fleeRate) {
                this.addEncounterLog(`${this.currentCreature.name} fled!`, 'danger');
                this.fledCreatures++;
                
                setTimeout(() => {
                    if (this.actionsLeft <= 0) {
                        this.endSafari();
                    } else {
                        this.showScreen('explore-screen');
                        this.addMessage('The beast escaped! Keep looking...');
                    }
                }, 800);
            }
        }, 300);
    },

    updateInventoryDisplay() {
        document.getElementById('capsule-count').textContent = this.capsules;
        document.getElementById('bait-count').textContent = this.bait;
        document.getElementById('rock-count').textContent = this.rocks;
        document.getElementById('inv-capsules').textContent = this.capsules;
        document.getElementById('inv-bait').textContent = this.bait;
        document.getElementById('inv-rocks').textContent = this.rocks;
        document.getElementById('inv-caught').textContent = this.caughtCreatures.length;

        // Disable buttons if out of items
        document.querySelector('.encounter-btn.capsule').disabled = this.capsules <= 0;
        document.querySelector('.encounter-btn.bait').disabled = this.bait <= 0;
        document.querySelector('.encounter-btn.rock').disabled = this.rocks <= 0;
    },

    updateActions() {
        document.getElementById('actions-left').textContent = this.actionsLeft;
    },

    addMessage(msg) {
        document.getElementById('safari-message').textContent = msg;
    },

    addEncounterLog(msg, type = '') {
        const log = document.getElementById('encounter-log');
        const line = document.createElement('div');
        line.className = `log-line ${type}`;
        line.textContent = `> ${msg}`;
        log.appendChild(line);
        log.scrollTop = log.scrollHeight;
    },

    showScreen(screenId) {
        document.querySelectorAll('.safari-screen').forEach(s => s.classList.add('hidden'));
        document.getElementById(screenId).classList.remove('hidden');
    },

    endSafari() {
        // Calculate stats
        const raresCount = this.caughtCreatures.filter(c => 
            ['rare', 'epic', 'legendary'].includes(c.rarity)
        ).length;

        document.getElementById('result-caught').textContent = this.caughtCreatures.length;
        document.getElementById('result-fled').textContent = this.fledCreatures;
        document.getElementById('result-rares').textContent = raresCount;

        // Show caught creatures
        const resultsEl = document.getElementById('results-creatures');
        resultsEl.innerHTML = this.caughtCreatures.map(c => `
            <div class="results-creature">
                <img src="${c.image}" alt="${c.name}">
                <div class="name">${c.name}</div>
            </div>
        `).join('') || '<p style="color: rgba(255,255,255,0.5);">No beasts caught</p>';

        this.showScreen('results-screen');
    },

    playAgain() {
        if (this.tickets <= 0) {
            alert('You need more tickets to play again!');
            return;
        }
        
        this.tickets--;
        this.resetGame();
        this.updateTicketDisplay();
        this.showScreen('biome-select-screen');
    },

    resetGame() {
        this.actionsLeft = 10;
        this.capsules = 5;
        this.bait = 3;
        this.rocks = 3;
        this.caughtCreatures = [];
        this.fledCreatures = 0;
        this.currentCreature = null;
        this.currentBiome = null;
        this.updateInventoryDisplay();
        this.updateActions();
    }
};

function openSafari() {
    if (SafariGame.tickets <= 0) {
        alert('You need tickets to enter!');
        return;
    }
    
    SafariGame.tickets--;
    SafariGame.resetGame();
    SafariGame.updateTicketDisplay();
    SafariGame.populateBiomes();
    SafariGame.showScreen('biome-select-screen');
    
    document.getElementById('safari-modal').classList.add('active');
}

function closeSafari() {
    document.getElementById('safari-modal').classList.remove('active');
    SafariGame.resetGame();
}

function exitSafari() {
    if (confirm('Are you sure you want to exit? Your progress will be lost!')) {
        closeSafari();
    }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    SafariGame.init();
});