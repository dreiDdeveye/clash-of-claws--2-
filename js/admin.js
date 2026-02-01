/* ==================== ADMIN PANEL ==================== */
const AdminPanel = {
    isOpen: false,
    secretCode: '',
    ADMIN_CODE: 'admin',
    
    // ✅ CONFIGURED: Google Sheets Backend URL
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxWtY_MP7aq9HR1bBbP5MRWndgdWAWAtABRscFm-6ypC0Kq-2MxQcHjg7jIh1pcFa_SgQ/exec',
    
    players: [],
    stats: {},
    isLoading: false,
    
    init() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        console.log('🔐 Admin Panel initialized. Type "admin" to access.');
    },
    
    handleKeyPress(e) {
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
            this.secretCode += e.key.toLowerCase();
            if (this.secretCode.length > 5) this.secretCode = this.secretCode.slice(-5);
            if (this.secretCode === this.ADMIN_CODE) {
                this.openPanel();
                this.secretCode = '';
            }
        }
    },
    
    async openPanel() {
        console.log('🔓 Opening Admin Panel...');
        this.isOpen = true;
        this.renderLoading();
        document.getElementById('admin-overlay').classList.add('active');
        await this.fetchData();
    },
    
    closePanel() {
        console.log('🔒 Closing Admin Panel');
        this.isOpen = false;
        document.getElementById('admin-overlay').classList.remove('active');
    },
    
    async fetchData() {
        this.isLoading = true;
        console.log('📊 Fetching data from Google Sheets...');
        
        try {
            // Fetch player data
            const dataUrl = `${this.GOOGLE_SCRIPT_URL}?action=getData`;
            console.log('🔗 Fetching from:', dataUrl);
            
            const res = await fetch(dataUrl);
            const data = await res.json();
            
            if (data.success) {
                this.players = data.players;
                console.log('✅ Loaded', this.players.length, 'players');
            } else {
                console.error('❌ Failed to load players:', data.error);
            }
            
            // Fetch stats
            const statsUrl = `${this.GOOGLE_SCRIPT_URL}?action=getStats`;
            const statsRes = await fetch(statsUrl);
            const statsData = await statsRes.json();
            
            if (statsData.success) {
                this.stats = statsData.stats;
                console.log('✅ Stats loaded:', this.stats);
            } else {
                console.error('❌ Failed to load stats:', statsData.error);
            }
        } catch (e) {
            console.error('❌ Fetch failed:', e);
            alert('Failed to load data from Google Sheets. Check console for details.');
        }
        
        this.isLoading = false;
        this.render();
    },
    
    async markPaid(row) {
        console.log('💰 Marking row', row, 'as paid...');
        
        try {
            const url = `${this.GOOGLE_SCRIPT_URL}?action=markPaid&row=${row}`;
            await fetch(url);
            console.log('✅ Marked as paid successfully');
            
            // Refresh data
            await this.fetchData();
        } catch (e) {
            console.error('❌ Mark paid failed:', e);
            alert('Failed to mark as paid. Check console for details.');
        }
    },
    
    copyToClipboard(text) {
        navigator.clipboard.writeText(text);
        console.log('📋 Copied to clipboard:', text);
        
        // Visual feedback
        const Toast = document.createElement('div');
        Toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#00ff88;color:#000;padding:15px 20px;border-radius:8px;font-weight:bold;z-index:99999;animation:slideIn 0.3s;';
        Toast.textContent = '✅ Copied: ' + text.slice(0, 10) + '...';
        document.body.appendChild(Toast);
        setTimeout(() => Toast.remove(), 2000);
    },
    
    renderLoading() {
        document.getElementById('admin-overlay').innerHTML = `
            <div class="admin-container">
                <div class="admin-header">
                    <h1 class="admin-title">ADMIN PANEL</h1>
                    <button class="admin-close-btn" onclick="AdminPanel.closePanel()">CLOSE</button>
                </div>
                <div class="admin-loading">
                    <div class="admin-spinner"></div>
                    <p>Loading from Google Sheets...</p>
                </div>
            </div>
        `;
    },
    
    render() {
        console.log('🎨 Rendering admin panel...');
        
        const stats = this.stats;
        const pendingClaims = this.players.filter(p => String(p.paid).startsWith('Pending'));
        const paidPlayers = this.players.filter(p => p.paid === 'Yes');
        
        console.log('📊 Pending claims:', pendingClaims.length);
        console.log('💸 Paid players:', paidPlayers.length);
        
        document.getElementById('admin-overlay').innerHTML = `
            <div class="admin-container">
                <div class="admin-header">
                    <h1 class="admin-title">ADMIN PANEL</h1>
                    <div class="admin-header-actions">
                        <button class="admin-refresh-btn" onclick="AdminPanel.fetchData()">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                            Refresh
                        </button>
                        <button class="admin-close-btn" onclick="AdminPanel.closePanel()">CLOSE</button>
                    </div>
                </div>
                
                <div class="admin-stats">
                    <div class="admin-stat-card highlight">
                        <div class="admin-stat-value">${pendingClaims.length}</div>
                        <div class="admin-stat-label">Pending Claims</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${(stats.totalClaimable || 0).toLocaleString()}</div>
                        <div class="admin-stat-label">$CLAWS Claimable</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${paidPlayers.length}</div>
                        <div class="admin-stat-label">Paid Out</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${(stats.totalEarned || 0).toLocaleString()}</div>
                        <div class="admin-stat-label">Total Earned</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalPlayers || 0}</div>
                        <div class="admin-stat-label">Total Players</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalWins || 0}</div>
                        <div class="admin-stat-label">Total Wins</div>
                    </div>
                </div>
                
                <!-- PENDING CLAIMS -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        PENDING CLAIMS (${pendingClaims.length})
                    </div>
                    <div class="admin-table-wrapper">
                        ${pendingClaims.length === 0 ? `<div class="admin-empty"><p>No pending claims</p></div>` : `
                            <table class="admin-table">
                                <thead><tr><th>#</th><th>Wallet</th><th>Amount</th><th>Total Earned</th><th>Actions</th></tr></thead>
                                <tbody>
                                    ${pendingClaims.map((p, i) => `
                                        <tr>
                                            <td>${i + 1}</td>
                                            <td><span class="wallet-address clickable" onclick="AdminPanel.copyToClipboard('${p.wallet}')">${p.wallet.slice(0, 6)}...${p.wallet.slice(-6)}</span></td>
                                            <td class="positive">${String(p.paid).replace('Pending: ', '')} $CLAWS</td>
                                            <td>${p.totalEarned.toLocaleString()}</td>
                                            <td class="action-buttons"><button class="btn-paid" onclick="AdminPanel.markPaid(${p.row})">MARK PAID</button></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
                
                <!-- ALL PLAYERS -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        ALL PLAYERS (${this.players.length})
                    </div>
                    <div class="admin-table-wrapper">
                        ${this.players.length === 0 ? `<div class="admin-empty"><p>No players yet</p></div>` : `
                            <table class="admin-table">
                                <thead><tr><th>Wallet</th><th>Wins</th><th>Claimable</th><th>Total Earned</th><th>Last Played</th><th>Status</th></tr></thead>
                                <tbody>
                                    ${this.players.map(p => `
                                        <tr>
                                            <td><span class="wallet-address clickable" onclick="AdminPanel.copyToClipboard('${p.wallet}')">${p.wallet.slice(0, 6)}...${p.wallet.slice(-6)}</span></td>
                                            <td>${p.wins}</td>
                                            <td class="positive">${p.claimable}</td>
                                            <td>${p.totalEarned.toLocaleString()}</td>
                                            <td>${p.lastPlayed}</td>
                                            <td><span class="${p.paid === 'Yes' ? 'status-paid' : String(p.paid).startsWith('Pending') ? 'status-pending' : 'status-trial'}">${p.paid}</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                </div>
            </div>
        `;
        
        console.log('✅ Admin panel rendered successfully');
    },
    
    recordPlayer(wallet, isPaid, result, tokensWon) {
        if (result === 'win' && tokensWon > 0) {
            this.recordWinToSheet(wallet, tokensWon);
        }
    },
    
    async recordWinToSheet(wallet, reward) {
        try {
            const url = `${this.GOOGLE_SCRIPT_URL}?action=recordWin&wallet=${encodeURIComponent(wallet)}&reward=${reward}`;
            await fetch(url, { mode: 'no-cors' });
            console.log('✅ Win recorded for wallet:', wallet.slice(0, 6) + '...');
        } catch (e) {
            console.log('⚠️ Record win sent (no-cors mode)');
        }
    }
};

document.addEventListener('DOMContentLoaded', () => AdminPanel.init());