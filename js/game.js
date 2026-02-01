/* ==================== BATTLE MUSIC ==================== */
const battleMusic = document.getElementById('battleMusic');
let musicEnabled = true;

function playBattleMusic() {
    if (battleMusic && musicEnabled) {
        battleMusic.volume = 0.3;
        battleMusic.play().catch(e => console.log('Music autoplay blocked'));
    }
}

function stopBattleMusic() {
    if (battleMusic) {
        battleMusic.pause();
        battleMusic.currentTime = 0;
    }
}

function toggleMusic() {
    musicEnabled = !musicEnabled;
    const btn = document.getElementById('music-toggle');
    const iconOn = btn.querySelector('.music-on');
    const iconOff = btn.querySelector('.music-off');
    
    if (musicEnabled) {
        iconOn.classList.remove('hidden');
        iconOff.classList.add('hidden');
        btn.classList.add('active');
        if (battleMusic && !battleMusic.paused) {
            battleMusic.volume = 0.3;
        }
    } else {
        iconOn.classList.add('hidden');
        iconOff.classList.remove('hidden');
        btn.classList.remove('active');
        if (battleMusic) {
            battleMusic.volume = 0;
        }
    }
}

/* ==================== WELCOME POPUP ==================== */
function initWelcome() {
    const dontShow = localStorage.getItem('claws_hide_welcome') === 'true';
    const overlay = document.getElementById('welcome-overlay');
    
    if (dontShow && overlay) {
        overlay.classList.add('hidden');
    }
}

