// ============================================
// GOOGLE APPS SCRIPT - CLAWS GAME BACKEND (FIXED)
// ============================================
// 
// IMPORTANT: After pasting this, you MUST:
// 1. Click Deploy → Manage deployments
// 2. Click the pencil icon (edit)
// 3. Change "Version" to "New version"
// 4. Click Deploy
//
// ============================================

function doGet(e) {
  const result = handleRequest(e);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const result = handleRequest(e);
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleRequest(e) {
  const params = e.parameter || {};
  const action = params.action || '';
  
  try {
    switch(action) {
      case 'addClaim':
        return addClaim(params.wallet, params.amount);
      case 'recordWin':
        return recordWin(params.wallet, params.reward);
      case 'getData':
        return getAllData();
      case 'markPaid':
        return markPaid(params.row);
      case 'getStats':
        return getStats();
      case 'test':
        return { success: true, message: 'API is working!' };
      default:
        return { success: false, error: 'Unknown action: ' + action };
    }
  } catch(error) {
    return { success: false, error: error.toString() };
  }
}

function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
}

function findWalletRow(wallet) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === String(wallet).trim()) {
      return i + 1;
    }
  }
  return -1;
}

function recordWin(wallet, reward) {
  if (!wallet) return { success: false, error: 'No wallet provided' };
  
  const sheet = getSheet();
  const row = findWalletRow(wallet);
  const rewardNum = parseInt(reward) || 0;
  const now = new Date().toLocaleString();
  
  if (row > 0) {
    const wins = (sheet.getRange(row, 2).getValue() || 0) + 1;
    const claimable = (sheet.getRange(row, 3).getValue() || 0) + rewardNum;
    const totalEarned = (sheet.getRange(row, 4).getValue() || 0) + rewardNum;
    
    sheet.getRange(row, 2).setValue(wins);
    sheet.getRange(row, 3).setValue(claimable);
    sheet.getRange(row, 4).setValue(totalEarned);
    sheet.getRange(row, 5).setValue(now);
    
    return { success: true, message: 'Win recorded', wins: wins, claimable: claimable };
  } else {
    sheet.appendRow([wallet, 1, rewardNum, rewardNum, now, 'No']);
    return { success: true, message: 'New player added', wins: 1, claimable: rewardNum };
  }
}

function addClaim(wallet, amount) {
  if (!wallet) return { success: false, error: 'No wallet provided' };
  
  const sheet = getSheet();
  const row = findWalletRow(wallet);
  
  if (row > 0) {
    sheet.getRange(row, 3).setValue(0);
    sheet.getRange(row, 6).setValue('Pending: ' + amount);
    return { success: true, message: 'Claim submitted for ' + amount };
  }
  
  return { success: false, error: 'Wallet not found in database' };
}

function markPaid(row) {
  if (!row) return { success: false, error: 'No row provided' };
  
  const sheet = getSheet();
  const rowNum = parseInt(row);
  
  sheet.getRange(rowNum, 6).setValue('Yes');
  
  return { success: true, message: 'Marked as paid' };
}

function getAllData() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) {
    return { success: true, players: [] };
  }
  
  const players = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      players.push({
        row: i + 1,
        wallet: String(data[i][0]),
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
      totalWins += parseInt(data[i][1]) || 0;
      totalClaimable += parseInt(data[i][2]) || 0;
      totalEarned += parseInt(data[i][3]) || 0;
      
      const paidStatus = String(data[i][5] || '');
      if (paidStatus.indexOf('Pending') >= 0) {
        pendingClaims++;
      } else if (paidStatus === 'Yes') {
        paidClaims++;
      }
    }
  }
  
  return {
    success: true,
    stats: {
      totalPlayers: totalPlayers,
      totalWins: totalWins,
      totalClaimable: totalClaimable,
      totalEarned: totalEarned,
      pendingClaims: pendingClaims,
      paidClaims: paidClaims
    }
  };
}

// Test function - run this in Apps Script to verify it works
function testAPI() {
  Logger.log(getAllData());
  Logger.log(getStats());
}