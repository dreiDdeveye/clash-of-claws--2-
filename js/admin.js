/* ==================== ADMIN PANEL ==================== */
const AdminPanel = {
    isOpen: false,
    secretCode: '',
    ADMIN_CODE: 'admin',
    
    // Config
    TOKEN_MINT: 'BZz5TeFBaQ4uv5iXFf4S7mX7qzvyFLSbDpjeyzwRpump',
    TREASURY_WALLET: 'Bb7sK2Fzo22KXg83nq9uLRk5pW9eyVdJH32xo3XLd7Bn',
    RPC_URL: 'https://mainnet.helius-rpc.com/?api-key=baf23f95-165a-4136-b897-54b932e51c52',
    
    // Player data storage
    players: [],
    realTransactions: [],
    isLoading: false,
    
    init() {
        // Load saved players from localStorage (for game stats)
        const saved = localStorage.getItem('claws_admin_players');
        if (saved) {
            this.players = JSON.parse(saved);
        }
        
        // Listen for secret code typing
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
    },
    
    handleKeyPress(e) {
        // Only track letter keys
        if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
            this.secretCode += e.key.toLowerCase();
            
            // Keep only last 5 characters
            if (this.secretCode.length > 5) {
                this.secretCode = this.secretCode.slice(-5);
            }
            
            // Check if code matches
            if (this.secretCode === this.ADMIN_CODE) {
                this.openPanel();
                this.secretCode = '';
            }
        }
    },
    
    async openPanel() {
        this.isOpen = true;
        this.render();
        document.getElementById('admin-overlay').classList.add('active');
        
        // Fetch real blockchain data
        await this.fetchRealTransactions();
    },
    
    closePanel() {
        this.isOpen = false;
        document.getElementById('admin-overlay').classList.remove('active');
    },
    
    // Fetch real transactions from blockchain
    async fetchRealTransactions() {
        this.isLoading = true;
        this.renderLoading();
        
        try {
            const connection = new solanaWeb3.Connection(this.RPC_URL, 'confirmed');
            const treasuryPubkey = new solanaWeb3.PublicKey(this.TREASURY_WALLET);
            
            // Get transaction signatures for treasury wallet
            const signatures = await connection.getSignaturesForAddress(treasuryPubkey, {
                limit: 100
            });
            
            console.log(`Found ${signatures.length} transactions`);
            
            // Process each transaction
            const transactions = [];
            const playerMap = new Map();
            
            for (const sig of signatures) {
                try {
                    const tx = await connection.getParsedTransaction(sig.signature, {
                        maxSupportedTransactionVersion: 0
                    });
                    
                    if (!tx || !tx.meta || tx.meta.err) continue;
                    
                    // Look for token transfers
                    const preBalances = tx.meta.preTokenBalances || [];
                    const postBalances = tx.meta.postTokenBalances || [];
                    
                    // Find the sender (who paid)
                    for (const post of postBalances) {
                        if (post.mint === this.TOKEN_MINT && post.owner === this.TREASURY_WALLET) {
                            // Find corresponding pre-balance to calculate amount
                            const pre = preBalances.find(p => p.accountIndex === post.accountIndex);
                            const preAmount = pre ? parseFloat(pre.uiTokenAmount.uiAmount || 0) : 0;
                            const postAmount = parseFloat(post.uiTokenAmount.uiAmount || 0);
                            const amount = postAmount - preAmount;
                            
                            if (amount > 0) {
                                // Find the sender wallet
                                const senderBalance = preBalances.find(p => 
                                    p.mint === this.TOKEN_MINT && 
                                    p.owner !== this.TREASURY_WALLET
                                );
                                
                                if (senderBalance) {
                                    const senderWallet = senderBalance.owner;
                                    const txData = {
                                        signature: sig.signature,
                                        wallet: senderWallet,
                                        amount: amount,
                                        timestamp: sig.blockTime * 1000,
                                        type: amount >= 900 ? 'entry_fee' : 'penalty'
                                    };
                                    
                                    transactions.push(txData);
                                    
                                    // Aggregate player stats
                                    if (!playerMap.has(senderWallet)) {
                                        playerMap.set(senderWallet, {
                                            wallet: senderWallet,
                                            totalPaid: 0,
                                            entryFees: 0,
                                            penalties: 0,
                                            txCount: 0,
                                            firstTx: txData.timestamp,
                                            lastTx: txData.timestamp
                                        });
                                    }
                                    
                                    const player = playerMap.get(senderWallet);
                                    player.totalPaid += amount;
                                    player.txCount++;
                                    if (txData.type === 'entry_fee') {
                                        player.entryFees++;
                                    } else {
                                        player.penalties++;
                                    }
                                    if (txData.timestamp < player.firstTx) player.firstTx = txData.timestamp;
                                    if (txData.timestamp > player.lastTx) player.lastTx = txData.timestamp;
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.log('Error parsing tx:', sig.signature, e);
                }
            }
            
            this.realTransactions = transactions;
            this.realPlayers = Array.from(playerMap.values()).sort((a, b) => b.lastTx - a.lastTx);
            
            console.log(`Processed ${transactions.length} token transfers from ${this.realPlayers.length} unique wallets`);
            
        } catch (error) {
            console.error('Failed to fetch blockchain data:', error);
            this.realTransactions = [];
            this.realPlayers = [];
        }
        
        this.isLoading = false;
        this.render();
    },
    
    // Record a player's game session (local tracking)
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
    
    getStats() {
        const realPlayers = this.realPlayers || [];
        const totalRealPlayers = realPlayers.length;
        const totalEntryFees = realPlayers.reduce((sum, p) => sum + p.entryFees, 0);
        const totalPenalties = realPlayers.reduce((sum, p) => sum + p.penalties, 0);
        const totalTokensReceived = realPlayers.reduce((sum, p) => sum + p.totalPaid, 0);
        
        // Local game stats
        const localPlayers = this.players.length;
        const totalGames = this.players.reduce((sum, p) => sum + p.games, 0);
        const totalWins = this.players.reduce((sum, p) => sum + p.wins, 0);
        const totalLosses = this.players.reduce((sum, p) => sum + p.losses, 0);
        
        return {
            totalRealPlayers,
            totalEntryFees,
            totalPenalties,
            totalTokensReceived,
            localPlayers,
            totalGames,
            totalWins,
            totalLosses
        };
    },
    
    renderLoading() {
        const container = document.getElementById('admin-overlay');
        container.innerHTML = `
            <div class="admin-container">
                <div class="admin-header">
                    <h1 class="admin-title">ADMIN PANEL</h1>
                    <button class="admin-close-btn" onclick="AdminPanel.closePanel()">CLOSE</button>
                </div>
                <div class="admin-loading">
                    <div class="admin-spinner"></div>
                    <p>Fetching blockchain data...</p>
                </div>
            </div>
        `;
    },
    
    render() {
        const stats = this.getStats();
        const container = document.getElementById('admin-overlay');
        
        container.innerHTML = `
            <div class="admin-container">
                <div class="admin-header">
                    <h1 class="admin-title">ADMIN PANEL</h1>
                    <div class="admin-header-actions">
                        <button class="admin-refresh-btn" onclick="AdminPanel.fetchRealTransactions()">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
                            Refresh
                        </button>
                        <button class="admin-close-btn" onclick="AdminPanel.closePanel()">CLOSE</button>
                    </div>
                </div>
                
                <div class="admin-stats">
                    <div class="admin-stat-card highlight">
                        <div class="admin-stat-value">${stats.totalRealPlayers}</div>
                        <div class="admin-stat-label">Real Payers (Blockchain)</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalEntryFees}</div>
                        <div class="admin-stat-label">Entry Fees Paid</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalPenalties}</div>
                        <div class="admin-stat-label">Loss Penalties</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalTokensReceived.toLocaleString()}</div>
                        <div class="admin-stat-label">Total $CLAWS Received</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalGames}</div>
                        <div class="admin-stat-label">Games Played (Local)</div>
                    </div>
                    <div class="admin-stat-card">
                        <div class="admin-stat-value">${stats.totalWins}/${stats.totalLosses}</div>
                        <div class="admin-stat-label">Wins/Losses (Local)</div>
                    </div>
                </div>
                
                <!-- Real Blockchain Players -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                        REAL PAYERS (FROM BLOCKCHAIN)
                    </div>
                    
                    <div class="admin-controls">
                        <input type="text" class="admin-search" placeholder="Search by wallet address..." id="admin-search-real" onkeyup="AdminPanel.filterRealPlayers()">
                        <button class="admin-export-btn" onclick="AdminPanel.exportRealPlayersCSV()">
                            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                            Export CSV
                        </button>
                    </div>
                    
                    <div class="admin-table-wrapper">
                        ${this.renderRealPlayersTable()}
                    </div>
                </div>
                
                <!-- Recent Transactions -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                        RECENT TRANSACTIONS
                    </div>
                    
                    <div class="admin-table-wrapper">
                        ${this.renderTransactionsTable()}
                    </div>
                </div>
                
                <!-- Local Game Stats -->
                <div class="admin-section">
                    <div class="admin-section-title">
                        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        LOCAL GAME STATS (This Browser)
                    </div>
                    
                    <div class="admin-table-wrapper">
                        ${this.renderLocalPlayersTable()}
                    </div>
                </div>
            </div>
        `;
    },
    
    renderRealPlayersTable() {
        const players = this.realPlayers || [];
        
        if (players.length === 0) {
            return `
                <div class="admin-empty">
                    <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                    <p>No blockchain transactions found</p>
                    <p style="font-size: 11px; margin-top: 10px;">Treasury: ${this.TREASURY_WALLET.slice(0,8)}...${this.TREASURY_WALLET.slice(-8)}</p>
                </div>
            `;
        }
        
        return `
            <table class="admin-table" id="real-players-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Wallet Address</th>
                        <th>Entry Fees</th>
                        <th>Penalties</th>
                        <th>Total Paid</th>
                        <th>First Payment</th>
                        <th>Last Payment</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${players.map((p, i) => `
                        <tr data-wallet="${p.wallet}">
                            <td>${i + 1}</td>
                            <td><span class="wallet-address" title="${p.wallet}">${p.wallet.slice(0, 6)}...${p.wallet.slice(-6)}</span></td>
                            <td class="status-paid">${p.entryFees}</td>
                            <td class="negative">${p.penalties}</td>
                            <td class="positive">${p.totalPaid.toLocaleString()} $CLAWS</td>
                            <td>${this.formatDate(p.firstTx)}</td>
                            <td>${this.formatDate(p.lastTx)}</td>
                            <td>
                                <a href="https://solscan.io/account/${p.wallet}" target="_blank" class="admin-link">Solscan</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    renderTransactionsTable() {
        const txs = this.realTransactions || [];
        
        if (txs.length === 0) {
            return `
                <div class="admin-empty">
                    <p>No transactions found</p>
                </div>
            `;
        }
        
        // Show last 20 transactions
        const recentTxs = txs.slice(0, 20);
        
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Signature</th>
                        <th>From Wallet</th>
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Time</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentTxs.map(tx => `
                        <tr>
                            <td><span class="wallet-address">${tx.signature.slice(0, 8)}...${tx.signature.slice(-8)}</span></td>
                            <td><span class="wallet-address">${tx.wallet.slice(0, 4)}...${tx.wallet.slice(-4)}</span></td>
                            <td class="positive">${tx.amount.toLocaleString()} $CLAWS</td>
                            <td><span class="${tx.type === 'entry_fee' ? 'status-paid' : 'status-trial'}">${tx.type === 'entry_fee' ? 'Entry Fee' : 'Penalty'}</span></td>
                            <td>${this.formatDate(tx.timestamp)}</td>
                            <td>
                                <a href="https://solscan.io/tx/${tx.signature}" target="_blank" class="admin-link">View TX</a>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            ${txs.length > 20 ? `<p style="text-align: center; color: rgba(255,255,255,0.4); margin-top: 15px;">Showing 20 of ${txs.length} transactions</p>` : ''}
        `;
    },
    
    renderLocalPlayersTable() {
        if (this.players.length === 0) {
            return `
                <div class="admin-empty">
                    <p>No local game data</p>
                </div>
            `;
        }
        
        const sortedPlayers = [...this.players].sort((a, b) => 
            new Date(b.lastPlayed) - new Date(a.lastPlayed)
        );
        
        return `
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Wallet</th>
                        <th>Status</th>
                        <th>Games</th>
                        <th>W/L</th>
                        <th>Won</th>
                        <th>Lost</th>
                        <th>Net</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedPlayers.map((p, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td><span class="wallet-address">${p.wallet.slice(0, 4)}...${p.wallet.slice(-4)}</span></td>
                            <td><span class="${p.isPaid ? 'status-paid' : 'status-trial'}">${p.isPaid ? 'PAID' : 'TRIAL'}</span></td>
                            <td>${p.games}</td>
                            <td>${p.wins}/${p.losses}</td>
                            <td class="positive">+${p.tokensWon}</td>
                            <td class="negative">-${p.tokensLost}</td>
                            <td class="${p.netTokens >= 0 ? 'positive' : 'negative'}">${p.netTokens >= 0 ? '+' : ''}${p.netTokens}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    },
    
    filterRealPlayers() {
        const search = document.getElementById('admin-search-real').value.toLowerCase();
        const rows = document.querySelectorAll('#real-players-table tbody tr');
        
        rows.forEach(row => {
            const wallet = row.dataset.wallet.toLowerCase();
            row.style.display = wallet.includes(search) ? '' : 'none';
        });
    },
    
    formatDate(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    },
    
    exportRealPlayersCSV() {
        const players = this.realPlayers || [];
        if (players.length === 0) {
            alert('No data to export');
            return;
        }
        
        const headers = ['Wallet', 'Entry Fees', 'Penalties', 'Total Paid', 'First Payment', 'Last Payment'];
        const rows = players.map(p => [
            p.wallet,
            p.entryFees,
            p.penalties,
            p.totalPaid,
            new Date(p.firstTx).toISOString(),
            new Date(p.lastTx).toISOString()
        ]);
        
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `claws_real_players_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    },
    
    // Clear all local data (for testing)
    clearData() {
        if (confirm('Are you sure you want to clear all LOCAL player data?')) {
            this.players = [];
            localStorage.removeItem('claws_admin_players');
            this.render();
        }
    }
};

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    AdminPanel.init();
});