function closeWelcome() {
    const overlay = document.getElementById('welcome-overlay');
    const checkbox = document.getElementById('dont-show-welcome');
    
    if (checkbox && checkbox.checked) {
        localStorage.setItem('claws_hide_welcome', 'true');
    }
    
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

/* ==================== GAME STATE ==================== */
let gameState = {
    selectedBeast: null,
    walletConnected: false,
    playerStats: { wins: 0, losses: 0, streak: 0 },
    battle: null
};

/* ==================== INITIALIZATION ==================== */
function init() { 
    populateBeastGrid(); 
    animateCounters();
    PayToPlay.init();
    initWelcome();
}

/* ==================== BEAST GRID ==================== */
function populateBeastGrid() {
    const grid = document.getElementById('beastGrid');
    grid.innerHTML = '';
    Object.values(BEASTS).forEach(beast => {
        const card = document.createElement('div');
        card.className = 'beast-card';
        card.style.setProperty('--type-color', TYPE_COLORS[beast.type]);
        card.style.setProperty('--type-glow', TYPE_COLORS[beast.type] + '40');
        card.onclick = () => selectBeast(beast.id);
        card.innerHTML = `
            <div class="beast-image">
                <div class="glow"></div>
                <img src="${beast.front}" alt="${beast.name}">
            </div>
            <div class="beast-name">${beast.name}</div>
            <span class="type-badge" style="background:${TYPE_COLORS[beast.type]}">${beast.type.toUpperCase()}</span>
            <div class="stats">HP:${beast.hp} ATK:${beast.attack} DEF:${beast.defense} SPD:${beast.speed}</div>
            <div class="role">${beast.role}</div>
        `;
        grid.appendChild(card);
    });
}

function selectBeast(id) {
    gameState.selectedBeast = id;
    document.querySelectorAll('.beast-card').forEach(c => c.classList.remove('selected'));
    const idx = Object.keys(BEASTS).indexOf(id);
    document.querySelectorAll('.beast-card')[idx]?.classList.add('selected');
    const btn = document.getElementById('startBattleBtn');
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = 'START BATTLE';
}

/* ==================== NAVIGATION ==================== */
function showHome() {
    document.getElementById('heroSection').style.display = 'flex';
    document.getElementById('selectScreen').classList.remove('active');
    document.getElementById('battleArena').classList.remove('active');
    document.getElementById('resultOverlay').classList.remove('active');
    stopBattleMusic();
}

function showSelect() {
    // Check if user has paid or is in trial mode
    if (!PayToPlay.hasPaid && !PayToPlay.isTrialMode) {
        PayToPlay.showPayOverlay();
        return;
    }
    goToSelect();
}

function goToSelect() {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('selectScreen').classList.add('active');
    document.getElementById('battleArena').classList.remove('active');
}

function showBattle() {
    document.getElementById('heroSection').style.display = 'none';
    document.getElementById('selectScreen').classList.remove('active');
    document.getElementById('battleArena').classList.add('active');
}

/* ==================== BATTLE INITIALIZATION ==================== */
function startBattle() {
    if (!gameState.selectedBeast) return;
    document.getElementById('loadingScreen').classList.add('active');
    setTimeout(() => { 
        document.getElementById('loadingScreen').classList.remove('active'); 
        initBattle(); 
        showBattle();
        playBattleMusic();
    }, 1000);
}

function initBattle() {
    const p = BEASTS[gameState.selectedBeast];
    const eIds = Object.keys(BEASTS).filter(i => i !== gameState.selectedBeast);
    const e = BEASTS[eIds[Math.floor(Math.random() * eIds.length)]];
    
    gameState.battle = {
        player: p, 
        enemy: e,
        playerHp: p.hp, 
        enemyHp: e.hp,
        playerMaxHp: p.hp, 
        enemyMaxHp: e.hp,
        playerMoves: JSON.parse(JSON.stringify(MOVES[gameState.selectedBeast])),
        turn: p.speed >= e.speed ? 'player' : 'enemy',
        isAnimating: false,
        playerBoosts: { attack: 0, defense: 0 },
        enemyBoosts: { attack: 0, defense: 0 },
        playerStatus: null, 
        enemyStatus: null
    };

    document.getElementById('playerName').textContent = p.name;
    document.getElementById('enemyName').textContent = e.name;
    document.getElementById('playerSprite').src = p.back;
    document.getElementById('enemySprite').src = e.front;

    updateHpBars();
    populateMoves();
    clearLog();
    addLog(`Wild ${e.name} appeared!`);
    addLog(`Go! ${p.name}!`);
    updateTurnBadge();

    if (gameState.battle.turn === 'enemy') {
        addLog(`${e.name} is faster!`);
        setTimeout(enemyTurn, 1500);
    }
}

/* ==================== TURN MANAGEMENT ==================== */
function updateTurnBadge() {
    const badge = document.getElementById('turnBadge');
    badge.textContent = gameState.battle.turn === 'player' ? 'YOUR TURN' : 'ENEMY TURN';
    badge.style.background = gameState.battle.turn === 'player' 
        ? 'linear-gradient(135deg, var(--gold), #ff9500)' 
        : 'linear-gradient(135deg, var(--primary), #ff0040)';
}

/* ==================== MOVES ==================== */
function populateMoves() {
    const grid = document.getElementById('movesGrid');
    grid.innerHTML = '';
    gameState.battle.playerMoves.forEach((m, i) => {
        const btn = document.createElement('button');
        btn.className = 'move-btn';
        btn.onclick = () => useMove(i);
        btn.innerHTML = `
            <div class="move-name">${m.name}</div>
            <div class="move-info">
                <span class="move-type" style="background:${TYPE_COLORS[m.type]}">${m.type.toUpperCase()}</span>
                <span class="move-pp">PP ${m.pp}/${m.maxPp}</span>
            </div>
        `;
        grid.appendChild(btn);
    });
}

function useMove(i) {
    if (gameState.battle.isAnimating || gameState.battle.turn !== 'player') return;
    const m = gameState.battle.playerMoves[i];
    if (m.pp <= 0) return;
    m.pp--;
    updateMovePP();
    gameState.battle.isAnimating = true;
    disableMoves();
    executeMove(gameState.battle.player, gameState.battle.enemy, m, 'player');
}

function updateMovePP() {
    document.querySelectorAll('.move-btn').forEach((btn, i) => {
        const m = gameState.battle.playerMoves[i];
        btn.querySelector('.move-pp').textContent = `PP ${m.pp}/${m.maxPp}`;
        btn.disabled = m.pp <= 0;
    });
}

/* ==================== BATTLE EXECUTION ==================== */
function executeMove(a, d, m, side) {
    const isP = side === 'player';
    const aS = document.getElementById(isP ? 'playerSprite' : 'enemySprite');
    const dS = document.getElementById(isP ? 'enemySprite' : 'playerSprite');

    addLog(`${a.name} used ${m.name}!`);
    aS.classList.add('attacking');

    setTimeout(() => {
        aS.classList.remove('attacking');

        if (Math.random() * 100 > m.accuracy) {
            addLog(`${a.name}'s attack missed!`);
            finishTurn(side);
            return;
        }

        if (m.heal) {
            const h = Math.floor((isP ? gameState.battle.playerMaxHp : gameState.battle.enemyMaxHp) * (m.heal / 100));
            if (isP) gameState.battle.playerHp = Math.min(gameState.battle.playerMaxHp, gameState.battle.playerHp + h);
            else gameState.battle.enemyHp = Math.min(gameState.battle.enemyMaxHp, gameState.battle.enemyHp + h);
            showPopup(aS, '+' + h, true);
            addLog(`${a.name} restored ${h} HP!`, 'heal');
            updateHpBars();
            finishTurn(side);
            return;
        }

        if (m.boost) {
            const b = isP ? gameState.battle.playerBoosts : gameState.battle.enemyBoosts;
            if (m.boost.attack) b.attack += m.boost.attack;
            if (m.boost.defense) b.defense += m.boost.defense;
            addLog(`${a.name}'s stats rose!`, 'status');
            finishTurn(side);
            return;
        }

        const dmg = calcDamage(a, d, m, isP);
        if (isP) gameState.battle.enemyHp = Math.max(0, gameState.battle.enemyHp - dmg.amount);
        else gameState.battle.playerHp = Math.max(0, gameState.battle.playerHp - dmg.amount);

        dS.classList.add('hit');
        showPopup(dS, dmg.amount, false, dmg.critical);

        setTimeout(() => dS.classList.remove('hit'), 300);

        if (dmg.effectiveness > 1) addLog("It's super effective!", 'super-effective');
        else if (dmg.effectiveness < 1 && dmg.effectiveness > 0) addLog("It's not very effective...");
        if (dmg.critical) addLog('Critical hit!', 'damage');

        if (m.effect && m.effectChance && Math.random() * 100 < m.effectChance) {
            if (isP) gameState.battle.enemyStatus = m.effect;
            else gameState.battle.playerStatus = m.effect;
            addLog(`${d.name} was ${m.effect}ed!`, 'status');
        }

        if (m.recoil) {
            const r = Math.floor(dmg.amount * (m.recoil / 100));
            if (isP) gameState.battle.playerHp = Math.max(0, gameState.battle.playerHp - r);
            else gameState.battle.enemyHp = Math.max(0, gameState.battle.enemyHp - r);
            addLog(`${a.name} was hurt by recoil!`, 'damage');
        }

        updateHpBars();

        setTimeout(() => {
            if (gameState.battle.enemyHp <= 0) { victory(); return; }
            if (gameState.battle.playerHp <= 0) { defeat(); return; }
            finishTurn(side);
        }, 500);
    }, 500);
}

/* ==================== DAMAGE CALCULATION ==================== */
function calcDamage(a, d, m, isP) {
    const ab = isP ? gameState.battle.playerBoosts.attack : gameState.battle.enemyBoosts.attack;
    const db = isP ? gameState.battle.enemyBoosts.defense : gameState.battle.playerBoosts.defense;
    let dmg = Math.floor((((2 * 50 / 5 + 2) * m.power * (a.attack * (1 + ab * 0.5)) / (d.defense * (1 + db * 0.5))) / 50) + 2);
    const eff = TYPE_CHART[m.type]?.[d.type] || 1;
    dmg = Math.floor(dmg * eff);
    if (m.type === a.type) dmg = Math.floor(dmg * 1.5);
    let crit = false;
    if (Math.random() * 100 < (m.highCrit ? 25 : 6.25)) { dmg = Math.floor(dmg * 1.5); crit = true; }
    
    // Apply enemy damage bonus (hard mode)
    if (!isP && gameState.battle.enemyDamageBonus) {
        dmg = Math.floor(dmg * gameState.battle.enemyDamageBonus);
    }
    
    return { amount: Math.max(1, Math.floor(dmg * (0.85 + Math.random() * 0.15))), effectiveness: eff, critical: crit };
}

/* ==================== TURN FINISH ==================== */
function finishTurn(side) {
    gameState.battle.isAnimating = false;
    if (side === 'player') {
        gameState.battle.turn = 'enemy';
        updateTurnBadge();
        setTimeout(enemyTurn, 1000);
    } else {
        gameState.battle.turn = 'player';
        updateTurnBadge();
        enableMoves();
    }
}

/* ==================== ENEMY AI - HARD MODE ==================== */
function enemyTurn() {
    if (gameState.battle.enemyHp <= 0 || gameState.battle.playerHp <= 0) return;
    if (gameState.battle.enemyStatus === 'paralysis' && Math.random() < 0.25) {
        addLog(`${gameState.battle.enemy.name} is paralyzed!`, 'status');
        finishTurn('enemy');
        return;
    }
    gameState.battle.isAnimating = true;
    
    const enemy = gameState.battle.enemy;
    const player = gameState.battle.player;
    const allMoves = MOVES[enemy.id].filter(x => x.power > 0 || x.heal || x.boost);
    
    // Calculate player HP percentage
    const playerHpPercent = gameState.battle.playerHp / gameState.battle.playerMaxHp;
    const enemyHpPercent = gameState.battle.enemyHp / gameState.battle.enemyMaxHp;
    
    let selectedMove;
    
    // HARD AI LOGIC:
    // 1. If player HP is very low (<25%), go for highest damage move
    if (playerHpPercent < 0.25) {
        const damageMoves = allMoves.filter(m => m.power > 0);
        selectedMove = damageMoves.reduce((best, m) => m.power > best.power ? m : best, damageMoves[0]);
        addLog(`${enemy.name} senses weakness!`, 'status');
    }
    // 2. If enemy HP is low, try to heal if possible
    else if (enemyHpPercent < 0.35) {
        const healMove = allMoves.find(m => m.heal);
        if (healMove && Math.random() < 0.75) {
            selectedMove = healMove;
        } else {
            // Boost defense or go aggressive
            const boostMove = allMoves.find(m => m.boost && m.boost.defense);
            selectedMove = boostMove && Math.random() < 0.4 ? boostMove : allMoves[Math.floor(Math.random() * allMoves.length)];
        }
    }
    // 3. Look for super effective moves
    else {
        const superEffectiveMoves = allMoves.filter(m => {
            if (!m.power) return false;
            const effectiveness = TYPE_CHART[m.type]?.[player.type] || 1;
            return effectiveness > 1;
        });
        
        if (superEffectiveMoves.length > 0 && Math.random() < 0.85) {
            // 85% chance to use super effective move
            selectedMove = superEffectiveMoves[Math.floor(Math.random() * superEffectiveMoves.length)];
        } else {
            // Early game: boost stats
            const boostMove = allMoves.find(m => m.boost && m.boost.attack);
            const enemyBoost = gameState.battle.enemyBoosts.attack;
            
            if (boostMove && enemyBoost < 2 && Math.random() < 0.5) {
                selectedMove = boostMove;
            } else {
                // Pick highest power move 70% of the time
                if (Math.random() < 0.7) {
                    const damageMoves = allMoves.filter(m => m.power > 0);
                    selectedMove = damageMoves.reduce((best, m) => m.power > best.power ? m : best, damageMoves[0]);
                } else {
                    selectedMove = allMoves[Math.floor(Math.random() * allMoves.length)];
                }
            }
        }
    }
    
    // Enemy gets +15% damage bonus (hard mode)
    gameState.battle.enemyDamageBonus = 1.15;
    
    executeMove(enemy, player, selectedMove, 'enemy');
}

/* ==================== HP BARS ==================== */
function updateHpBars() {
    const pp = (gameState.battle.playerHp / gameState.battle.playerMaxHp) * 100;
    const ep = (gameState.battle.enemyHp / gameState.battle.enemyMaxHp) * 100;
    document.getElementById('playerHpBar').style.width = pp + '%';
    document.getElementById('enemyHpBar').style.width = ep + '%';
    document.getElementById('playerHpBar').className = 'hp-bar-inner ' + (pp > 50 ? 'high' : pp > 25 ? 'medium' : 'low');
    document.getElementById('enemyHpBar').className = 'hp-bar-inner ' + (ep > 50 ? 'high' : ep > 25 ? 'medium' : 'low');
    document.getElementById('playerHpText').textContent = `${gameState.battle.playerHp}/${gameState.battle.playerMaxHp}`;
}

/* ==================== DAMAGE POPUP ==================== */
function showPopup(el, amt, heal = false, crit = false) {
    const p = document.createElement('div');
    p.className = 'damage-popup' + (crit ? ' critical' : '') + (heal ? ' heal' : '');
    p.textContent = heal ? '+' + amt : '-' + amt;
    const r = el.getBoundingClientRect();
    p.style.left = (r.left + r.width / 2 - 30) + 'px';
    p.style.top = (r.top - 20) + 'px';
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 1000);
}

