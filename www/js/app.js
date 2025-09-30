// Main Application Logic.
class WinCoinsApp {
    constructor() {
        this.currentTab = 'events';
        this.events = [];
        this.userPredictions = [];
        this.isConnected = false;
        this.userAddress = null;

        this.initializeApp();
    }

    async initializeApp() {
        try {
            // Check if ethers is available.
            if (typeof ethers === 'undefined') {
                throw new Error('Ethers.js library is not loaded');
            }

            // Initialize contract.
            const contractInitialized = await winCoinsContract.initialize();
            if (!contractInitialized) {
                this.showNotification('Failed to initialize smart contract. Please check your wallet connection.', 'error');
                return;
            }

            this.setupEventListeners();
            this.setupTabNavigation();
            this.setupDarkMode();
            this.setupDateTimePicker();
            this.setupNetworkSelector();

            // Check for existing wallet connection.
            await this.checkExistingWalletConnection();

            await this.loadEvents();

            this.showNotification('WinCoins DApp loaded successfully!', 'success');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            if (error.message.includes('Ethers.js')) {
                this.showNotification('Ethers.js library failed to load. Please check your internet connection and refresh.', 'error');
            } else {
                this.showNotification('Failed to initialize application.', 'error');
            }
        }
    }

    setupEventListeners() {
        // Wallet connection.
        document.getElementById('connectWallet').addEventListener('click', () => this.connectWallet());

        // Wallet details click for disconnect.
        document.getElementById('walletStatus').addEventListener('click', () => this.handleWalletDetailsClick());

        // Network selector
        document.getElementById('networkButton').addEventListener('click', () => this.toggleNetworkDropdown());

        // Close network dropdown when clicking outside
        document.addEventListener('click', (e) => {
            const networkSelector = document.querySelector('.network-selector');
            if (!networkSelector.contains(e.target)) {
                this.closeNetworkDropdown();
            }
        });

        // Dark mode toggle.
        document.getElementById('darkModeToggle').addEventListener('click', () => this.toggleDarkMode());

        // Event creation form.
        document.getElementById('createEventForm').addEventListener('submit', (e) => this.handleCreateEvent(e));

        // Refresh events.
        document.getElementById('refreshEvents').addEventListener('click', () => this.loadEvents());

        // Event filter.
        document.getElementById('eventFilter').addEventListener('change', () => this.filterEvents());

        // Modal close.
        document.getElementById('closeModal').addEventListener('click', () => this.closeModal());
        document.getElementById('eventModal').addEventListener('click', (e) => {
            if (e.target.id === 'eventModal') this.closeModal();
        });

        // Check for wallet connection changes.
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => {
                if (accounts.length === 0) {
                    this.disconnectWallet();
                } else {
                    this.connectWallet();
                }
            });
        }
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', async () => {
                const tabName = button.getAttribute('data-tab');

                // Update active tab button.
                tabButtons.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');

                // Show corresponding tab content.
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabName}-tab`) {
                        content.classList.add('active');
                    }
                });

                this.currentTab = tabName;

                // Load appropriate data for the tab.
                if (tabName === 'admin-events') {
                    await this.loadAdminEvents();
                } else if (tabName === 'my-predictions') {
                    await this.loadUserPredictions();
                }
            });
        });
    }

    setupDarkMode() {
        // Check for saved theme preference or default to light mode.
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleDarkMode() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);

        // Update aria-label for accessibility.
        const toggleButton = document.getElementById('darkModeToggle');
        toggleButton.setAttribute('aria-label',
            theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
        );
    }

    setupDateTimePicker() {
        const dateTimeInput = document.getElementById('predictionDeadline');

        // Set default to 1 hour from now
        const now = new Date();
        const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

        // Format for datetime-local input (YYYY-MM-DDTHH:MM) in local time
        const formatLocalDateTime = (date) => {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        dateTimeInput.value = formatLocalDateTime(oneHourFromNow);
        dateTimeInput.min = formatLocalDateTime(now);
    }

    setupNetworkSelector() {
        this.populateNetworkOptions();
        this.updateCurrentNetwork();

        // Listen for network changes
        if (window.ethereum) {
            window.ethereum.on('chainChanged', () => {
                this.updateCurrentNetwork();
            });
        }
    }

    populateNetworkOptions() {
        const mainnetContainer = document.getElementById('mainnetOptions');
        const testnetContainer = document.getElementById('testnetOptions');

        // Get networks from NetworkUtils
        const mainnets = NetworkUtils.getMainnets();
        const testnets = NetworkUtils.getTestnets();

        // Populate mainnet options
        mainnetContainer.innerHTML = mainnets.map(network => `
            <div class="network-option" data-network="${network.name}">
                <div class="network-info">
                    <div class="network-name">${network.chainName}</div>
                    <div class="network-details">${network.nativeCurrency.symbol}</div>
                </div>
            </div>
        `).join('');

        // Populate testnet options
        testnetContainer.innerHTML = testnets.map(network => `
            <div class="network-option" data-network="${network.name}">
                <div class="network-info">
                    <div class="network-name">${network.chainName}</div>
                    <div class="network-details">${network.nativeCurrency.symbol} • Testnet</div>
                </div>
            </div>
        `).join('');

        // Add click handlers
        document.querySelectorAll('.network-option').forEach(option => {
            option.addEventListener('click', (e) => {
                const networkName = option.getAttribute('data-network');
                this.switchToNetwork(networkName);
            });
        });
    }

    async updateCurrentNetwork() {
        try {
            const currentNetwork = await NetworkUtils.getCurrentNetwork();
            const networkNameElement = document.getElementById('networkName');

            if (currentNetwork) {
                networkNameElement.textContent = currentNetwork.chainName;

                // Update current network highlighting
                document.querySelectorAll('.network-option').forEach(option => {
                    option.classList.remove('current');
                    if (option.getAttribute('data-network') === Object.keys(NETWORKS).find(key => NETWORKS[key].chainId === currentNetwork.chainId)) {
                        option.classList.add('current');
                    }
                });
            } else {
                networkNameElement.textContent = 'Unknown Network';
            }
        } catch (error) {
            console.error('Failed to update current network:', error);
            document.getElementById('networkName').textContent = 'Select Network';
        }
    }

    toggleNetworkDropdown() {
        const dropdown = document.getElementById('networkDropdown');
        const arrow = document.querySelector('.network-dropdown-arrow');

        dropdown.classList.toggle('hidden');
        arrow.style.transform = dropdown.classList.contains('hidden') ? 'rotate(0deg)' : 'rotate(180deg)';
    }

    closeNetworkDropdown() {
        const dropdown = document.getElementById('networkDropdown');
        const arrow = document.querySelector('.network-dropdown-arrow');

        dropdown.classList.add('hidden');
        arrow.style.transform = 'rotate(0deg)';
    }

    async switchToNetwork(networkName) {
        try {
            this.showNotification(`Switching to ${NETWORKS[networkName]?.chainName || networkName}...`, 'info');

            const success = await NetworkUtils.switchNetwork(networkName);

            if (success) {
                this.showNotification(`Successfully switched to ${NETWORKS[networkName]?.chainName || networkName}`, 'success');
                this.closeNetworkDropdown();

                // Update contract connection if wallet is connected
                if (this.isConnected) {
                    await this.reconnectToNetwork();
                }
            } else {
                this.showNotification('Failed to switch network. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Network switch error:', error);
            this.showNotification('Failed to switch network. Please try again.', 'error');
        }
    }

    async reconnectToNetwork() {
        try {
            // Reinitialize contract with new network
            await winCoinsContract.initialize();

            // Reconnect wallet to get signer for new network
            await this.connectWallet();

        } catch (error) {
            console.error('Failed to reconnect to new network:', error);
            this.showNotification('Please reconnect your wallet for the new network.', 'warning');
        }
    }

    async checkExistingWalletConnection() {
        try {
            if (window.ethereum) {
                const accounts = await window.ethereum.request({ method: 'eth_accounts' });
                if (accounts.length > 0) {
                    // Wallet is already connected, set up the signer properly.
                    const address = await winCoinsContract.connectWallet();
                    this.userAddress = address;
                    this.isConnected = true;

                    // Update UI.
                    document.getElementById('connectWallet').style.display = 'none';
                    document.getElementById('walletStatus').classList.remove('hidden');
                    document.getElementById('walletAddress').textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;

                    // Update balance.
                    await this.updateBalance();

                    // Load user data if on my-predictions tab.
                    if (this.currentTab === 'my-predictions') {
                        await this.loadUserPredictions();
                    }

                    console.log('Existing wallet connection restored:', address);
                }
            }
        } catch (error) {
            console.error('Failed to check existing wallet connection:', error);
        }
    }

    handleWalletDetailsClick() {
        if (this.isConnected) {
            // Show confirmation dialog.
            if (confirm('Do you want to disconnect your wallet?')) {
                this.disconnectWallet();
            }
        }
    }

    async connectWallet() {
        try {
            const address = await winCoinsContract.connectWallet();
            this.userAddress = address;
            this.isConnected = true;

            // Update UI.
            document.getElementById('connectWallet').style.display = 'none';
            document.getElementById('walletStatus').classList.remove('hidden');
            document.getElementById('walletAddress').textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;

            // Update balance.
            await this.updateBalance();

            this.showNotification('Wallet connected successfully!', 'success');

            // Reload data.
            await this.loadEvents();

            // Load data based on current tab.
            if (this.currentTab === 'admin-events') {
                await this.loadAdminEvents();
            } else if (this.currentTab === 'my-predictions') {
                await this.loadUserPredictions();
            }
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            this.showNotification('Failed to connect wallet. Please try again.', 'error');
        }
    }

    disconnectWallet() {
        this.isConnected = false;
        this.userAddress = null;

        // Update UI.
        document.getElementById('connectWallet').style.display = 'block';
        document.getElementById('walletStatus').classList.add('hidden');

        // Clear any displayed data.
        this.events = [];
        this.userPredictions = [];
        document.getElementById('eventsContainer').innerHTML = '<div class="loading">Please connect your wallet to view events.</div>';
        document.getElementById('userPredictionsContainer').innerHTML = '<p>Please connect your wallet to view your predictions.</p>';

        this.showNotification('Wallet disconnected', 'warning');
    }

    async updateBalance() {
        if (this.isConnected) {
            try {
                const balance = await winCoinsContract.getBalance();
                document.getElementById('walletBalance').textContent = `${new Decimal(balance).toFixed(4)} ETH`;
            } catch (error) {
                console.error('Failed to update balance:', error);
            }
        }
    }

    async handleCreateEvent(e) {
        e.preventDefault();

        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first.', 'warning');
            return;
        }

        try {
            const name = document.getElementById('eventName').value;
            const outcomesText = document.getElementById('eventOutcomes').value;
            const predictionDeadline = document.getElementById('predictionDeadline').value;

            const outcomes = outcomesText.split('\n').map(o => o.trim()).filter(o => o.length > 0);

            // Calculate prediction duration in minutes from now until the selected deadline
            const now = new Date();
            const deadline = new Date(predictionDeadline);
            const predictionDuration = Math.ceil((deadline - now) / (1000 * 60)); // Duration in minutes

            if (outcomes.length < 2) {
                this.showNotification('Please provide at least 2 outcomes.', 'error');
                return;
            }

            if (deadline <= now) {
                this.showNotification('Prediction deadline must be in the future.', 'error');
                return;
            }

            if (predictionDuration < 1) {
                this.showNotification('Prediction deadline must be at least 1 minute from now.', 'error');
                return;
            }

            this.showNotification('Creating event... Please confirm the transaction.', 'info');

            const eventId = await winCoinsContract.createEvent(name, outcomes, predictionDuration);

            if (eventId !== null) {
                this.showNotification(`Event created successfully! Event ID: ${eventId}`, 'success');
                document.getElementById('createEventForm').reset();
                await this.loadEvents();
                await this.loadAdminEvents();
            } else {
                this.showNotification('Failed to create event.', 'error');
            }
        } catch (error) {
            console.error('Failed to create event:', error);
            this.showNotification('Failed to create event. Please try again.', 'error');
        }
    }

    async loadEvents() {
        try {
            document.getElementById('eventsContainer').innerHTML = '<div class="loading">Loading events...</div>';

            this.events = await winCoinsContract.getAllEvents();
            this.renderEvents();
        } catch (error) {
            console.error('Failed to load events:', error);
            document.getElementById('eventsContainer').innerHTML = '<div class="loading">Failed to load events.</div>';
        }
    }

    renderEvents() {
        const container = document.getElementById('eventsContainer');
        const filter = document.getElementById('eventFilter').value;

        let filteredEvents = this.events;

        if (filter === 'open') {
            filteredEvents = this.events.filter(event => !event.isResolved && !event.isCancelled && winCoinsContract.isEventOpen(event.predictionDeadline));
        } else if (filter === 'resolved') {
            filteredEvents = this.events.filter(event => event.isResolved && !event.isCancelled);
        } else if (filter === 'cancelled') {
            filteredEvents = this.events.filter(event => event.isCancelled);
        }

        if (filteredEvents.length === 0) {
            container.innerHTML = '<div class="loading">No events found.</div>';
            return;
        }

        // Generate simplified cards.
        const eventCards = filteredEvents.map(event => this.renderEventCard(event));
        container.innerHTML = eventCards.join('');

        // Add event listeners to cards.
        container.querySelectorAll('.event-card').forEach(card => {
            card.addEventListener('click', () => {
                const eventId = parseInt(card.getAttribute('data-event-id'));
                this.openEventModal(eventId);
            });
        });
    }

    renderEventCard(event) {
        const isOpen = !event.isResolved && !event.isCancelled && winCoinsContract.isEventOpen(event.predictionDeadline);
        const isResolved = event.isResolved;
        const isCancelled = event.isCancelled;
        const isExpired = !isResolved && !isCancelled && !isOpen;

        let statusClass = 'status-open';
        let statusText = 'Open for Predictions';
        let cardClass = '';

        if (isCancelled) {
            statusClass = 'status-cancelled';
            statusText = 'Cancelled - Refunds Available';
            cardClass = 'cancelled';
        } else if (isResolved) {
            statusClass = 'status-resolved';
            statusText = 'Resolved';
            cardClass = 'resolved';
        } else if (isExpired) {
            statusClass = 'status-expired';
            statusText = 'Predictions Closed';
            cardClass = 'expired';
        }

        return `
            <div class="event-card ${cardClass}" data-event-id="${event.id}">
                <div class="event-header">
                    <div class="event-title">${event.name}</div>
                    <div class="event-status ${statusClass}">${statusText}</div>
                </div>
                <div class="event-deadline">
                    <span class="deadline-label">Deadline:</span>
                    <span class="deadline-time">${winCoinsContract.formatTime(event.predictionDeadline)}</span>
                </div>
                <div class="event-footer">
                    <span class="outcome-count">${event.outcomes.length} outcomes</span>
                    <span class="total-pool">${event.totalPoolAmount} ETH</span>
                </div>
            </div>
        `;
    }

    async openEventModal(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const modal = document.getElementById('eventModal');
        const modalContent = document.getElementById('modalContent');

        const isOpen = !event.isResolved && !event.isCancelled && winCoinsContract.isEventOpen(event.predictionDeadline);

        // Get pool amounts for each outcome.
        const poolAmounts = [];
        for (let i = 0; i < event.outcomes.length; i++) {
            try {
                const amount = await winCoinsContract.getPoolAmount(eventId, i);
                poolAmounts.push(amount);
            } catch (error) {
                poolAmounts.push('0');
            }
        }


        const outcomesHtml = event.outcomes.map((outcome, index) => {
            const isWinner = event.isResolved && event.winningOutcome === index;
            const winnerClass = isWinner ? 'winner' : '';
            const canPredict = isOpen && this.isConnected && this.userAddress;

            return `
                <div class="outcome-card ${winnerClass} ${canPredict ? 'clickable' : ''}" data-outcome-index="${index}">
                    <div class="outcome-header">
                        <div class="outcome-name">${outcome} ${isWinner ? '👑' : ''}</div>
                        <div class="outcome-pool">${poolAmounts[index]} ETH</div>
                    </div>
                    ${canPredict ? `
                        <div class="prediction-controls hidden">
                            <div class="amount-input-group">
                                <input type="number" class="prediction-amount-input" placeholder="0.01" step="0.01" min="0.01">
                                <span class="amount-suffix">ETH</span>
                            </div>
                            <button class="btn btn-primary btn-predict-outcome" onclick="app.makePredictionFromCard(${eventId}, ${index})">
                                Predict ${outcome}
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');

        let predictionHelp = '';
        if (event.isCancelled) {
            // For cancelled events, we need to check refund status properly
            if (this.isConnected && this.userAddress) {
                // Load refund status dynamically
                predictionHelp = `
                    <div class="cancellation-notice">
                        <div class="alert alert-warning">
                            <h4>🚫 Event Cancelled</h4>
                            <p>This event has been cancelled by the creator.</p>
                            <div id="refundStatus">
                                <p>Checking refund status...</p>
                            </div>
                        </div>
                    </div>
                `;
                // Check refund status after rendering
                setTimeout(() => this.checkRefundStatus(eventId), 100);
            } else {
                predictionHelp = `
                    <div class="cancellation-notice">
                        <div class="alert alert-warning">
                            <h4>🚫 Event Cancelled</h4>
                            <p>This event has been cancelled by the creator.</p>
                            <p>Connect your wallet to check if you can claim a refund.</p>
                            <button class="btn btn-primary" onclick="app.connectWallet()">Connect Wallet</button>
                        </div>
                    </div>
                `;
            }
        } else if (isOpen && this.isConnected && this.userAddress) {
            predictionHelp = `
                <div class="prediction-instructions">
                    <p>💡 Click on an outcome below to make your prediction</p>
                </div>
            `;
        } else if (isOpen && (!this.isConnected || !this.userAddress)) {
            predictionHelp = `
                <div class="prediction-section">
                    <p class="connect-wallet-prompt">Connect your wallet to make predictions</p>
                    <button class="btn btn-primary" onclick="app.connectWallet()">Connect Wallet</button>
                </div>
            `;
        }

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>${event.name}</h3>
                <div class="event-meta">
                    <span class="event-status ${event.isCancelled ? 'status-cancelled' : (event.isResolved ? 'status-resolved' : (isOpen ? 'status-open' : 'status-expired'))}">
                        ${event.isCancelled ? 'Cancelled' : (event.isResolved ? 'Resolved' : (isOpen ? 'Open for Predictions' : 'Predictions Closed'))}
                    </span>
                    <span class="event-deadline-modal">
                        Deadline: ${winCoinsContract.formatTime(event.predictionDeadline)}
                    </span>
                </div>
            </div>

            <div class="modal-body">
                ${predictionHelp}

                <div class="outcomes-section">
                    <h4>Outcomes & Predictions</h4>
                    <div class="outcomes-grid-modal">
                        ${outcomesHtml}
                    </div>
                </div>

                <div class="event-stats">
                    <div class="stat-item">
                        <span class="stat-label">Total Pool</span>
                        <span class="stat-value">${event.totalPoolAmount} ETH</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Outcomes</span>
                        <span class="stat-value">${event.outcomes.length}</span>
                    </div>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');

        // Add click handlers for outcome cards.
        if (isOpen && this.isConnected && this.userAddress) {
            this.setupOutcomeCardInteractions();
        }
    }

    setupOutcomeCardInteractions() {
        const outcomeCards = document.querySelectorAll('.outcome-card.clickable');

        outcomeCards.forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on input or button.
                if (e.target.matches('input, button')) return;

                const outcomeIndex = parseInt(card.getAttribute('data-outcome-index'));
                this.selectOutcome(outcomeIndex);
            });
        });
    }

    selectOutcome(outcomeIndex) {
        // Deselect all outcome cards.
        document.querySelectorAll('.outcome-card').forEach(card => {
            card.classList.remove('selected');
            const controls = card.querySelector('.prediction-controls');
            if (controls) controls.classList.add('hidden');
        });

        // Select the clicked outcome card.
        const selectedCard = document.querySelector(`[data-outcome-index="${outcomeIndex}"]`);
        if (selectedCard) {
            selectedCard.classList.add('selected');
            const controls = selectedCard.querySelector('.prediction-controls');
            if (controls) {
                controls.classList.remove('hidden');

                // Focus on the amount input and scroll to it.
                const amountInput = controls.querySelector('.prediction-amount-input');
                if (amountInput) {
                    setTimeout(() => {
                        amountInput.focus();
                        selectedCard.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }, 100);
                }
            }
        }
    }

    async makePredictionFromCard(eventId, outcomeIndex) {
        const selectedCard = document.querySelector(`[data-outcome-index="${outcomeIndex}"]`);
        const amountInput = selectedCard.querySelector('.prediction-amount-input');
        const amount = new Decimal(amountInput.value || '0');

        if (amount.lte(0)) {
            this.showNotification('Please enter a valid prediction amount', 'error');
            amountInput.focus();
            return;
        }

        await this.makePrediction(eventId, outcomeIndex, amount);
    }

    async submitPrediction(eventId) {
        const selectedOutcome = document.querySelector('input[name="selectedOutcome"]:checked');
        const amountInput = document.getElementById('predictionAmountInput');

        if (!selectedOutcome) {
            this.showNotification('Please select an outcome to predict', 'error');
            return;
        }

        const outcomeIndex = parseInt(selectedOutcome.value);
        const amount = new Decimal(amountInput.value || '0');

        if (amount.lte(0)) {
            this.showNotification('Please enter a valid prediction amount', 'error');
            return;
        }

        await this.makePrediction(eventId, outcomeIndex, amount);
    }

    closeModal() {
        document.getElementById('eventModal').classList.add('hidden');
    }

    showConfirmModal(title, message) {
        return new Promise((resolve) => {
            const modal = document.getElementById('confirmModal');
            const titleEl = document.getElementById('confirmTitle');
            const messageEl = document.getElementById('confirmMessage');
            const cancelBtn = document.getElementById('confirmCancel');
            const okBtn = document.getElementById('confirmOk');

            titleEl.textContent = title;
            messageEl.textContent = message;

            const cleanup = () => {
                modal.classList.add('hidden');
                cancelBtn.removeEventListener('click', onCancel);
                okBtn.removeEventListener('click', onOk);
                modal.removeEventListener('click', onBackdropClick);
            };

            const onCancel = () => {
                cleanup();
                resolve(false);
            };

            const onOk = () => {
                cleanup();
                resolve(true);
            };

            const onBackdropClick = (e) => {
                if (e.target === modal) {
                    cleanup();
                    resolve(false);
                }
            };

            cancelBtn.addEventListener('click', onCancel);
            okBtn.addEventListener('click', onOk);
            modal.addEventListener('click', onBackdropClick);

            modal.classList.remove('hidden');
        });
    }

    async switchToTab(tabName) {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        // Update active tab button.
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('data-tab') === tabName) {
                btn.classList.add('active');
            }
        });

        // Show corresponding tab content.
        tabContents.forEach(content => {
            content.classList.remove('active');
            if (content.id === `${tabName}-tab`) {
                content.classList.add('active');
            }
        });

        this.currentTab = tabName;

        // Load appropriate data for the tab.
        if (tabName === 'admin-events') {
            await this.loadAdminEvents();
        } else if (tabName === 'my-predictions') {
            await this.loadUserPredictions();
        }
    }

    async makePrediction(eventId, outcomeIndex, amount) {
        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first.', 'warning');
            return;
        }

        try {
            // Handle both Decimal and number inputs
            const decimalAmount = amount instanceof Decimal ? amount : new Decimal(amount || '0');
            if (decimalAmount.lte(0)) {
                this.showNotification('Please enter a valid prediction amount.', 'error');
                return;
            }

            this.showNotification('Making prediction... Please confirm the transaction.', 'info');

            await winCoinsContract.makePrediction(eventId, outcomeIndex, decimalAmount.toString());

            this.showNotification('Prediction made successfully!', 'success');

            // Clear the form.
            const selectedCard = document.querySelector('.outcome-card.selected');
            if (selectedCard) {
                selectedCard.classList.remove('selected');
                const controls = selectedCard.querySelector('.prediction-controls');
                if (controls) {
                    controls.classList.add('hidden');
                    const amountInput = controls.querySelector('.prediction-amount-input');
                    if (amountInput) amountInput.value = '';
                }
            }

            // Also clear old form elements if they exist.
            const selectedOutcome = document.querySelector('input[name="selectedOutcome"]:checked');
            if (selectedOutcome) selectedOutcome.checked = false;
            const amountInput = document.getElementById('predictionAmountInput');
            if (amountInput) amountInput.value = '';

            // Refresh data.
            await this.loadEvents();
            await this.updateBalance();

            // Refresh data based on current tab.
            if (this.currentTab === 'admin-events') {
                await this.loadAdminEvents();
            } else if (this.currentTab === 'my-predictions') {
                await this.loadUserPredictions();
            }

            this.closeModal();

            // Switch to My Predictions tab to show the new prediction.
            await this.switchToTab('my-predictions');
        } catch (error) {
            console.error('Failed to make prediction:', error);
            this.showNotification('Failed to make prediction. Please try again.', 'error');
        }
    }

    async loadUserPredictions() {
        if (!this.isConnected) {
            document.getElementById('userPredictionsContainer').innerHTML = '<p>Please connect your wallet to view your predictions.</p>';
            return;
        }

        try {
            this.userPredictions = await winCoinsContract.getUserPredictionsForAllEvents();
            this.renderUserPredictions();
        } catch (error) {
            console.error('Failed to load user predictions:', error);
            document.getElementById('userPredictionsContainer').innerHTML = '<p>Failed to load your predictions.</p>';
        }
    }

    renderUserPredictions() {
        const container = document.getElementById('userPredictionsContainer');

        if (this.userPredictions.length === 0) {
            container.innerHTML = '<p>No predictions placed yet.</p>';
            return;
        }

        container.innerHTML = this.userPredictions.map(prediction => {
            const canClaim = prediction.isResolved && prediction.isWinner && !prediction.isClaimed;
            const canClaimRefund = prediction.isCancelled && prediction.isRefundable && !prediction.isClaimed;

            // Determine card classes.
            let cardClasses = 'prediction-card';
            if (prediction.isWinner) cardClasses += ' winner';
            if (prediction.isClaimed) cardClasses += ' claimed';
            if (prediction.isRefunded) cardClasses += ' refunded';
            if (prediction.isCancelled) cardClasses += ' cancelled';

            return `
                <div class="${cardClasses}">
                    <div class="prediction-info">
                        <h4>${prediction.eventName}</h4>
                        <p><strong>Outcome:</strong> ${prediction.outcomeName}</p>
                        <p><strong>Prediction Amount:</strong> ${prediction.predictionAmount} ${
                            prediction.predictionAmount !== 'Claimed' && prediction.predictionAmount !== 'Refunded' ? 'ETH' : ''
                        }</p>
                        ${prediction.isClaimed && !prediction.isCancelled ?
                            `<p><strong>Payout Received:</strong> ${prediction.actualPayout} ETH 💰</p>` :
                            prediction.isRefunded ?
                            `<p><strong>Refund Received:</strong> ${prediction.actualPayout} ETH ↩️</p>` :
                            `<p><strong>Potential Payout:</strong> ${prediction.potentialPayout} ETH</p>`
                        }
                        <p><strong>Status:</strong> ${
                            prediction.isRefunded ? 'Refunded ✅' :
                            prediction.isClaimed ? 'Claimed! ✅' :
                            prediction.isCancelled ? 'Event Cancelled - Refund Available 🚫' :
                            prediction.isResolved ? (prediction.isWinner ? 'Winner! 🎉' : 'Lost') : 'Pending'
                        }</p>
                    </div>
                    <div class="prediction-actions">
                        ${canClaim ? `<button class="btn btn-success btn-small" onclick="app.claimPayout(${prediction.eventId})">Claim Payout</button>` : ''}
                        ${canClaimRefund ? `<button class="btn btn-warning btn-small" onclick="app.claimPayout(${prediction.eventId})">Claim Refund</button>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async checkRefundStatus(eventId) {
        try {
            const refundStatusDiv = document.getElementById('refundStatus');
            if (!refundStatusDiv) return;

            // Check if user has any predictions for this event
            let totalUserPrediction = new Decimal(0);
            const event = await winCoinsContract.getEventDetails(eventId);

            for (let i = 0; i < event.outcomes.length; i++) {
                const amount = await winCoinsContract.getUserPrediction(eventId, i);
                totalUserPrediction = totalUserPrediction.add(new Decimal(amount));
            }

            // Check if user has already claimed refund
            const payoutFilter = winCoinsContract.contract.filters.PayoutClaimed(eventId, this.userAddress);
            const payoutEvents = await winCoinsContract.contract.queryFilter(payoutFilter);
            const hasClaimedRefund = payoutEvents.length > 0;

            if (hasClaimedRefund) {
                const refundEvent = payoutEvents[0];
                const refundAmount = ethers.utils.formatEther(refundEvent.args.amount);
                refundStatusDiv.innerHTML = `
                    <div class="alert alert-success">
                        <p><strong>✅ Refund Claimed</strong></p>
                        <p>You have successfully claimed your refund of ${refundAmount} ETH for this cancelled event.</p>
                    </div>
                `;
            } else if (totalUserPrediction.gt(0)) {
                refundStatusDiv.innerHTML = `
                    <p>You have ${totalUserPrediction.toString()} ETH in refundable predictions for this event.</p>
                    <button class="btn btn-success" onclick="app.claimPayout(${eventId})">
                        Claim Refund (${totalUserPrediction.toString()} ETH)
                    </button>
                `;
            } else {
                refundStatusDiv.innerHTML = `
                    <p>You have no refundable predictions for this event.</p>
                `;
            }
        } catch (error) {
            console.error('Failed to check refund status:', error);
            const refundStatusDiv = document.getElementById('refundStatus');
            if (refundStatusDiv) {
                refundStatusDiv.innerHTML = `
                    <p>Unable to check refund status. Please try again.</p>
                `;
            }
        }
    }

    async claimPayout(eventId) {
        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first.', 'warning');
            return;
        }

        try {
            // Check if this is a refund for a cancelled event
            const event = this.events.find(e => e.id === eventId);
            const isRefund = event && event.isCancelled;

            this.showNotification(isRefund ? 'Claiming refund... Please confirm the transaction.' : 'Claiming payout... Please confirm the transaction.', 'info');

            await winCoinsContract.claimPayout(eventId);

            this.showNotification(isRefund ? 'Refund claimed successfully!' : 'Payout claimed successfully!', 'success');

            // Refresh data.
            await this.updateBalance();

            // Refresh predictions if on my-predictions tab.
            if (this.currentTab === 'my-predictions') {
                await this.loadUserPredictions();
            }
        } catch (error) {
            console.error('Failed to claim payout:', error);
            this.showNotification('Failed to claim payout. Please try again.', 'error');
        }
    }

    async loadAdminEvents() {
        if (!this.isConnected) {
            document.getElementById('adminEventsContainer').innerHTML = '<div class="loading">Please connect your wallet to manage events.</div>';
            return;
        }

        try {
            // If events haven't been loaded yet, load them first.
            if (this.events.length === 0) {
                await this.loadEvents();
            }

            const adminEvents = this.events.filter(event =>
                event.creator.toLowerCase() === this.userAddress.toLowerCase()
            );

            await this.renderAdminEvents(adminEvents);
        } catch (error) {
            console.error('Failed to load admin events:', error);
            document.getElementById('adminEventsContainer').innerHTML = '<div class="loading">Failed to load your events.</div>';
        }
    }

    async renderAdminEvents(adminEvents) {
        const container = document.getElementById('adminEventsContainer');

        if (adminEvents.length === 0) {
            container.innerHTML = '<div class="loading">You haven\'t created any events yet.</div>';
            return;
        }

        // Get creator's current fee balance
        const creatorFeeBalance = await winCoinsContract.getCreatorFeeBalance();
        const hasCreatorFees = new Decimal(creatorFeeBalance).gt(0);

        let creatorFeeSection = '';
        if (hasCreatorFees) {
            creatorFeeSection = `
                <div class="creator-fee-summary">
                    <h3>💰 Creator Fee Balance</h3>
                    <div class="fee-balance-info">
                        <span class="balance-amount">${creatorFeeBalance} ETH</span>
                        <button class="btn btn-success" onclick="app.withdrawCreatorFees()">
                            Withdraw Fees
                        </button>
                    </div>
                </div>
            `;
        }

        const eventsHtml = adminEvents.map(event => {
            const canResolve = !event.isResolved && !event.isCancelled && !winCoinsContract.isEventOpen(event.predictionDeadline);
            const canCancel = !event.isResolved && !event.isCancelled;
            const isOpen = !event.isResolved && !event.isCancelled && winCoinsContract.isEventOpen(event.predictionDeadline);

            let statusText = 'Ready to Resolve';
            if (event.isCancelled) {
                statusText = 'Cancelled';
            } else if (event.isResolved) {
                statusText = 'Resolved';
            } else if (isOpen) {
                statusText = 'Open';
            }

            return `
                <div class="admin-event-card ${event.isCancelled ? 'cancelled' : ''}">
                    <div class="admin-event-header">
                        <div>
                            <h4>${event.name}</h4>
                            <p>Total Pool: ${event.totalPoolAmount} ETH</p>
                            <p>Status: ${statusText}</p>
                        </div>
                        ${canCancel ? `
                            <button class="btn btn-danger btn-small" onclick="app.cancelEvent(${event.id})">
                                Cancel Event
                            </button>
                        ` : ''}
                    </div>

                    ${canResolve ? `
                        <div class="resolve-section">
                            <h5>Select Winning Outcome</h5>
                            <div class="resolve-form">
                                <select id="winningOutcome${event.id}">
                                    ${event.outcomes.map((outcome, index) => `
                                        <option value="${index}">${outcome}</option>
                                    `).join('')}
                                </select>
                                <button class="btn btn-success btn-small" onclick="app.resolveEvent(${event.id})">
                                    Resolve Event
                                </button>
                            </div>
                        </div>
                    ` : ''}

                    <div class="outcomes-grid">
                        ${event.outcomes.map((outcome, index) => {
                            const isWinner = event.isResolved && event.winningOutcome === index;
                            return `
                                <div class="outcome-item ${isWinner ? 'winner' : ''}">
                                    <span>${outcome} ${isWinner ? '👑' : ''}</span>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = creatorFeeSection + eventsHtml;
    }

    async resolveEvent(eventId) {
        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first.', 'warning');
            return;
        }

        try {
            const winningOutcomeSelect = document.getElementById(`winningOutcome${eventId}`);
            const winningOutcome = parseInt(winningOutcomeSelect.value);

            this.showNotification('Resolving event... Please confirm the transaction.', 'info');

            const receipt = await winCoinsContract.resolveEvent(eventId, winningOutcome);

            // Check for PlatformFeeCollected event to get creator fee info
            const feeCollectedEvent = receipt.events.find(e => e.event === 'PlatformFeeCollected');

            let creatorFeeMessage = '';
            if (feeCollectedEvent) {
                const creatorFeeAmount = ethers.utils.formatEther(feeCollectedEvent.args.creatorFeeAmount);
                if (new Decimal(creatorFeeAmount).gt(0)) {
                    creatorFeeMessage = ` You earned ${creatorFeeAmount} ETH in creator fees! 💰`;
                }
            }

            this.showNotification(`Event resolved successfully!${creatorFeeMessage}`, 'success');

            // Show modal with detailed resolution results
            if (creatorFeeMessage) {
                this.showEventResolutionModal(eventId, winningOutcome, feeCollectedEvent);
            }

            // Refresh data.
            await this.loadEvents();
            await this.loadAdminEvents();
        } catch (error) {
            console.error('Failed to resolve event:', error);
            this.showNotification('Failed to resolve event. Please try again.', 'error');
        }
    }

    async cancelEvent(eventId) {
        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first.', 'warning');
            return;
        }

        // Confirm cancellation
        const confirmed = await this.showConfirmModal(
            'Cancel Event',
            'Are you sure you want to cancel this event? All participants will be able to claim refunds for their predictions.'
        );
        if (!confirmed) {
            return;
        }

        try {
            this.showNotification('Cancelling event... Please confirm the transaction.', 'info');

            await winCoinsContract.cancelEvent(eventId);

            this.showNotification('Event cancelled successfully! Participants can now claim refunds.', 'success');

            // Refresh data
            await this.loadEvents();
            await this.loadAdminEvents();
        } catch (error) {
            console.error('Failed to cancel event:', error);
            this.showNotification('Failed to cancel event. Please try again.', 'error');
        }
    }

    async showEventResolutionModal(eventId, winningOutcome, feeCollectedEvent) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        const modal = document.getElementById('eventModal');
        const modalContent = document.getElementById('modalContent');

        const platformFeeAmount = ethers.utils.formatEther(feeCollectedEvent.args.platformFeeAmount);
        const creatorFeeAmount = ethers.utils.formatEther(feeCollectedEvent.args.creatorFeeAmount);
        const totalFee = new Decimal(platformFeeAmount).add(new Decimal(creatorFeeAmount));

        // Get creator's total accumulated fees
        const creatorTotalBalance = await winCoinsContract.getCreatorFeeBalance();

        // Use current pool amount for display
        const displayPoolAmount = event.totalPoolAmount;

        modalContent.innerHTML = `
            <div class="modal-header">
                <h3>🎉 Event Resolved!</h3>
                <div class="event-meta">
                    <span class="event-status status-resolved">Resolved</span>
                </div>
            </div>

            <div class="modal-body">
                <div class="resolution-summary">
                    <h4>${event.name}</h4>
                    <div class="winning-outcome">
                        <span class="outcome-label">Winning Outcome:</span>
                        <span class="outcome-winner">${event.outcomes[winningOutcome]} 👑</span>
                    </div>
                    <div class="pool-summary">
                        <span class="pool-label">Total Pool:</span>
                        <span class="pool-amount">${displayPoolAmount} ETH</span>
                    </div>
                </div>

                <div class="fee-breakdown">
                    <h4>💰 Creator Fee Earned</h4>
                    <div class="fee-details">
                        <div class="fee-item">
                            <span class="fee-label">Your Creator Fee:</span>
                            <span class="fee-amount">${creatorFeeAmount} ETH</span>
                        </div>
                        <div class="fee-item secondary">
                            <span class="fee-label">Platform Fee:</span>
                            <span class="fee-amount">${platformFeeAmount} ETH</span>
                        </div>
                        <div class="fee-item total">
                            <span class="fee-label">Total Fee (0.1% of winnings):</span>
                            <span class="fee-amount">${totalFee.toFixed(6)} ETH</span>
                        </div>
                    </div>
                </div>

                <div class="creator-balance">
                    <div class="balance-info">
                        <span class="balance-label">Total Accumulated Creator Fees:</span>
                        <span class="balance-amount">${creatorTotalBalance} ETH</span>
                    </div>
                    ${new Decimal(creatorTotalBalance).gt(0) ? `
                        <button class="btn btn-success" onclick="app.withdrawCreatorFees()">
                            Withdraw All Creator Fees
                        </button>
                    ` : ''}
                </div>

                <div class="resolution-actions">
                    <button class="btn btn-primary" onclick="app.closeModal()">
                        Continue
                    </button>
                </div>
            </div>
        `;

        modal.classList.remove('hidden');
    }

    async withdrawCreatorFees() {
        if (!this.isConnected) {
            this.showNotification('Please connect your wallet first.', 'warning');
            return;
        }

        try {
            this.showNotification('Withdrawing creator fees... Please confirm the transaction.', 'info');

            await winCoinsContract.withdrawCreatorFees();

            this.showNotification('Creator fees withdrawn successfully!', 'success');

            // Update balance and close modal
            await this.updateBalance();
            this.closeModal();

        } catch (error) {
            console.error('Failed to withdraw creator fees:', error);
            this.showNotification('Failed to withdraw creator fees. Please try again.', 'error');
        }
    }

    calculateDisplayTotalPoolSync(event) {
        if (!event.isResolved) {
            // For unresolved events, show the current pool (no fees deducted yet)
            return event.totalPoolAmount;
        } else {
            // For resolved events, calculate original pool before fees were deducted
            // Use approximation since this is synchronous
            return this.calculateOriginalPoolAmount(event);
        }
    }

    async calculateDisplayTotalPool(event) {
        if (!event.isResolved) {
            // For unresolved events, show the current pool (no fees deducted yet)
            return event.totalPoolAmount;
        } else {
            // For resolved events, calculate original pool before fees were deducted
            return await this.calculateAccurateOriginalPool(event);
        }
    }

    async calculateAccurateOriginalPool(event) {
        if (!event.isResolved) {
            return event.totalPoolAmount;
        }

        try {
            // Get the winning pool amount as string to avoid floating point errors
            const winningPoolAmountStr = await winCoinsContract.getPoolAmount(event.id, event.winningOutcome);

            // Convert to wei (BigNumber) for precise calculation
            const currentTotalPoolWei = ethers.utils.parseEther(event.totalPoolAmount);
            const winningPoolWei = ethers.utils.parseEther(winningPoolAmountStr);

            // Simpler approach: reconstruct exactly what happened in the contract
            // Step 1: Start with current total (after fee deduction) + winning pool = "remaining funds"
            // Step 2: Calculate what the original winnings would have been to produce this result

            // Let's work backwards from the contract's perspective:
            // Before fee: originalTotal, winningPool
            // Winnings: originalWinnings = originalTotal - winningPool
            // Fee: totalFee = originalWinnings / 1000 (integer division)
            // After fee: currentTotal = originalTotal - totalFee

            // We know currentTotal and winningPool, need to find originalTotal
            // originalTotal = currentTotal + totalFee
            // totalFee = (originalTotal - winningPool) / 1000

            // Instead of solving algebraically, let's iterate to find the exact value
            // that would produce the current result when run through the contract logic

            let originalTotal = currentTotalPoolWei;

            // Add an approximation of the fee as starting point
            const approximateFee = currentTotalPoolWei.sub(winningPoolWei).div(1000);
            originalTotal = currentTotalPoolWei.add(approximateFee);

            // Now iterate to find exact value
            for (let i = 0; i < 10; i++) {
                const testWinnings = originalTotal.sub(winningPoolWei);
                const testFee = testWinnings.div(1000); // Integer division like contract
                const resultingTotal = originalTotal.sub(testFee);

                if (resultingTotal.eq(currentTotalPoolWei)) {
                    // Found exact match
                    return ethers.utils.formatEther(originalTotal);
                }

                // Adjust for next iteration
                const difference = currentTotalPoolWei.sub(resultingTotal);
                originalTotal = originalTotal.add(difference);
            }

            // If we didn't converge, return the last attempt
            return ethers.utils.formatEther(originalTotal);
        } catch (error) {
            console.error('Failed to calculate accurate original pool:', error);
            // Fall back to approximation
            return this.calculateOriginalPoolAmount(event);
        }
    }

    calculateOriginalPoolAmount(event) {
        if (!event.isResolved) {
            return event.totalPoolAmount;
        }

        try {
            // Use BigNumber arithmetic for precision even in approximation
            const currentTotalPoolWei = ethers.utils.parseEther(event.totalPoolAmount);

            // For approximation, assume most of the pool was profit (worst case for precision)
            // So fee ≈ 0.1% of current pool
            // original ≈ current / 0.999 = current * 1000 / 999
            const approximateOriginalPoolWei = currentTotalPoolWei.mul(1000).div(999);

            return ethers.utils.formatEther(approximateOriginalPoolWei);
        } catch (error) {
            console.error('Failed to calculate approximate original pool:', error);
            // Final fallback to current pool amount
            return event.totalPoolAmount;
        }
    }

    filterEvents() {
        this.renderEvents();
    }

    showNotification(message, type = 'info') {
        const notifications = document.getElementById('notifications');
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        notifications.appendChild(notification);

        // Auto remove after 5 seconds.
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);

        // Allow manual removal.
        notification.addEventListener('click', () => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        });
    }
}

// Initialize the application.
const app = new WinCoinsApp();