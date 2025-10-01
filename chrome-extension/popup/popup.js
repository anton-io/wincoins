document.addEventListener('DOMContentLoaded', async () => {
  await updateStatus();
  await loadSavedAddress();
  
  document.getElementById('refresh-btn').addEventListener('click', updateStatus);
  document.getElementById('save-address-btn').addEventListener('click', saveContractAddress);
});

async function updateStatus() {
  try {
    // Get contract address
    const contractResponse = await chrome.runtime.sendMessage({ type: 'GET_CONTRACT_ADDRESS' });
    if (contractResponse && contractResponse.contractAddress) {
      document.getElementById('contract-address').value = contractResponse.contractAddress;
      document.getElementById('connection-status').textContent = 'Connected';
      document.getElementById('connection-status').className = 'status-value connected';
    } else {
      document.getElementById('connection-status').textContent = 'Disconnected';
      document.getElementById('connection-status').className = 'status-value disconnected';
    }
    
    // Get active events
    const eventsResponse = await chrome.runtime.sendMessage({ type: 'GET_ACTIVE_EVENTS' });
    if (eventsResponse && eventsResponse.events) {
      const count = eventsResponse.events.length;
      document.getElementById('active-events').textContent = `${count} active event${count !== 1 ? 's' : ''}`;
    } else {
      document.getElementById('active-events').textContent = '0 active events';
    }
    
  } catch (error) {
    console.error('Error updating status:', error);
    document.getElementById('connection-status').textContent = 'Error';
    document.getElementById('connection-status').className = 'status-value disconnected';
    document.getElementById('active-events').textContent = 'Error loading';
  }
}

async function loadSavedAddress() {
  try {
    const result = await chrome.storage.sync.get(['contractAddress']);
    if (result.contractAddress) {
      document.getElementById('contract-address').value = result.contractAddress;
    }
  } catch (error) {
    console.error('Error loading saved address:', error);
  }
}

async function saveContractAddress() {
  try {
    const addressInput = document.getElementById('contract-address');
    const address = addressInput.value.trim();
    
    // Basic validation
    if (!address) {
      alert('Please enter a contract address');
      return;
    }
    
    if (!address.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid Ethereum address (0x followed by 40 hex characters)');
      return;
    }
    
    // Save to storage
    await chrome.storage.sync.set({ contractAddress: address });
    
    // Notify background script of the change
    await chrome.runtime.sendMessage({ 
      type: 'CONTRACT_ADDRESS_UPDATED', 
      address: address 
    });
    
    // Update UI to show success
    const saveBtn = document.getElementById('save-address-btn');
    const originalText = saveBtn.textContent;
    saveBtn.textContent = '✅ Saved!';
    saveBtn.style.background = '#10b981';
    
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.style.background = '#9147ff';
    }, 2000);
    
    // Refresh status
    await updateStatus();
    
  } catch (error) {
    console.error('Error saving contract address:', error);
    alert('Error saving contract address: ' + error.message);
  }
}