/* ==================== MOVE BUTTONS ==================== */
function disableMoves() { 
    document.querySelectorAll('.move-btn').forEach(b => b.disabled = true); 
}

function enableMoves() { 
    document.querySelectorAll('.move-btn').forEach((b, i) => b.disabled = gameState.battle.playerMoves[i].pp <= 0); 
}

/* ==================== BATTLE LOG ==================== */
function addLog(t, type = '') { 
    const l = document.getElementById('battleLog'); 
    const e = document.createElement('div'); 
    e.className = 'log-entry' + (type ? ' ' + type : ''); 
    e.textContent = '> ' + t; 
    l.appendChild(e); 
    l.scrollTop = l.scrollHeight; 
}

function clearLog() { 
    document.getElementById('battleLog').innerHTML = ''; 
}

/* ==================== VICTORY / DEFEAT ==================== */
async function victory() {
    gameState.playerStats.streak++;
    
    addLog(`${gameState.battle.enemy.name} fainted!`, 'super-effective');
    stopBattleMusic();
    
    // Add reward to claimable (if paid mode)
    const reward = PayToPlay.addWinReward(gameState.playerStats.streak);
    
    // Record player data for admin panel
    if (PayToPlay.walletAddress) {
        AdminPanel.recordPlayer(
            PayToPlay.walletAddress,
            PayToPlay.hasPaid,
            'win',
            reward,
            0
        );
    }
    
    setTimeout(() => {
        document.getElementById('resultTitle').textContent = 'VICTORY!';
        document.getElementById('resultTitle').className = 'result-title victory';
        
        if (PayToPlay.isTrialMode || !PayToPlay.hasPaid) {
            document.getElementById('resultReward').textContent = 'TRIAL MODE - No Rewards';
        } else {
            document.getElementById('resultReward').textContent = `+${reward} $CLAWS Added!`;
        }
        
        // Update claim button visibility
        PayToPlay.updateClaimButton();
        
        document.getElementById('resultOverlay').classList.add('active');
        document.getElementById('currentStreak').textContent = gameState.playerStats.streak;
    }, 1000);
}

