// ============================================
// GOOGLE APPS SCRIPT - CLAWS GAME BACKEND
// For existing sheet with columns: Wallet, Wins, Claimable, TotalEarned, LastPlayed, Paid
// ============================================
// 
// SETUP:
// 1. Open your existing Google Sheet
// 2. Go to Extensions → Apps Script
// 3. Delete any existing code and paste this
// 4. Click Deploy → New deployment → Web app
// 5. Execute as: Me, Who has access: Anyone
// 6. Copy the URL and paste into pay-to-play.js and admin.js
//
// ============================================

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const params = e.parameter;
  const action = params.action;
  
  let result;
  
  try {
    switch(action) {
      case 'addClaim':
        result = addClaim(params.wallet, params.amount);
        break;
      case 'recordWin':
        result = recordWin(params.wallet, params.reward);
        break;
      case 'getData':
        result = getAllData();
        break;
      case 'markPaid':
        result = markPaid(params.row);
        break;
      case 'getStats':
        result = getStats();
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }
  } catch(error) {
    result = { success: false, error: error.toString() };
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// Get the first sheet (your data sheet)
function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

// Find row by wallet address
function findWalletRow(wallet) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) { // Skip header
    if (data[i][0] === wallet) {
      return i + 1; // 1-indexed for sheet
    }
  }
  return -1;
}

// Record a win - update or create player row
function recordWin(wallet, reward) {
  const sheet = getSheet();
  const row = findWalletRow(wallet);
  const rewardNum = parseInt(reward) || 0;
  const now = new Date().toLocaleString();
  
  if (row > 0) {
    // Update existing player
    const wins = sheet.getRange(row, 2).getValue() + 1;
    const claimable = sheet.getRange(row, 3).getValue() + rewardNum;
    const totalEarned = sheet.getRange(row, 4).getValue() + rewardNum;
    
    sheet.getRange(row, 2).setValue(wins);
    sheet.getRange(row, 3).setValue(claimable);
    sheet.getRange(row, 4).setValue(totalEarned);
    sheet.getRange(row, 5).setValue(now);
  } else {
    // Add new player
    sheet.appendRow([wallet, 1, rewardNum, rewardNum, now, 'No']);
  }
  
  return { success: true };
}

// Add a claim request (reset claimable, mark as pending)
function addClaim(wallet, amount) {
  const sheet = getSheet();
  const row = findWalletRow(wallet);
  
  if (row > 0) {
    // Reset claimable to 0, mark as pending
    sheet.getRange(row, 3).setValue(0);
    sheet.getRange(row, 6).setValue('Pending: ' + amount);
    return { success: true, message: 'Claim submitted' };
  }
  
  return { success: false, error: 'Wallet not found' };
}

// Mark a claim as paid
function markPaid(row) {
  const sheet = getSheet();
  const rowNum = parseInt(row);
  
  sheet.getRange(rowNum, 6).setValue('Yes');
  
  return { success: true };
}

// Get all data for admin panel
function getAllData() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, players: [] };
  }
  
  const players = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // Has wallet
      players.push({
        row: i + 1,
        wallet: data[i][0],
        wins: data[i][1] || 0,
        claimable: data[i][2] || 0,
        totalEarned: data[i][3] || 0,
        lastPlayed: data[i][4] || '',
        paid: data[i][5] || 'No'
      });
    }
  }
  
  return { success: true, players: players };
}

// Get stats for admin panel
function getStats() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  let totalPlayers = 0;
  let totalWins = 0;
  let totalClaimable = 0;
  let totalEarned = 0;
  let pendingClaims = 0;
  let paidClaims = 0;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      totalPlayers++;
      totalWins += data[i][1] || 0;
      totalClaimable += data[i][2] || 0;
      totalEarned += data[i][3] || 0;
      
      const paidStatus = String(data[i][5] || '');
      if (paidStatus.startsWith('Pending')) {
        pendingClaims++;
      } else if (paidStatus === 'Yes') {
        paidClaims++;
      }
    }
  }
  
  return {
    success: true,
    stats: {
      totalPlayers,
      totalWins,
      totalClaimable,
      totalEarned,
      pendingClaims,
      paidClaims
    }
  };
}