/* ==================== PAY TO PLAY SYSTEM ==================== */
const PayToPlay = {
    ENTRY_FEE: 1000,
    TOKEN_MINT: 'BZz5TeFBaQ4uv5iXFf4S7mX7qzvyFLSbDpjeyzwRpump',
    TOKEN_DECIMALS: 6,
    TREASURY_WALLET: 'Bb7sK2Fzo22KXg83nq9uLRk5pW9eyVdJH32xo3XLd7Bn',
    hasPaid: false,
    isTrialMode: false,
    
    TOKEN_PROGRAM_ID: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
    TOKEN_2022_PROGRAM_ID: 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
    ASSOCIATED_TOKEN_PROGRAM_ID: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',

    init() {
        this.hasPaid = sessionStorage.getItem('claws_paid') === 'true';
        this.isTrialMode = sessionStorage.getItem('claws_trial') === 'true';
        this.updateUI();
    },

    updateUI() {
        const overlay = document.getElementById('pay-overlay');
        const trialBadge = document.getElementById('trial-badge');
        
        if (overlay) {
            if (this.hasPaid || this.isTrialMode) {
                overlay.classList.add('hidden');
            } else {
                overlay.classList.remove('hidden');
            }
        }
        
        if (trialBadge) {
            if (this.isTrialMode && !this.hasPaid) {
                trialBadge.classList.remove('hidden');
            } else {
                trialBadge.classList.add('hidden');
            }
        }
        
        this.updateWalletStatus();
    },

    updateWalletStatus() {
        const statusEl = document.getElementById('wallet-status');
        if (!statusEl) return;
        
        if (window.solana && window.solana.isConnected) {
            const addr = window.solana.publicKey.toString();
            statusEl.textContent = addr.slice(0, 4) + '...' + addr.slice(-4);
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
        
        this.updateUI();
        showSelect();
        
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
        if (btn) {
            btn.classList.add('loading');
            btn.disabled = true;
            btn.textContent = 'PROCESSING...';
        }

        try {
            if (!window.solana || !window.solana.isPhantom) {
                alert('Please install Phantom wallet!');
                throw new Error('Phantom not found');
            }

            const resp = await window.solana.connect();
            this.updateWalletStatus();

            const connection = new solanaWeb3.Connection(
                'https://mainnet.helius-rpc.com/?api-key=82dfe3db-e941-4299-b074-732540b89751',
                'confirmed'
            );

            const mintPubkey = new solanaWeb3.PublicKey(this.TOKEN_MINT);
            const treasuryPubkey = new solanaWeb3.PublicKey(this.TREASURY_WALLET);
            const senderPubkey = resp.publicKey;

            console.log('Fetching mint account to detect token program...');
            const mintAccount = await connection.getAccountInfo(mintPubkey);
            
            if (!mintAccount) {
                throw new Error('Token mint not found! Check TOKEN_MINT address.');
            }
            
            const mintOwner = mintAccount.owner.toBase58();
            console.log('Mint owner (token program):', mintOwner);
            
            let tokenProgramId;
            if (mintOwner === this.TOKEN_2022_PROGRAM_ID) {
                tokenProgramId = this.TOKEN_2022_PROGRAM_ID;
                console.log('Using Token 2022 Program');
            } else if (mintOwner === this.TOKEN_PROGRAM_ID) {
                tokenProgramId = this.TOKEN_PROGRAM_ID;
                console.log('Using Regular SPL Token Program');
            } else {
                throw new Error('Unknown token program: ' + mintOwner);
            }

            const senderATA = await this.getATA(mintPubkey, senderPubkey, tokenProgramId);
            const treasuryATA = await this.getATA(mintPubkey, treasuryPubkey, tokenProgramId);

            console.log('Sender ATA:', senderATA.toString());
            console.log('Treasury ATA:', treasuryATA.toString());

            const senderAccount = await connection.getAccountInfo(senderATA);
            if (!senderAccount) {
                throw new Error('You don\'t have any $CLAWS tokens. Please buy some first!');
            }

            const balanceInfo = await connection.getTokenAccountBalance(senderATA);
            const balance = balanceInfo.value.uiAmount;
            console.log('Your balance:', balance);
            
            if (balance < this.ENTRY_FEE) {
                throw new Error(`Insufficient balance. You have ${balance} but need ${this.ENTRY_FEE} $CLAWS`);
            }

            const transaction = new solanaWeb3.Transaction();

            transaction.add(
                solanaWeb3.ComputeBudgetProgram.setComputeUnitLimit({ units: 200000 }),
                solanaWeb3.ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 50000 })
            );

            const treasuryAccount = await connection.getAccountInfo(treasuryATA);
            if (!treasuryAccount) {
                console.log('Creating treasury ATA...');
                transaction.add(
                    this.createATAInstruction(senderPubkey, treasuryATA, treasuryPubkey, mintPubkey, tokenProgramId)
                );
            }

            const amount = this.ENTRY_FEE * Math.pow(10, this.TOKEN_DECIMALS);
            console.log('Transfer amount (raw):', amount);
            
            transaction.add(
                this.createTransferInstruction(senderATA, treasuryATA, senderPubkey, amount, tokenProgramId)
            );

            transaction.feePayer = senderPubkey;
            
            let blockhash, lastValidBlockHeight;
            for (let i = 0; i < 3; i++) {
                try {
                    const result = await connection.getLatestBlockhash('confirmed');
                    blockhash = result.blockhash;
                    lastValidBlockHeight = result.lastValidBlockHeight;
                    break;
                } catch (e) {
                    console.log(`Blockhash attempt ${i + 1} failed, retrying...`);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
            
            transaction.recentBlockhash = blockhash;

            const signed = await window.solana.signTransaction(transaction);
            
            const signature = await connection.sendRawTransaction(signed.serialize(), {
                skipPreflight: true,
                maxRetries: 5,
                preflightCommitment: 'confirmed'
            });

            console.log('Transaction sent:', signature);
            console.log('View on Solscan: https://solscan.io/tx/' + signature);

            const confirmation = await connection.confirmTransaction({
                signature,
                blockhash,
                lastValidBlockHeight
            }, 'confirmed');

            if (confirmation.value.err) {
                throw new Error('Transaction failed: ' + JSON.stringify(confirmation.value.err));
            }

            console.log('Payment successful:', signature);

            this.hasPaid = true;
            this.isTrialMode = false;
            sessionStorage.setItem('claws_paid', 'true');
            sessionStorage.removeItem('claws_trial');
            this.updateUI();

            showSelect();

            alert('Payment successful! Choose your beast!');

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
    }
};

function payEntryFee() {
    PayToPlay.payEntryFee();
}

function startFreeTrial() {
    PayToPlay.startFreeTrial();
}