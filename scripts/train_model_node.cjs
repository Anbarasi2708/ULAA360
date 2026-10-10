const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'public', 'data');
const modelDir = path.join(__dirname, '..', 'models');

function parseTime(timeStr) {
  if (!timeStr) return 12;
  const parts = timeStr.split(':');
  return parseInt(parts[0], 10) || 12;
}

function trainNodeModel() {
  console.log("--- Training Fallback Node.js Demand Model ---");
  const demandFile = path.join(dataDir, 'historical_passenger_demand.csv');
  if (!fs.existsSync(demandFile)) {
    console.error("Dataset not found.");
    return;
  }
  
  const content = fs.readFileSync(demandFile, 'utf8').replace(/\r/g, '').trim().split('\n');
  const headers = content[0].split(',');
  
  let validRecords = [];
  
  // Parse rows
  for (let i = 1; i < content.length; i++) {
    const cols = content[i].split(',').map(c => c.replace(/"/g, ''));
    if (cols.length < headers.length) continue;
    
    const record = {};
    headers.forEach((h, idx) => record[h.trim()] = cols[idx]);
    
    const pax = parseInt(record.pax);
    if (!isNaN(pax)) {
      validRecords.push(record);
    }
  }
  
  console.log(`Loaded ${validRecords.length} valid records for training.`);
  
  // Calculate average demand by Festival Type and Time of Day (hour)
  // This is a grouped mean model (a form of decision tree/lookup regression)
  const model = {
    baseline: 0,
    event_multipliers: {},
    hour_multipliers: {},
    weather_multipliers: {}
  };
  
  let totalPax = 0;
  validRecords.forEach(r => totalPax += parseInt(r.pax));
  model.baseline = totalPax / validRecords.length;
  
  // Simple heuristic grouping
  const events = {};
  const hours = {};
  const weathers = {};
  
  validRecords.forEach(r => {
    const e = r.event_type;
    const h = parseTime(r.time_interval);
    const w = r.weather;
    const p = parseInt(r.pax);
    
    if(!events[e]) events[e] = { sum: 0, count: 0 };
    events[e].sum += p;
    events[e].count += 1;
    
    if(!hours[h]) hours[h] = { sum: 0, count: 0 };
    hours[h].sum += p;
    hours[h].count += 1;
    
    if(!weathers[w]) weathers[w] = { sum: 0, count: 0 };
    weathers[w].sum += p;
    weathers[w].count += 1;
  });
  
  for (const [e, data] of Object.entries(events)) {
    model.event_multipliers[e] = (data.sum / data.count) / model.baseline;
  }
  for (const [h, data] of Object.entries(hours)) {
    model.hour_multipliers[h] = (data.sum / data.count) / model.baseline;
  }
  for (const [w, data] of Object.entries(weathers)) {
    model.weather_multipliers[w] = (data.sum / data.count) / model.baseline;
  }
  
  // Evaluate Model (MAE)
  let maeSum = 0;
  validRecords.forEach(r => {
    const e = r.event_type;
    const h = parseTime(r.time_interval);
    const w = r.weather;
    
    const em = model.event_multipliers[e] || 1;
    const hm = model.hour_multipliers[h] || 1;
    const wm = model.weather_multipliers[w] || 1;
    
    // Prediction is baseline * multipliers
    const pred = model.baseline * em * hm * wm;
    maeSum += Math.abs(pred - parseInt(r.pax));
  });
  
  const mae = maeSum / validRecords.length;
  
  // Baseline MAE (predict mean)
  let baseMaeSum = 0;
  validRecords.forEach(r => {
    baseMaeSum += Math.abs(model.baseline - parseInt(r.pax));
  });
  const baseMae = baseMaeSum / validRecords.length;
  
  console.log(`Model Evaluation (Node.js Fallback):`);
  console.log(`Baseline MAE (Predict Mean): ${baseMae.toFixed(2)} pax`);
  console.log(`Trained Model MAE: ${mae.toFixed(2)} pax`);
  console.log(`Improvement: ${(baseMae - mae).toFixed(2)} pax`);
  
  if (!fs.existsSync(modelDir)) fs.mkdirSync(modelDir);
  const outPath = path.join(modelDir, 'demand_model_node.json');
  fs.writeFileSync(outPath, JSON.stringify(model, null, 2));
  
  console.log(`Model artifact successfully written to ${outPath}`);
}

trainNodeModel();
