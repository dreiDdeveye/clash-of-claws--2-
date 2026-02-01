/* ==================== GAME DATA ==================== */
const BEASTS = {
    inferno: { 
        id: 'inferno', 
        name: 'INFERNO', 
        front: 'assets/inferno-front.png', 
        back: 'assets/inferno-back.png', 
        hp: 105, 
        attack: 45, 
        defense: 30, 
        speed: 42, 
        type: 'fire', 
        role: 'STRIKER' 
    },
    storm: { 
        id: 'storm', 
        name: 'STORM', 
        front: 'assets/storm-front.png', 
        back: 'assets/storm-back.png', 
        hp: 110, 
        attack: 50, 
        defense: 35, 
        speed: 38, 
        type: 'water', 
        role: 'BRUISER' 
    },
    molty: { 
        id: 'molty', 
        name: 'MOLTY', 
        front: 'assets/molty-front.png', 
        back: 'assets/molty-back.png', 
        hp: 85, 
        attack: 52, 
        defense: 25, 
        speed: 55, 
        type: 'dark', 
        role: 'ASSASSIN' 
    },
    thunder: { 
        id: 'thunder', 
        name: 'THUNDER', 
        front: 'assets/thunder-front.png', 
        back: 'assets/thunder-back.png', 
        hp: 95, 
        attack: 48, 
        defense: 28, 
        speed: 50, 
        type: 'electric', 
        role: 'SPEEDSTER' 
    },
    jungle: { 
        id: 'jungle', 
        name: 'JUNGLE', 
        front: 'assets/jungle-front.png', 
        back: 'assets/jungle-back.png', 
        hp: 92, 
        attack: 50, 
        defense: 26, 
        speed: 58, 
        type: 'grass', 
        role: 'CRIT MASTER' 
    }
};

/* ==================== FINAL BOSSES ==================== */
const BOSS_LIST = [
    { id: 'catana', name: '⚔️ CATANA ⚔️', image: 'assets/bosses/catana.png', type: 'dark' },
    { id: 'copperinu', name: '🐕 COPPER INU 🐕', image: 'assets/bosses/copperinu.png', type: 'fire' },
    { id: 'cow', name: '🐄 MAD COW 🐄', image: 'assets/bosses/cow.png', type: 'grass' },
    { id: 'dicklet', name: '💀 DICKLET 💀', image: 'assets/bosses/dicklet.png', type: 'water' },
    { id: 'moodeng', name: '🦛 MOO DENG 🦛', image: 'assets/bosses/moodeng.png', type: 'water' },
    { id: 'penguin', name: '🐧 PENGUIN BOSS 🐧', image: 'assets/bosses/penguin.png', type: 'water' },
    { id: 'pepe', name: '🐸 PEPE LORD 🐸', image: 'assets/bosses/pepe.png', type: 'grass' },
    { id: 'pnut', name: '🥜 PNUT DESTROYER 🥜', image: 'assets/bosses/pnut.png', type: 'grass' },
    { id: 'pweasing', name: '😈 PWEASING 😈', image: 'assets/bosses/pweasing.png', type: 'dark' },
    { id: 'smokingchicken', name: '🐔 SMOKING CHICKEN 🐔', image: 'assets/bosses/smokingchicken.png', type: 'fire' },
    { id: 'whale', name: '🐋 WHALE KING 🐋', image: 'assets/bosses/whale.png', type: 'water' }
];

// Function to get a random boss with boosted stats
function getRandomBoss() {
    const boss = BOSS_LIST[Math.floor(Math.random() * BOSS_LIST.length)];
    return {
        id: boss.id,
        name: boss.name,
        front: boss.image,
        back: boss.image,
        hp: 300,           // MASSIVE HP
        attack: 80,        // Very high attack
        defense: 55,       // Tanky
        speed: 65,         // Fast
        type: boss.type,
        role: 'FINAL BOSS',
        isBoss: true,
        damageBonus: 1.6,  // 60% extra damage
        rewardMultiplier: 10  // 10x rewards for defeating
    };
}

