const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const demandFile = path.join(dataDir, 'historical_passenger_demand.csv');

function validateDemandData() {
  console.log("--- Data Validation Report: historical_passenger_demand.csv ---");
  if (!fs.existsSync(demandFile)) {
    console.error("Error: historical_passenger_demand.csv not found.");
    return;
  }

  const content = fs.readFileSync(demandFile, 'utf8').replace(/\r/g, '').trim().split('\n');
  const headers = content[0].split(',');
  console.log(`Schema: ${headers.join(', ')}`);
  
  let validRows = 0;
  let missingValues = 0;
  let invalidServed = 0;
  let duplicateRows = 0;
  
  const rowHashes = new Set();

  for (let i = 1; i < content.length; i++) {
    const cols = content[i].split(',').map(c => c.replace(/"/g, ''));
    if (cols.length !== headers.length) {
      missingValues++;
      continue;
    }
    
    // Check for missing values
    if (cols.some(c => c.trim() === '')) {
      missingValues++;
    }

    const pax = parseInt(cols[7]);
    const served = parseInt(cols[9]);
    
    if (isNaN(pax) || isNaN(served)) {
      missingValues++;
      continue;
    }
    
    if (served > pax) {
      invalidServed++;
    }
    
    const rowStr = content[i].trim();
    if (rowHashes.has(rowStr)) {
      duplicateRows++;
    } else {
      rowHashes.add(rowStr);
      validRows++;
    }
  }

  console.log(`Total Rows Analyzed: ${content.length - 1}`);
  console.log(`Valid Rows: ${validRows}`);
  console.log(`Rows with Missing/Malformed Values: ${missingValues}`);
  console.log(`Rows where Served > Demand: ${invalidServed}`);
  console.log(`Duplicate Rows: ${duplicateRows}`);
  
  if (invalidServed > 0) {
    console.warn("WARNING: 'served' cannot exceed 'pax' (demand). These rows should be excluded from ML training or capped.");
  }
}

validateDemandData();
