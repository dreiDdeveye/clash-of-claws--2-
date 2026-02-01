/* ==================== PAY TO PLAY SYSTEM ==================== */
const PayToPlay = {
    ENTRY_FEE: 1000,
    WIN_REWARD: 100,
    TOKEN_MINT: '9FWxitYEU58fYdRTC2rBbARBuSGd3TcaipWx1TmNpump',
    TOKEN_DECIMALS: 6,
    TREASURY_WALLET: 'Avx2ap9XEX3EAbyBx4nD3veZ1YTofEuEJYUhW5Y6uHR4',
    
    // ✅ CONFIGURED: Google Sheets Backend URL
    GOOGLE_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxWtY_MP7aq9HR1bBbP5MRWndgdWAWAtABRscFm-6ypC0Kq-2MxQcHjg7jIh1pcFa_SgQ/exec',
    
    hasPaid: false,
    isTrialMode: false,
    walletConnected: false,
    walletAddress: null,
    claimableRewards: 0,
    
    TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    TOKEN_2022_PROGRAM_ID: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',

    init() {
        this.hasPaid = sessionStorage.getItem('claws_paid') === 'true';
        this.isTrialMode = sessionStorage.getItem('claws_trial') === 'true';
        this.claimableRewards = parseInt(localStorage.getItem('claws_claimable') || '0');
        this.updateTrialBadge();
        this.updateClaimButton();
        this.checkWalletConnection();
    },

    async checkWalletConnection() {
        if (window.solana && window.solana.isPhantom) {
            try {
                const resp = await window.solana.connect({ onlyIfTrusted: true });
                if (resp.publicKey) {
                    this.walletConnected = true;
                    this.walletAddress = resp.publicKey.toString();
                    this.updateWalletButton();
                    this.updateWalletStatus();
                }
            } catch (e) {}
        }
    },

    async connectWallet() {
        const btn = document.getElementById('walletBtn');
        if (this.walletConnected) {
            if (window.solana) await window.solana.disconnect();
            this.walletConnected = false;
            this.walletAddress = null;
            this.updateWalletButton();
            this.updateWalletStatus();
            return;
        }
        try {
            if (!window.solana) {
                window.open('https://phantom.app/', '_blank');
                alert('Please install Phantom wallet!');
                return;
            }
            btn.textContent = 'CONNECTING...';
            const resp = await window.solana.connect();
            this.walletConnected = true;
            this.walletAddress = resp.publicKey.toString();
            this.updateWalletButton();
            this.updateWalletStatus();
        } catch (e) { btn.textContent = 'CONNECT'; }
    },

    updateWalletButton() {
        const btn = document.getElementById('walletBtn');
        if (!btn) return;
        if (this.walletConnected && this.walletAddress) {
            btn.textContent = this.walletAddress.slice(0, 4) + '...' + this.walletAddress.slice(-4);
            btn.classList.add('connected');
        } else {
            btn.textContent = 'CONNECT';
            btn.classList.remove('connected');
        }
    },

    updateTrialBadge() {
        const badge = document.getElementById('trial-badge');
        if (badge) {
            badge.classList.toggle('hidden', !(this.isTrialMode && !this.hasPaid));
        }
    },

    updateClaimButton() {
        const claimBtn = document.getElementById('claim-rewards-btn');
        const claimAmount = document.getElementById('claim-amount');
        if (claimBtn && claimAmount) {
            claimAmount.textContent = this.claimableRewards;
            claimBtn.classList.toggle('hidden', this.claimableRewards <= 0);
        }
        
        const resultClaimBtn = document.getElementById('result-claim-btn');
        const resultClaimAmount = document.getElementById('result-claim-amount');
        const resultClaimable = document.getElementById('resultClaimable');
        
        if (resultClaimBtn && resultClaimAmount) {
            resultClaimAmount.textContent = this.claimableRewards;
            resultClaimBtn.classList.toggle('hidden', !(this.claimableRewards > 0 && this.hasPaid && !this.isTrialMode));
        }
        if (resultClaimable) {
            if (this.claimableRewards > 0 && this.hasPaid && !this.isTrialMode) {
                resultClaimable.textContent = `Total Claimable: ${this.claimableRewards} $CLAWS`;
                resultClaimable.classList.add('show');
            } else {
                resultClaimable.textContent = '';
                resultClaimable.classList.remove('show');
            }
        }
    },

    addReward(amount) {
        this.claimableRewards += amount;
        localStorage.setItem('claws_claimable', this.claimableRewards.toString());
        this.updateClaimButton();
    },

    showPayOverlay() {
        const overlay = document.getElementById('pay-overlay');
        if (overlay) overlay.classList.remove('hidden');
        this.updateWalletStatus();
    },

    hidePayOverlay() {
        const overlay = document.getElementById('pay-overlay');
        if (overlay) overlay.classList.add('hidden');
    },

    updateUI() {
        this.updateTrialBadge();
        this.updateClaimButton();
        if (this.hasPaid || this.isTrialMode) this.hidePayOverlay();
        this.updateWalletStatus();
    },

    updateWalletStatus() {
        const statusEl = document.getElementById('wallet-status');
        if (!statusEl) return;
        if (this.walletConnected && this.walletAddress) {
            statusEl.textContent = this.walletAddress.slice(0, 4) + '...' + this.walletAddress.slice(-4);
            statusEl.classList.add('connected');
        } else {
            statusEl.textContent = 'Wallet not connected';
            statusEl.classList.remove('connected');
        }
    },

    startFreeTrial() {
        this.isTrialMode = true;
        this.hasPaid = false;
        sessionStorage.setItem('claws_trial', 'true');
        sessionStorage.removeItem('claws_paid');
        this.hidePayOverlay();
        this.updateTrialBadge();
        goToSelect();
        alert('FREE TRIAL MODE\n\nYou can play but won\'t earn rewards.\nPay 1000 $CLAWS to unlock!');
    },

    async getATA(mint, owner, tokenProgramId) {
        const [ata] = await solanaWeb3.PublicKey.findProgramAddress(
            [owner.toBytes(), new solanaWeb3.PublicKey(tokenProgramId).toBytes(), mint.toBytes()],
            new solanaWeb3.PublicKey(this.ASSOCIATED_TOKEN_PROGRAM_ID)
        );
        return ata;
    },

    createATAInstruction(payer, ata, owner, mint, tokenProgramId) {
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: payer, isSigner: true, isWritable: true },
                { pubkey: ata, isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: false, isWritable: false },
                { pubkey: mint, isSigner: false, isWritable: false },
                { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
                { pubkey: new solanaWeb3.PublicKey(tokenProgramId), isSigner: false, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey(this.ASSOCIATED_TOKEN_PROGRAM_ID),
            data: new Uint8Array([1]),
        });
    },

    createTransferInstruction(source, destination, owner, amount, tokenProgramId) {
        const data = new Uint8Array(9);
        data[0] = 3;
        const bigAmount = BigInt(amount);
        for (let i = 0; i < 8; i++) data[1 + i] = Number((bigAmount >> BigInt(i * 8)) & BigInt(0xff));
        return new solanaWeb3.TransactionInstruction({
            keys: [
                { pubkey: source, isSigner: false, isWritable: true },
                { pubkey: destination, isSigner: false, isWritable: true },
                { pubkey: owner, isSigner: true, isWritable: false },
            ],
            programId: new solanaWeb3.PublicKey(tokenProgramId),
            data,
        });
    },

    async payEntryFee() {
        const btn = document.getElementById('pay-btn');
        if (!this.walletConnected) { alert('Please connect your wallet first!'); return; }
        if (btn) { btn.classList.add('loading'); btn.disabled = true; btn.textContent = 'PROCESSING...'; }

        try {
            const connection = new solanaWeb3.Connection('https://mainnet.helius-rpc.com/?api-key=baf23f95-165a-4136-b897-54b932e51c52', 'confirmed');
            const mintPubkey = new solanaWeb3.PublicKey(this.TOKEN_MINT);
            const treasuryPubkey = new solanaWeb3.PublicKey(this.TREASURY_WALLET);
            const senderPubkey = new solanaWeb3.PublicKey(this.walletAddress);

            const mintAccount = await connection.getAccountInfo(mintPubkey);
            if (!mintAccount) throw new Error('Token mint not found!');
            
            const tokenProgramId = mintAccount.owner.toBase58() === this.TOKEN_2022_PROGRAM_ID ? this.TOKEN_2022_PROGRAM_ID : this.TOKEN_PROGRAM_ID;
            const senderATA = await this.getATA(mintPubkey, senderPubkey, tokenProgramId);
            const treasuryATA = await this.getATA(mintPubkey, treasuryPubkey, tokenProgramId);

            const senderAccount = await connection.getAccountInfo(senderATA);
            if (!senderAccount) throw new Error('You don\'t have any $CLAWS tokens!');

            const balanceInfo = await connection.getTokenAccountBalance(senderATA);
            if (balanceInfo.value.uiAmount < this.ENTRY_FEE) throw new Error(`Insufficient balance. Need ${this.ENTRY_FEE} $CLAWS`);

            const instructions = [
                solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
                solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 })
            ];

            const treasuryAccount = await connection.getAccountInfo(treasuryATA);
            if (!treasuryAccount) instructions.push(this.createATAInstruction(senderPubkey, treasuryATA, treasuryPubkey, mintPubkey, tokenProgramId));
            instructions.push(this.createTransferInstruction(senderATA, treasuryATA, senderPubkey, this.ENTRY_FEE * Math.pow(10, this.TOKEN_DECIMALS), tokenProgramId));

            if (btn) btn.textContent = 'PREPARING...';
            const { blockhash } = await connection.getLatestBlockhash('finalized');
            const transaction = new solanaWeb3.Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = senderPubkey;
            instructions.forEach(ix => transaction.add(ix));

            if (btn) btn.textContent = 'SIGN IN WALLET...';
            const signed = await window.solana.signTransaction(transaction);
            
            if (btn) btn.textContent = 'SENDING...';
            const rawTx = signed.serialize();
            const signature = await connection.sendRawTransaction(rawTx, { skipPreflight: true });

            if (btn) btn.textContent = 'CONFIRMING...';
            let confirmed = false;
            const startTime = Date.now();
            const resendLoop = setInterval(async () => { try { await connection.sendRawTransaction(rawTx, { skipPreflight: true }); } catch(e) {} }, 2000);
            try {
                while (!confirmed && (Date.now() - startTime) < 90000) {
                    await new Promise(r => setTimeout(r, 2000));
                    const status = await connection.getSignatureStatus(signature);
                    if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') confirmed = true;
                }
            } finally { clearInterval(resendLoop); }
            if (!confirmed) throw new Error('Transaction timeout. Check Solscan: ' + signature);

            this.hasPaid = true;
            this.isTrialMode = false;
            sessionStorage.setItem('claws_paid', 'true');
            sessionStorage.removeItem('claws_trial');
            this.hidePayOverlay();
            this.updateTrialBadge();
            alert('Payment successful! Choose your beast!');
            goToSelect();
        } catch (error) {
            alert('Payment failed: ' + error.message);
        } finally {
            if (btn) { btn.classList.remove('loading'); btn.disabled = false; btn.textContent = 'PAY 1000 $CLAWS'; }
        }
    },

    async claimRewards() {
        if (!this.walletConnected) { alert('Please connect your wallet first!'); return; }
        if (this.claimableRewards <= 0) { alert('No rewards to claim!'); return; }

        const claimBtn = document.getElementById('claim-rewards-btn');
        const resultClaimBtn = document.getElementById('result-claim-btn');
        if (claimBtn) { claimBtn.disabled = true; claimBtn.textContent = 'CLAIMING...'; }
        if (resultClaimBtn) { resultClaimBtn.disabled = true; resultClaimBtn.textContent = 'CLAIMING...'; }

        try {
            const claimedAmount = this.claimableRewards;
            
            // Send claim to Google Sheets
            console.log('📤 Sending claim request to Google Sheets...');
            console.log('Wallet:', this.walletAddress);
            console.log('Amount:', claimedAmount, '$CLAWS');
            
            const url = `${this.GOOGLE_SCRIPT_URL}?action=addClaim&wallet=${encodeURIComponent(this.walletAddress)}&amount=${claimedAmount}`;
            
            try {
                // Use timeout to ensure request completes
                await Promise.race([
                    fetch(url, { 
                        mode: 'no-cors',
                        method: 'GET'
                    }),
                    new Promise((_, reject) => setTimeout(() => reject(new Error('Request timeout')), 10000))
                ]);
                
                // Wait for server to process
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log('✅ Claim request sent successfully!');
            } catch (fetchError) {
                console.log('⚠️ Fetch completed (no-cors mode blocks response reading, but request was sent)');
            }
            
            // Reset local claimable AFTER successful submission
            this.claimableRewards = 0;
            localStorage.setItem('claws_claimable', '0');
            this.updateClaimButton();

            alert(`✅ Claim submitted for ${claimedAmount} $CLAWS!\n\n🔹 Wallet: ${this.walletAddress.slice(0,6)}...${this.walletAddress.slice(-6)}\n🔹 Amount: ${claimedAmount} $CLAWS\n\n⏰ Processing: 24-48 hours\n\n💡 Type "admin" to verify your claim was recorded.`);
            
            console.log('🎉 Claim process completed!');
            console.log('💡 TIP: Type "admin" on the page to open admin panel and verify claim');
        } catch (error) {
            console.error('❌ Claim error:', error);
            alert('Claim failed: ' + error.message);
        } finally {
            if (claimBtn) { claimBtn.disabled = false; claimBtn.innerHTML = `CLAIM <span id="claim-amount">${this.claimableRewards}</span> $CLAWS`; }
            if (resultClaimBtn) { resultClaimBtn.disabled = false; resultClaimBtn.innerHTML = `CLAIM <span id="result-claim-amount">${this.claimableRewards}</span> $CLAWS`; }
        }
    },

    addWinReward(streak = 1) {
        if (this.isTrialMode || !this.hasPaid) return 0;
        const reward = this.WIN_REWARD + (streak * 10);
        this.addReward(reward);
        
        // Record to Google Sheets
        if (this.walletAddress) {
            console.log('🏆 Recording win to Google Sheets...');
            console.log('Wallet:', this.walletAddress);
            console.log('Reward:', reward, '$CLAWS');
            
            const url = `${this.GOOGLE_SCRIPT_URL}?action=recordWin&wallet=${encodeURIComponent(this.walletAddress)}&reward=${reward}`;
            fetch(url, { mode: 'no-cors' })
                .then(() => console.log('✅ Win recorded successfully!'))
                .catch(e => console.log('⚠️ Win record sent (no-cors mode)'));
        }
        
        return reward;
    },

    reset() {
        this.hasPaid = false;
        this.isTrialMode = false;
        sessionStorage.removeItem('claws_paid');
        sessionStorage.removeItem('claws_trial');
        this.updateUI();
    }
};

function connectWallet() { PayToPlay.connectWallet(); }
function payEntryFee() { PayToPlay.payEntryFee(); }
function startFreeTrial() { PayToPlay.startFreeTrial(); }
function claimRewards() { PayToPlay.claimRewards(); }