async function defeat() {
    gameState.playerStats.streak = 0;
    
    addLog(`${gameState.battle.player.name} fainted!`, 'damage');
    stopBattleMusic();
    
    // Record player data for admin panel
    if (PayToPlay.walletAddress) {
        AdminPanel.recordPlayer(
            PayToPlay.walletAddress,
            PayToPlay.hasPaid,
            'lose',
            0,
            0
        );
    }
    
    setTimeout(() => {
        document.getElementById('resultTitle').textContent = 'DEFEAT';
        document.getElementById('resultTitle').className = 'result-title defeat';
        
        if (PayToPlay.isTrialMode || !PayToPlay.hasPaid) {
            document.getElementById('resultReward').textContent = 'TRIAL MODE - No Penalty';
        } else {
            document.getElementById('resultReward').textContent = 'Better luck next time!';
        }
        
        // Update claim button visibility (in case they have rewards to claim)
        PayToPlay.updateClaimButton();
        
        document.getElementById('resultOverlay').classList.add('active');
        document.getElementById('currentStreak').textContent = 0;
    }, 1500);
}

function playAgain() { 
    document.getElementById('resultOverlay').classList.remove('active'); 
    showSelect(); 
}

/* ==================== COUNTER ANIMATION ==================== */
function animateCounters() {
    const data = [[125847, 'totalBattles'], [4832, 'totalPlayers'], [2450000, 'totalPrize']];
    data.forEach(([end, id]) => {
        const el = document.getElementById(id);
        const dur = 2000, st = performance.now();
        (function upd(t) {
            const p = Math.min((t - st) / dur, 1);
            el.textContent = Math.floor(end * (1 - Math.pow(1 - p, 3))).toLocaleString();
            if (p < 1) requestAnimationFrame(upd);
        })(st);
    });
}

/* ==================== COPY CA FUNCTION ==================== */
function copyCA() {
    const caAddress = document.getElementById('ca-address').textContent;
    const btn = document.getElementById('ca-copy-btn');
    
    navigator.clipboard.writeText(caAddress).then(() => {
        btn.classList.add('copied');
        
        setTimeout(() => {
            btn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = caAddress;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        btn.classList.add('copied');
        setTimeout(() => {
            btn.classList.remove('copied');
        }, 2000);
    });
}

/* ==================== INIT ON LOAD ==================== */
document.addEventListener('DOMContentLoaded', init);