const BOSS_MOVES = [
    { name: 'OMEGA STRIKE', type: 'dark', power: 130, accuracy: 90, pp: 10, maxPp: 10, effect: 'paralysis', effectChance: 30 },
    { name: 'CHAOS BLAST', type: 'fire', power: 120, accuracy: 85, pp: 10, maxPp: 10, effect: 'burn', effectChance: 40 },
    { name: 'VOID CRUSH', type: 'dark', power: 100, accuracy: 100, pp: 15, maxPp: 15, highCrit: true },
    { name: 'TSUNAMI RAGE', type: 'water', power: 115, accuracy: 90, pp: 10, maxPp: 10 },
    { name: 'NATURE WRATH', type: 'grass', power: 110, accuracy: 95, pp: 10, maxPp: 10 },
    { name: 'DARK RECOVERY', type: 'dark', power: 0, accuracy: 100, pp: 5, maxPp: 5, heal: 35 },
    { name: 'APOCALYPSE', type: 'dark', power: 160, accuracy: 65, pp: 3, maxPp: 3 }
];

// Boss appears after this many wins in a row
const BOSS_STREAK_TRIGGER = 3;

const MOVES = {
    inferno: [
        { name: 'FLAME ROAR', type: 'fire', power: 90, accuracy: 100, pp: 15, maxPp: 15, effect: 'burn', effectChance: 20 },
        { name: 'INFERNO CLAW', type: 'fire', power: 75, accuracy: 100, pp: 20, maxPp: 20, highCrit: true },
        { name: 'FIRE BLAST', type: 'fire', power: 110, accuracy: 85, pp: 5, maxPp: 5 },
        { name: 'ROAR', type: 'fire', power: 0, accuracy: 100, pp: 20, maxPp: 20, boost: { attack: 2 } }
    ],
    storm: [
        { name: 'HYDRO BLAST', type: 'water', power: 95, accuracy: 100, pp: 10, maxPp: 10 },
        { name: 'AQUA TAIL', type: 'water', power: 80, accuracy: 90, pp: 15, maxPp: 15 },
        { name: 'TIDAL WAVE', type: 'water', power: 110, accuracy: 80, pp: 5, maxPp: 5 },
        { name: 'RAIN DANCE', type: 'water', power: 0, accuracy: 100, pp: 10, maxPp: 10, heal: 30 }
    ],
    molty: [
        { name: 'SHADOW BITE', type: 'dark', power: 80, accuracy: 100, pp: 15, maxPp: 15, highCrit: true },
        { name: 'NIGHT SLASH', type: 'dark', power: 70, accuracy: 100, pp: 20, maxPp: 20, highCrit: true },
        { name: 'DARK PULSE', type: 'dark', power: 95, accuracy: 100, pp: 10, maxPp: 10 },
        { name: 'SUCKER PUNCH', type: 'dark', power: 70, accuracy: 100, pp: 5, maxPp: 5, priority: true }
    ],
    thunder: [
        { name: 'THUNDER CLAW', type: 'electric', power: 85, accuracy: 100, pp: 15, maxPp: 15, effect: 'paralysis', effectChance: 20 },
        { name: 'VOLT TACKLE', type: 'electric', power: 120, accuracy: 100, pp: 5, maxPp: 5, recoil: 33 },
        { name: 'THUNDER WAVE', type: 'electric', power: 0, accuracy: 90, pp: 20, maxPp: 20, effect: 'paralysis', effectChance: 100 },
        { name: 'WILD CHARGE', type: 'electric', power: 90, accuracy: 100, pp: 15, maxPp: 15, recoil: 25 }
    ],
    jungle: [
        { name: 'LEAF BLADE', type: 'grass', power: 90, accuracy: 100, pp: 15, maxPp: 15, highCrit: true },
        { name: 'RAZOR LEAF', type: 'grass', power: 75, accuracy: 95, pp: 20, maxPp: 20, highCrit: true },
        { name: 'SOLAR BEAM', type: 'grass', power: 120, accuracy: 100, pp: 5, maxPp: 5 },
        { name: 'SYNTHESIS', type: 'grass', power: 0, accuracy: 100, pp: 10, maxPp: 10, heal: 35 }
    ]
};

const TYPE_CHART = {
    fire: { fire: 0.5, water: 0.5, grass: 2, electric: 1, dark: 1 },
    water: { fire: 2, water: 0.5, grass: 0.5, electric: 0.5, dark: 1 },
    grass: { fire: 0.5, water: 2, grass: 0.5, electric: 1, dark: 1 },
    electric: { fire: 1, water: 2, grass: 0.5, electric: 0.5, dark: 1 },
    dark: { fire: 1, water: 1, grass: 1, electric: 1, dark: 0.5 }
};

const TYPE_COLORS = { 
    fire: '#ff6b35', 
    water: '#00d4ff', 
    grass: '#00ff88', 
    electric: '#ffea00', 
    dark: '#8b5cf6' 
};