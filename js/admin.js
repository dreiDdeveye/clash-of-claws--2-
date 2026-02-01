/* ==================== ADMIN PANEL ==================== */
const AdminPanel = {
    isOpen: false,
    secretCode: '',
    ADMIN_CODE: 'admin',
    
    // Config
    TOKEN_MINT: '9FWxitYEU58fYdRTC2rBbARBuSGd3TcaipWx1TmNpump',
    TREASURY_WALLET: 'Avx2ap9XEX3EAbyBx4nD3veZ1YTofEuEJYUhW5Y6uHR4',
    RPC_URL: 'https://mainnet.helius-rpc.com/?api-key=baf23f95-165a-4136-b897-54b932e51c52',
    
    // Data storage
    players: [],
    realTransactions: [],
    pendingClaims: [],
    isLoading: false,
    
    init() {
        const saved = localStorage.getItem('claws_admin_players');
        if (saved) this.players = JSON.parse(saved);
        
        const claims = localStorage.getItem('claws_claims');
        if (claims) this.pendingClaims = JSON.parse(claims);
        
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },
    
    handleKeyPress(e) {
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
            this.secretCode += e.key.toLowerCase();
            if (this.secretCode.length > 5) {
                this.secretCode = this.secretCode.slice(-5);
            }
            if (this.secretCode === this.ADMIN_CODE) {
                this.openPanel();
                this.secretCode = '';
            }
        }
    },
    
    async openPanel() {
        this.isOpen = true;
        // Refresh claims from localStorage
        const claims = localStorage.getItem('claws_claims');
        if (claims) this.pendingClaims = JSON.parse(claims);
        this.render();
        document.getElementById('admin-overlay').classList.add('active');
    },
    
    closePanel() {
        this.isOpen = false;
        document.getElementById('admin-overlay').classList.remove('active');
    },
    
    recordPlayer(walletAddress, isPaid, result, tokensWon, tokensLost) {
        const existingIndex = this.players.findIndex(p => p.wallet === walletAddress);
        
        if (existingIndex >= 0) {
            const player = this.players[existingIndex];
            player.games++;
            player.wins += result === 'win' ? 1 : 0;
            player.losses += result === 'lose' ? 1 : 0;
            player.tokensWon += tokensWon || 0;
            player.tokensLost += tokensLost || 0;
            player.netTokens = player.tokensWon - player.tokensLost;
            player.lastPlayed = new Date().toISOString();
            player.isPaid = isPaid || player.isPaid;
        } else {
            this.players.push({
                wallet: walletAddress,
                isPaid: isPaid,
                games: 1,
                wins: result === 'win' ? 1 : 0,
                losses: result === 'lose' ? 1 : 0,
                tokensWon: tokensWon || 0,
                tokensLost: tokensLost || 0,
                netTokens: (tokensWon || 0) - (tokensLost || 0),
                firstPlayed: new Date().toISOString(),
                lastPlayed: new Date().toISOString()
            });
        }
        this.saveData();
    },
    
    saveData() {
        localStorage.setItem('claws_admin_players', JSON.stringify(this.players));
    },
    
    markClaimPaid(index) {
        if (this.pendingClaims[index]) {
            this.pendingClaims[index].status = 'paid';
            this.pendingClaims[index].paidAt = Date.now();
            localStorage.setItem('claws_claims', JSON.stringify(this.pendingClaims));
            this.render();
        }
    },
    
    deleteClaim(index) {
        if (confirm('Delete this claim?')) {
            this.pendingClaims.splice(index, 1);
            localStorage.setItem('claws_claims', JSON.stringify(this.pendingClaims));
            this.render();
        }
    },
    
    clearPaidClaims() {
        if (confirm('Clear all paid claims?')) {
            this.pendingClaims = this.pendingClaims.filter(c => c.status !== 'paid');
            localStorage.setItem('claws_claims', JSON.stringify(this.pendingClaims));
            this.render();
        }
    },
    
    getStats() {
        const pendingClaims = this.pendingClaims.filter(c => c.status === 'pending');
        const paidClaims = this.pendingClaims.filter(c => c.status === 'paid');
        const totalPending = pendingClaims.reduce((sum, c) => sum + c.amount, 0);
        const totalPaid = paidClaims.reduce((sum, c) => sum + c.amount, 0);
        
        return {
            totalPlayers: this.players.length,
            paidPlayers: this.players.filter(p => p.isPaid).length,
            totalGames: this.players.reduce((sum, p) => sum + p.games, 0),
            totalWins: this.players.reduce((sum, p) => sum + p.wins, 0),
            pendingClaimsCount: pendingClaims.length,
            totalPending,
            paidClaimsCount: paidClaims.length,
            totalPaid
        };
    },
    
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        alert('Copied: ' + text);
    },
    
    render() {
        const stats = this.getStats();
        const container = document.getElementById('admin-overlay');
        
        const pendingClaims = this.pendingClaims.filter(c => c.status === 'pending');
        const paidClaims = this.pendingClaims.filter(c => c.status === 'paid');
        
        container.innerHTML = `
            <div class="admin-container">
                <div class="admin-header">
                    <h1 class="admin-title">ADMIN PANEL</h1>
                    <button class="admin-close-btn" onclick="AdminPanel.closePanel()">CLOSE</button>
                </div>
                
                <div class="admin-stats">
                    <div class="admin-stat-card highlight">
                        <div class="admin-stat-value">${stats.pendingClaimsCount}</div>
                        <div class="admin-stat-label">Pending Claims</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalPending.toLocaleString()}</div>
                        <div class="admin-stat-label">$CLAWS to Pay</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.paidClaimsCount}</div>
                        <div class="admin-stat-label">Paid Claims</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalPaid.toLocaleString()}</div>
                        <div class="admin-stat-label">$CLAWS Paid Out</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalPlayers}</div>
                        <div class="admin-stat-label">Total Players</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalGames}</div>
                        <div class="admin-stat-label">Games Played</div>
                    </div>
                </div>
                
                <!-- PENDING CLAIMS SECTION -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        PENDING CLAIMS (${pendingClaims.length})
                    </div>
                    
                    <div class="admin-table-wrapper">
                        ${pendingClaims.length === 0 ? `
                            <div class="admin-empty">
                                <p>No pending claims</p>
                            </div>
                        ` : `
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Wallet</th>
                                        <th>Amount</th>
                                        <th>Requested</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pendingClaims.map((claim, i) => {
                                        const originalIndex = this.pendingClaims.indexOf(claim);
                                        return `
                                        <tr>
                                            <td>${i + 1}</td>
                                            <td>
                                                <span class="wallet-address clickable" onclick="AdminPanel.copyToClipboard('${claim.wallet}')" title="Click to copy">
                                                    ${claim.wallet.slice(0, 6)}...${claim.wallet.slice(-6)}
                                                </span>
                                            </td>
                                            <td class="positive">${claim.amount.toLocaleString()} $CLAWS</td>
                                            <td>${this.formatDate(claim.timestamp)}</td>
                                            <td class="action-buttons">
                                                <button class="btn-paid" onclick="AdminPanel.markClaimPaid(${originalIndex})">MARK PAID</button>
                                                <button class="btn-delete" onclick="AdminPanel.deleteClaim(${originalIndex})">✕</button>
                                            </td>
                                        </tr>
                                    `}).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
                
                <!-- PAID CLAIMS SECTION -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                        PAID CLAIMS (${paidClaims.length})
                        ${paidClaims.length > 0 ? `<button class="clear-paid-btn" onclick="AdminPanel.clearPaidClaims()">Clear All</button>` : ''}
                    </div>
                    
                    <div class="admin-table-wrapper">
                        ${paidClaims.length === 0 ? `
                            <div class="admin-empty">
                                <p>No paid claims yet</p>
                            </div>
                        ` : `
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Wallet</th>
                                        <th>Amount</th>
                                        <th>Requested</th>
                                        <th>Paid At</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${paidClaims.map(claim => `
                                        <tr class="paid-row">
                                            <td><span class="wallet-address">${claim.wallet.slice(0, 6)}...${claim.wallet.slice(-6)}</span></td>
                                            <td class="positive">${claim.amount.toLocaleString()} $CLAWS</td>
                                            <td>${this.formatDate(claim.timestamp)}</td>
                                            <td>${claim.paidAt ? this.formatDate(claim.paidAt) : '-'}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
                
                <!-- PLAYERS SECTION -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        PLAYERS (${this.players.length})
                    </div>
                    
                    <div class="admin-table-wrapper">
                        ${this.players.length === 0 ? `
                            <div class="admin-empty"><p>No players yet</p></div>
                        ` : `
                            <table class="admin-table">
                                <thead>
                                    <tr>
                                        <th>Wallet</th>
                                        <th>Status</th>
                                        <th>Games</th>
                                        <th>W/L</th>
                                        <th>Earned</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${this.players.slice().sort((a,b) => new Date(b.lastPlayed) - new Date(a.lastPlayed)).map(p => `
                                        <tr>
                                            <td><span class="wallet-address">${p.wallet.slice(0, 4)}...${p.wallet.slice(-4)}</span></td>
                                            <td><span class="${p.isPaid ? 'status-paid' : 'status-trial'}">${p.isPaid ? 'PAID' : 'TRIAL'}</span></td>
                                            <td>${p.games}</td>
                                            <td>${p.wins}/${p.losses}</td>
                                            <td class="positive">+${p.tokensWon}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>
        `;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    AdminPanel.init();
});