const fs = require('fs');

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randomFloat = (min, max) => (Math.random() * (max - min) + min).toFixed(6);

const depots = [
    { id: 'TNSTC_CBE', name: 'Coimbatore Division', lat: 11.0168, lng: 76.9558, region: 'Coimbatore', contact: 'MGR_CBE', pass: 'CBE@360' },
    { id: 'TNSTC_MDU', name: 'Madurai Division', lat: 9.9252, lng: 78.1198, region: 'Madurai', contact: 'MGR_MDU', pass: 'MDU@360' },
    { id: 'TNSTC_KUM', name: 'Kumbakonam Division (Thiruvarur/Trichy)', lat: 10.9602, lng: 79.3845, region: 'Kumbakonam', contact: 'MGR_KUM', pass: 'KUM@360' },
    { id: 'TNSTC_SLM', name: 'Salem Division', lat: 11.6643, lng: 78.1460, region: 'Salem', contact: 'MGR_SLM', pass: 'SLM@360' },
    { id: 'TNSTC_VPM', name: 'Villupuram Division', lat: 11.9401, lng: 79.4861, region: 'Villupuram', contact: 'MGR_VPM', pass: 'VPM@360' },
    { id: 'TNSTC_TNV', name: 'Tirunelveli Division', lat: 8.7139, lng: 77.7567, region: 'Tirunelveli', contact: 'MGR_TNV', pass: 'TNV@360' }
];

const stops = [
    { id: 'STOP_TVR_MAIN', name: 'Thiruvarur Temple Stop', lat: 10.7712, lng: 79.6385, depot: 'TNSTC_KUM', cap: 5000 },
    { id: 'STOP_TVR_BUS', name: 'Thiruvarur Old Bus Stand', lat: 10.7680, lng: 79.6320, depot: 'TNSTC_KUM', cap: 2000 },
    { id: 'STOP_MDU_AZH', name: 'Alagar Kovil Stop', lat: 10.0768, lng: 78.2163, depot: 'TNSTC_MDU', cap: 8000 },
    { id: 'STOP_CBE_GND', name: 'Coimbatore Gandhipuram', lat: 11.0183, lng: 76.9650, depot: 'TNSTC_CBE', cap: 4000 },
    { id: 'STOP_SLM_NEW', name: 'Salem New Bus Stand', lat: 11.6683, lng: 78.1400, depot: 'TNSTC_SLM', cap: 3500 },
];

for(let i = 5; i <= 100; i++) {
    stops.push({
        id: `STOP_GEN_${i}`,
        name: `Local Stop ${i}`,
        lat: (10.0 + Math.random() * 2).toFixed(4),
        lng: (77.0 + Math.random() * 3).toFixed(4),
        depot: randomChoice(depots).id,
        cap: randomInt(100, 500)
    });
}

const buses = [];
const ticketing = [];

for(let i = 1; i <= 2500; i++) {
    // Generate TN series bus numbers e.g., TN-49-N-1234
    const rto = randomChoice(['38', '45', '49', '55', '67', '72', '74']);
    const busId = `TN-${rto}-N-${String(i).padStart(4, '0')}`;
    const capacity = randomChoice([40, 50, 60]);
    const occupancy = randomInt(0, capacity + 15); // Some are overcrowded
    
    buses.push({
        id: busId,
        depot: randomChoice(depots).id,
        cap: capacity,
        status: randomChoice(['IN_TRANSIT', 'AVAILABLE', 'MAINTENANCE']),
        current_stop: randomChoice(stops).id,
        next_departure: '2026-10-18T10:00:00',
        available_from: '2026-10-18T10:00:00',
        service_type: randomChoice(['ORDINARY', 'EXPRESS', 'LSS', 'SPARE_FESTIVAL'])
    });

    ticketing.push({
        ticket_tx_id: `TXN_${i}`,
        bus_id: busId,
        timestamp: new Date().toISOString(),
        total_capacity: capacity,
        current_occupancy: occupancy,
        crowd_status: occupancy > capacity ? 'OVERCROWDED' : (occupancy > capacity * 0.8 ? 'HIGH' : 'NORMAL')
    });
}

// Write CSVs
const toCSV = (arr, keys) => [keys.join(',')].concat(arr.map(row => keys.map(k => `"${row[k]}"`).join(','))).join('\n');

fs.mkdirSync('./public/data', { recursive: true });

fs.writeFileSync('./public/data/divisional_depots.csv', toCSV(depots, Object.keys(depots[0])));
fs.writeFileSync('./public/data/stops.csv', toCSV(stops, Object.keys(stops[0])));
fs.writeFileSync('./public/data/buses.csv', toCSV(buses, Object.keys(buses[0])));
fs.writeFileSync('./public/data/ticketing_machine.csv', toCSV(ticketing, Object.keys(ticketing[0])));

console.log('Datasets including Ticketing Machine generated successfully.');
