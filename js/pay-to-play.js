/* ==================== PAY TO PLAY SYSTEM ==================== */
const PayToPlay = {
    ENTRY_FEE: 1000,
    WIN_REWARD: 100,
    LOSE_PENALTY: 50,
    TOKEN_MINT: '9FWxitYEU58fYdRTC2rBbARBuSGd3TcaipWx1TmNpump',
    TOKEN_DECIMALS: 6,
    TREASURY_WALLET: 'Avx2ap9XEX3EAbyBx4nD3veZ1YTofEuEJYUhW5Y6uHR4',
    hasPaid: false,
    isTrialMode: false,
    walletConnected: false,
    walletAddress: null,
    pendingReward: 0,
    
    TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    TOKEN_2022_PROGRAM_ID: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',

    init() {
        this.hasPaid = sessionStorage.getItem('claws_paid') === 'true';
        this.isTrialMode = sessionStorage.getItem('claws_trial') === 'true';
        this.updateTrialBadge();
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
            } catch (e) {
                // Not connected yet
            }
        }
    },

    async connectWallet() {
        const btn = document.getElementById('walletBtn');
        
        if (this.walletConnected) {
            // Disconnect
            if (window.solana) {
                await window.solana.disconnect();
            }
            this.walletConnected = false;
            this.walletAddress = null;
            this.updateWalletButton();
            this.updateWalletStatus();
            return;
        }

        // Connect
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
        } catch (error) {
            console.error('Wallet connection failed:', error);
            btn.textContent = 'CONNECT';
        }
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
        const trialBadge = document.getElementById('trial-badge');
        if (trialBadge) {
            if (this.isTrialMode && !this.hasPaid) {
                trialBadge.classList.remove('hidden');
            } else {
                trialBadge.classList.add('hidden');
            }
        }
    },

    showPayOverlay() {
        const overlay = document.getElementById('pay-overlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }
        this.updateWalletStatus();
    },

    hidePayOverlay() {
        const overlay = document.getElementById('pay-overlay');
        if (overlay) {
            overlay.classList.add('hidden');
        }
    },

    updateUI() {
        this.updateTrialBadge();
        if (this.hasPaid || this.isTrialMode) {
            this.hidePayOverlay();
        }
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
        
        alert('FREE TRIAL MODE\n\nYou can play and practice, but you won\'t earn any $CLAWS rewards.\n\nPay 1000 $CLAWS to unlock full rewards!');
    },

    async getATA(mint, owner, tokenProgramId) {
        const [ata] = await solanaWeb3.PublicKey.findProgramAddress(
            [
                owner.toBytes(),
                new solanaWeb3.PublicKey(tokenProgramId).toBytes(),
                mint.toBytes(),
            ],
            new solanaWeb3.PublicKey(this.ASSOCIATED_TOKEN_PROGRAM_ID)
        );
        return ata;
    },

    createATAInstruction(payer, ata, owner, mint, tokenProgramId) {
        const keys = [
            { pubkey: payer, isSigner: true, isWritable: true },
            { pubkey: ata, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: false, isWritable: false },
            { pubkey: mint, isSigner: false, isWritable: false },
            { pubkey: solanaWeb3.SystemProgram.programId, isSigner: false, isWritable: false },
            { pubkey: new solanaWeb3.PublicKey(tokenProgramId), isSigner: false, isWritable: false },
        ];

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: new solanaWeb3.PublicKey(this.ASSOCIATED_TOKEN_PROGRAM_ID),
            data: new Uint8Array([1]),
        });
    },

    createTransferInstruction(source, destination, owner, amount, tokenProgramId) {
        const keys = [
            { pubkey: source, isSigner: false, isWritable: true },
            { pubkey: destination, isSigner: false, isWritable: true },
            { pubkey: owner, isSigner: true, isWritable: false },
        ];

        const data = new Uint8Array(9);
        data[0] = 3;

        const bigAmount = BigInt(amount);
        for (let i = 0; i < 8; i++) {
            data[1 + i] = Number((bigAmount >> BigInt(i * 8)) & BigInt(0xff));
        }

        return new solanaWeb3.TransactionInstruction({
            keys,
            programId: new solanaWeb3.PublicKey(tokenProgramId),
            data,
        });
    },

    async payEntryFee() {
        const btn = document.getElementById('pay-btn');
        
        // Check if wallet is connected first
        if (!this.walletConnected) {
            alert('Please connect your wallet first!');
            return;
        }

        if (btn) {
            btn.classList.add('loading');
            btn.disabled = true;
            btn.textContent = 'PROCESSING...';
        }

        try {
            // Your Helius RPC
            const connection = new solanaWeb3.Connection(
                'https://mainnet.helius-rpc.com/?api-key=baf23f95-165a-4136-b897-54b932e51c52',
                'confirmed'
            );

            const mintPubkey = new solanaWeb3.PublicKey(this.TOKEN_MINT);
            const treasuryPubkey = new solanaWeb3.PublicKey(this.TREASURY_WALLET);
            const senderPubkey = new solanaWeb3.PublicKey(this.walletAddress);

            console.log('Fetching mint account...');
            const mintAccount = await connection.getAccountInfo(mintPubkey);
            
            if (!mintAccount) {
                throw new Error('Token mint not found!');
            }
            
            const mintOwner = mintAccount.owner.toBase58();
            let tokenProgramId = mintOwner === this.TOKEN_2022_PROGRAM_ID 
                ? this.TOKEN_2022_PROGRAM_ID 
                : this.TOKEN_PROGRAM_ID;
            
            console.log('Token program:', tokenProgramId);

            const senderATA = await this.getATA(mintPubkey, senderPubkey, tokenProgramId);
            const treasuryATA = await this.getATA(mintPubkey, treasuryPubkey, tokenProgramId);

            console.log('Sender ATA:', senderATA.toString());
            console.log('Treasury ATA:', treasuryATA.toString());

            // Check balance
            const senderAccount = await connection.getAccountInfo(senderATA);
            if (!senderAccount) {
                throw new Error('You don\'t have any $CLAWS tokens!');
            }

            const balanceInfo = await connection.getTokenAccountBalance(senderATA);
            const balance = balanceInfo.value.uiAmount;
            console.log('Balance:', balance);
            
            if (balance < this.ENTRY_FEE) {
                throw new Error(`Insufficient balance. You have ${balance} but need ${this.ENTRY_FEE} $CLAWS`);
            }

            // Build instructions
            const instructions = [];
            
            // Priority fee for faster confirmation
            instructions.push(
                solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
                solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 500000 })
            );

            // Create treasury ATA if needed
            const treasuryAccount = await connection.getAccountInfo(treasuryATA);
            if (!treasuryAccount) {
                console.log('Treasury ATA needs to be created');
                instructions.push(
                    this.createATAInstruction(senderPubkey, treasuryATA, treasuryPubkey, mintPubkey, tokenProgramId)
                );
            }

            // Transfer instruction
            const amount = this.ENTRY_FEE * Math.pow(10, this.TOKEN_DECIMALS);
            console.log('Amount:', amount);
            
            instructions.push(
                this.createTransferInstruction(senderATA, treasuryATA, senderPubkey, amount, tokenProgramId)
            );

            // Get FRESH blockhash
            if (btn) btn.textContent = 'PREPARING...';
            
            const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');
            console.log('Blockhash:', blockhash);

            // Create transaction
            const transaction = new solanaWeb3.Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = senderPubkey;
            instructions.forEach(ix => transaction.add(ix));

            // Sign with Phantom
            if (btn) btn.textContent = 'SIGN IN WALLET...';
            
            let signed;
            try {
                signed = await window.solana.signTransaction(transaction);
            } catch (e) {
                if (e.message.includes('User rejected')) {
                    throw new Error('Transaction cancelled by user');
                }
                throw e;
            }
            
            // Send transaction
            if (btn) btn.textContent = 'SENDING...';
            
            const rawTx = signed.serialize();
            const signature = await connection.sendRawTransaction(rawTx, {
                skipPreflight: true,
                preflightCommitment: 'confirmed'
            });

            console.log('TX sent:', signature);
            console.log('Solscan: https://solscan.io/tx/' + signature);

            if (btn) btn.textContent = 'CONFIRMING...';

            // Confirmation with resubmission loop
            const startTime = Date.now();
            const timeout = 90000; // 90 seconds
            let confirmed = false;
            
            // Resend every 2 seconds to combat blockhash expiry
            const resendLoop = setInterval(async () => {
                try {
                    await connection.sendRawTransaction(rawTx, {
                        skipPreflight: true,
                        preflightCommitment: 'confirmed'
                    });
                } catch (e) {}
            }, 2000);

            try {
                while (!confirmed && (Date.now() - startTime) < timeout) {
                    await new Promise(r => setTimeout(r, 2000));
                    
                    try {
                        const status = await connection.getSignatureStatus(signature);
                        
                        if (status && status.value) {
                            if (status.value.err) {
                                throw new Error('Transaction failed: ' + JSON.stringify(status.value.err));
                            }
                            if (status.value.confirmationStatus === 'confirmed' || 
                                status.value.confirmationStatus === 'finalized') {
                                confirmed = true;
                                console.log('Confirmed!');
                            }
                        }
                    } catch (e) {
                        if (e.message.includes('Transaction failed')) throw e;
                        console.log('Waiting for confirmation...');
                    }
                }
            } finally {
                clearInterval(resendLoop);
            }

            if (!confirmed) {
                // Final check
                const finalStatus = await connection.getSignatureStatus(signature);
                if (finalStatus?.value && !finalStatus.value.err) {
                    confirmed = true;
                }
            }

            if (!confirmed) {
                throw new Error('Transaction may have succeeded. Check Solscan: https://solscan.io/tx/' + signature);
            }

            console.log('Payment successful!');

            this.hasPaid = true;
            this.isTrialMode = false;
            sessionStorage.setItem('claws_paid', 'true');
            sessionStorage.removeItem('claws_trial');
            this.hidePayOverlay();
            this.updateTrialBadge();

            alert('Payment successful! Choose your beast!');
            goToSelect();

        } catch (error) {
            console.error('Payment failed:', error);
            alert('Payment failed: ' + error.message);
        } finally {
            if (btn) {
                btn.classList.remove('loading');
                btn.disabled = false;
                btn.textContent = 'PAY 1000 $CLAWS';
            }
        }
    },

    reset() {
        this.hasPaid = false;
        this.isTrialMode = false;
        sessionStorage.removeItem('claws_paid');
        sessionStorage.removeItem('claws_trial');
        this.updateUI();
    },

    // Send reward tokens to player on win
    async sendWinReward(streak = 1) {
        if (this.isTrialMode || !this.hasPaid || !this.walletConnected) {
            return { success: false, message: 'Trial mode or not connected' };
        }

        const reward = this.WIN_REWARD + (streak * 10); // Base + streak bonus
        
        try {
            const connection = new solanaWeb3.Connection(
                'https://mainnet.helius-rpc.com/?api-key=82dfe3db-e941-4299-b074-732540b89751',
                'confirmed'
            );

            const mintPubkey = new solanaWeb3.PublicKey(this.TOKEN_MINT);
            const treasuryPubkey = new solanaWeb3.PublicKey(this.TREASURY_WALLET);
            const playerPubkey = new solanaWeb3.PublicKey(this.walletAddress);

            const mintAccount = await connection.getAccountInfo(mintPubkey);
            const mintOwner = mintAccount.owner.toBase58();
            const tokenProgramId = mintOwner === this.TOKEN_2022_PROGRAM_ID 
                ? this.TOKEN_2022_PROGRAM_ID 
                : this.TOKEN_PROGRAM_ID;

            const treasuryATA = await this.getATA(mintPubkey, treasuryPubkey, tokenProgramId);
            const playerATA = await this.getATA(mintPubkey, playerPubkey, tokenProgramId);

            // Check treasury balance
            const treasuryBalance = await connection.getTokenAccountBalance(treasuryATA);
            if (treasuryBalance.value.uiAmount < reward) {
                console.log('Treasury low on funds');
                return { success: false, message: 'Prize pool depleted' };
            }

            // For rewards, treasury needs to sign - this would require backend
            // For now, we track pending rewards
            this.pendingReward += reward;
            console.log(`Win reward: +${reward} $CLAWS (Total pending: ${this.pendingReward})`);
            
            return { success: true, amount: reward, pending: this.pendingReward };

        } catch (error) {
            console.error('Reward failed:', error);
            return { success: false, message: error.message };
        }
    },

    // Deduct tokens from player on loss
    async deductLossPenalty() {
        if (this.isTrialMode || !this.hasPaid || !this.walletConnected) {
            return { success: false, message: 'Trial mode or not connected' };
        }

        const penalty = this.LOSE_PENALTY;

        try {
            const connection = new solanaWeb3.Connection(
                'https://mainnet.helius-rpc.com/?api-key=baf23f95-165a-4136-b897-54b932e51c52',
                'confirmed'
            );

            const mintPubkey = new solanaWeb3.PublicKey(this.TOKEN_MINT);
            const treasuryPubkey = new solanaWeb3.PublicKey(this.TREASURY_WALLET);
            const playerPubkey = new solanaWeb3.PublicKey(this.walletAddress);

            const mintAccount = await connection.getAccountInfo(mintPubkey);
            const mintOwner = mintAccount.owner.toBase58();
            const tokenProgramId = mintOwner === this.TOKEN_2022_PROGRAM_ID 
                ? this.TOKEN_2022_PROGRAM_ID 
                : this.TOKEN_PROGRAM_ID;

            const playerATA = await this.getATA(mintPubkey, playerPubkey, tokenProgramId);
            const treasuryATA = await this.getATA(mintPubkey, treasuryPubkey, tokenProgramId);

            // Check player balance
            const playerBalance = await connection.getTokenAccountBalance(playerATA);
            if (playerBalance.value.uiAmount < penalty) {
                console.log('Player has insufficient tokens for penalty');
                return { success: false, message: 'Insufficient balance for penalty' };
            }

            // Get fresh blockhash
            const { blockhash } = await connection.getLatestBlockhash('finalized');

            const transaction = new solanaWeb3.Transaction();
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = playerPubkey;

            transaction.add(
                solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: 100000 }),
                solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 100000 })
            );

            const amount = penalty * Math.pow(10, this.TOKEN_DECIMALS);
            
            transaction.add(
                this.createTransferInstruction(playerATA, treasuryATA, playerPubkey, amount, tokenProgramId)
            );

            const signed = await window.solana.signTransaction(transaction);
            
            const signature = await connection.sendRawTransaction(signed.serialize(), {
                skipPreflight: true,
                maxRetries: 3,
                preflightCommitment: 'confirmed'
            });

            console.log('Penalty TX:', signature);

            // Poll for confirmation
            let confirmed = false;
            let attempts = 0;
            while (!confirmed && attempts < 20) {
                await new Promise(r => setTimeout(r, 1000));
                attempts++;
                const status = await connection.getSignatureStatus(signature);
                if (status && status.value && !status.value.err) {
                    if (status.value.confirmationStatus === 'confirmed' || status.value.confirmationStatus === 'finalized') {
                        confirmed = true;
                    }
                }
            }

            console.log(`Loss penalty: -${penalty} $CLAWS`);
            return { success: confirmed, amount: penalty };

        } catch (error) {
            console.error('Penalty failed:', error);
            return { success: false, message: error.message };
        }
    }
};

function connectWallet() {
    PayToPlay.connectWallet();
}

function payEntryFee() {
    PayToPlay.payEntryFee();
}

function startFreeTrial() {
    PayToPlay.startFreeTrial();
}