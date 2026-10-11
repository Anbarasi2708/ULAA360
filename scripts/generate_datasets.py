"""
Ulaa360 Data Generator
Generates 10 realistic Tamil Nadu transit and festival datasets (minimum 2000 rows each)
Primary Festivals:
1. Thiruvarur Ther Thiruvizha (Oct 18-19)
2. Madurai Azhagar Thiruvizha (Oct 30-31)
"""

import csv
import os
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

random.seed(42)

# --- 1. CORE REGIONAL HUBS AND DEPOTS ---
DEPOTS = [
    # Madurai Region (TNSTC-Madurai)
    {"id": "DEP_MDU_01", "name": "Madurai Central Periyar Depot", "lat": 9.9178, "lon": 78.1143, "region": "Madurai", "contact": "+91-452-2342001"},
    {"id": "DEP_MDU_02", "name": "Mattuthavani Integrated Depot", "lat": 9.9472, "lon": 78.1569, "region": "Madurai", "contact": "+91-452-2342002"},
    {"id": "DEP_MDU_03", "name": "Goripalayam North Depot", "lat": 9.9287, "lon": 78.1310, "region": "Madurai", "contact": "+91-452-2342003"},
    {"id": "DEP_MDU_04", "name": "Alagar Kovil Road Depot", "lat": 9.9925, "lon": 78.1892, "region": "Madurai", "contact": "+91-452-2342004"},
    {"id": "DEP_MDU_05", "name": "Melur Sub-Divisional Depot", "lat": 10.0489, "lon": 78.3370, "region": "Madurai Rural", "contact": "+91-452-2342005"},
    {"id": "DEP_MDU_06", "name": "Tirumangalam Depot", "lat": 9.8242, "lon": 77.9890, "region": "Madurai South", "contact": "+91-452-2342006"},
    {"id": "DEP_MDU_07", "name": "Usilampatti Depot", "lat": 9.9678, "lon": 77.7950, "region": "Madurai West", "contact": "+91-452-2342007"},
    {"id": "DEP_DGL_01", "name": "Dindigul Bypass Depot", "lat": 10.3673, "lon": 77.9803, "region": "Dindigul", "contact": "+91-451-2421001"},
    {"id": "DEP_VNR_01", "name": "Virudhunagar Town Depot", "lat": 9.5872, "lon": 77.9514, "region": "Virudhunagar", "contact": "+91-4562-243001"},
    {"id": "DEP_SVG_01", "name": "Sivagangai Depot", "lat": 9.8433, "lon": 78.4809, "region": "Sivagangai", "contact": "+91-4575-241001"},

    # Thiruvarur / Delta Region (TNSTC-Kumbakonam)
    {"id": "DEP_TVR_01", "name": "Thiruvarur Central Depot", "lat": 10.7725, "lon": 79.6365, "region": "Thiruvarur", "contact": "+91-4366-222001"},
    {"id": "DEP_TVR_02", "name": "Thiruvarur Therady Feeder Depot", "lat": 10.7758, "lon": 79.6320, "region": "Thiruvarur", "contact": "+91-4366-222002"},
    {"id": "DEP_MNG_01", "name": "Mannargudi Division Depot", "lat": 10.6653, "lon": 79.4447, "region": "Thiruvarur South", "contact": "+91-4367-251001"},
    {"id": "DEP_NGP_01", "name": "Nagapattinam Port Depot", "lat": 10.7672, "lon": 79.8449, "region": "Nagapattinam", "contact": "+91-4365-244001"},
    {"id": "DEP_KUM_01", "name": "Kumbakonam Town Central Depot", "lat": 10.9602, "lon": 79.3845, "region": "Thanjavur North", "contact": "+91-435-2401001"},
    {"id": "DEP_TNJ_01", "name": "Thanjavur Old Bus Stand Depot", "lat": 10.7870, "lon": 79.1378, "region": "Thanjavur", "contact": "+91-4362-230001"},
    {"id": "DEP_MYL_01", "name": "Mayiladuthurai Junction Depot", "lat": 11.1018, "lon": 79.6522, "region": "Mayiladuthurai", "contact": "+91-4364-228001"},
    {"id": "DEP_TRY_01", "name": "Tiruchirappalli Central Cantt Depot", "lat": 10.8050, "lon": 78.6856, "region": "Trichy", "contact": "+91-431-2460001"},
    {"id": "DEP_PDK_01", "name": "Pudukkottai Central Depot", "lat": 10.3797, "lon": 78.8208, "region": "Pudukkottai", "contact": "+91-4322-221001"},
    {"id": "DEP_KKL_01", "name": "Karaikal Depot", "lat": 10.9254, "lon": 79.8380, "region": "Karaikal/Nagai", "contact": "+91-4368-223001"},
]

# Generate 2,050 Depots expanding across Tamil Nadu (Clusters and Taluks)
depot_rows = []
for i in range(1, 2051):
    base = DEPOTS[(i - 1) % len(DEPOTS)]
    div_id = f"DEP_TN_{i:04d}" if i > len(DEPOTS) else base["id"]
    jitter_lat = base["lat"] + round(random.uniform(-0.15, 0.15), 5)
    jitter_lon = base["lon"] + round(random.uniform(-0.15, 0.15), 5)
    sub_branch = f"Unit-{((i-1)//20)+1}"
    name = f"{base['name']} - {sub_branch}" if i > len(DEPOTS) else base["name"]
    depot_rows.append({
        "divisional_depot_id": div_id,
        "depot_name": name,
        "latitude": jitter_lat,
        "longitude": jitter_lon,
        "region": base["region"],
        "contact_reference": f"+91-44-{28000000 + i}" if i > len(DEPOTS) else base["contact"]
    })

with open(os.path.join(DATA_DIR, "divisional_depots.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["divisional_depot_id", "depot_name", "latitude", "longitude", "region", "contact_reference"])
    writer.writeheader()
    writer.writerows(depot_rows)
print(f"divisional_depots.csv: {len(depot_rows)} rows created.")

# --- 2. STOPS DATASET ---
CORE_STOPS = [
    # Madurai Region
    {"id": "STOP_MDU_MAIN", "name": "Mattuthavani Main Terminus (MIBT)", "lat": 9.9481, "lon": 78.1561, "depot": "DEP_MDU_02", "cap": 1600},
    {"id": "STOP_MDU_PERIYAR", "name": "Periyar Bus Stand South", "lat": 9.9172, "lon": 78.1139, "depot": "DEP_MDU_01", "cap": 1400},
    {"id": "STOP_MDU_GORI", "name": "Goripalayam Vaigai Bank Stop", "lat": 9.9295, "lon": 78.1305, "depot": "DEP_MDU_03", "cap": 800},
    {"id": "STOP_MDU_ALAGAR", "name": "Alagar Kovil Hill Shrine Foot", "lat": 10.0760, "lon": 78.2140, "depot": "DEP_MDU_04", "cap": 1200},
    {"id": "STOP_MDU_SIMMA", "name": "Simmakkal North Junction Stop", "lat": 9.9260, "lon": 78.1220, "depot": "DEP_MDU_03", "cap": 600},
    {"id": "STOP_MDU_ARAP", "name": "Arapalayam Moffusil Stand", "lat": 9.9360, "lon": 78.1060, "depot": "DEP_MDU_01", "cap": 1100},
    {"id": "STOP_MDU_OUTER2K", "name": "Madurai Ring Road By-Pass Stop (2km East)", "lat": 9.9405, "lon": 78.1750, "depot": "DEP_MDU_02", "cap": 900},
    {"id": "STOP_MELUR_CENTRAL", "name": "Melur Bus Terminal", "lat": 10.0512, "lon": 78.3361, "depot": "DEP_MDU_05", "cap": 750},
    {"id": "STOP_TMG_CENTRAL", "name": "Tirumangalam Old Stand", "lat": 9.8230, "lon": 77.9880, "depot": "DEP_MDU_06", "cap": 650},
    {"id": "STOP_DGL_MAIN", "name": "Dindigul Kamarajar Bus Terminal", "lat": 10.3685, "lon": 77.9810, "depot": "DEP_DGL_01", "cap": 1500},

    # Thiruvarur Region
    {"id": "STOP_TVR_CENTRAL", "name": "Thiruvarur Central Municipal Bus Stand", "lat": 10.7730, "lon": 79.6370, "depot": "DEP_TVR_01", "cap": 1200},
    {"id": "STOP_TVR_THERADY", "name": "Therady Chariot Grounds East Gate", "lat": 10.7765, "lon": 79.6328, "depot": "DEP_TVR_02", "cap": 950},
    {"id": "STOP_TVR_RLY", "name": "Thiruvarur Junction Railway Feeder Stop", "lat": 10.7705, "lon": 79.6410, "depot": "DEP_TVR_01", "cap": 700},
    {"id": "STOP_TVR_OUTER2K", "name": "Vilamal Outer Bypass Stand (2km North)", "lat": 10.7910, "lon": 79.6250, "depot": "DEP_TVR_02", "cap": 850},
    {"id": "STOP_MNG_MAIN", "name": "Mannargudi Rajagopalaswamy Temple Stand", "lat": 10.6660, "lon": 79.4450, "depot": "DEP_MNG_01", "cap": 800},
    {"id": "STOP_NGP_MAIN", "name": "Nagapattinam New Bus Stand", "lat": 10.7680, "lon": 79.8440, "depot": "DEP_NGP_01", "cap": 1000},
    {"id": "STOP_KUM_MAIN", "name": "Kumbakonam Central Bus Stand", "lat": 10.9610, "lon": 79.3850, "depot": "DEP_KUM_01", "cap": 1400},
    {"id": "STOP_TNJ_NEW", "name": "Thanjavur New Bus Stand", "lat": 10.7630, "lon": 79.1180, "depot": "DEP_TNJ_01", "cap": 1800},
    {"id": "STOP_MYL_MAIN", "name": "Mayiladuthurai Old Bus Stand", "lat": 11.1025, "lon": 79.6530, "depot": "DEP_MYL_01", "cap": 900},
    {"id": "STOP_KKL_MAIN", "name": "Karaikal Municipal Bus Terminal", "lat": 10.9260, "lon": 79.8390, "depot": "DEP_KKL_01", "cap": 850},
]

stop_rows = []
for i in range(1, 2101):
    base = CORE_STOPS[(i - 1) % len(CORE_STOPS)]
    stop_id = base["id"] if i <= len(CORE_STOPS) else f"STOP_TN_{i:04d}"
    depot_assigned = depot_rows[(i - 1) % len(depot_rows)]["divisional_depot_id"] if i > len(CORE_STOPS) else base["depot"]
    j_lat = base["lat"] + round(random.uniform(-0.18, 0.18), 5)
    j_lon = base["lon"] + round(random.uniform(-0.18, 0.18), 5)
    name = base["name"] if i <= len(CORE_STOPS) else f"{base['name']} - Stop Sector {i}"
    cap = base["cap"] if i <= len(CORE_STOPS) else random.randint(300, 1600)
    stop_rows.append({
        "stop_id": stop_id,
        "stop_name": name,
        "latitude": j_lat,
        "longitude": j_lon,
        "divisional_depot_id": depot_assigned,
        "safe_waiting_capacity": cap
    })

with open(os.path.join(DATA_DIR, "stops.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["stop_id", "stop_name", "latitude", "longitude", "divisional_depot_id", "safe_waiting_capacity"])
    writer.writeheader()
    writer.writerows(stop_rows)
print(f"stops.csv: {len(stop_rows)} rows created.")

# --- 3. BUSES DATASET ---
STATUS_TYPES = ["Idle_Available", "On_Trip", "Scheduled_LowDemand", "Maintenance", "Standby_Special"]
SERVICE_TYPES = ["Town_Ordinary", "Deluxe_Express", "Ultra_Deluxe", "Moffusil_Standard", "Festival_Special_Shuttle"]

bus_rows = []
for i in range(1, 2151):
    bus_id = f"TN-{'58' if i % 2 == 0 else '49'}-N-{1000 + i:04d}"
    depot_id = depot_rows[i % len(depot_rows)]["divisional_depot_id"]
    current_stop = stop_rows[(i * 7) % len(stop_rows)]["stop_id"]
    cap = random.choice([48, 52, 55, 60, 65])
    status = random.choices(STATUS_TYPES, weights=[0.28, 0.40, 0.22, 0.05, 0.05])[0]
    srv_type = random.choice(SERVICE_TYPES)
    
    # Random committed and available times around festival dates
    now_ref = datetime(2026, 10, 18, 8, 0) + timedelta(hours=(i % 168))
    next_dep = (now_ref + timedelta(hours=random.randint(1, 6))).strftime("%Y-%m-%d %H:%M") if status != "Idle_Available" else "NONE"
    avail_from = now_ref.strftime("%Y-%m-%d %H:%M") if status == "Idle_Available" else (now_ref + timedelta(hours=random.randint(2, 5))).strftime("%Y-%m-%d %H:%M")
    
    bus_rows.append({
        "bus_id": bus_id,
        "divisional_depot_id": depot_id,
        "capacity": cap,
        "current_status": status,
        "current_stop_id": current_stop,
        "next_committed_departure": next_dep,
        "available_from": avail_from,
        "service_type": srv_type
    })

with open(os.path.join(DATA_DIR, "buses.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["bus_id", "divisional_depot_id", "capacity", "current_status", "current_stop_id", "next_committed_departure", "available_from", "service_type"])
    writer.writeheader()
    writer.writerows(bus_rows)
print(f"buses.csv: {len(bus_rows)} rows created.")

# --- 4. FESTIVAL EVENTS DATASET ---
festival_list = [
    # Primary 1: Thiruvarur Ther Thiruvizha
    {
        "event_id": "EVT_TVR_THER_2026",
        "event_name": "Thiruvarur Azhi Ther Thiruvizha (Grand Chariot Festival)",
        "event_type": "Ther Thiruvizha",
        "festival_destination_stop_id": "STOP_TVR_THERADY",
        "start_datetime": "2026-10-18 06:00:00",
        "programme_end_datetime": "2026-10-19 20:30:00",
        "expected_attendance": 85000,
        "expected_departure_window_start": "2026-10-19 20:30:00",
        "expected_departure_window_end": "2026-10-19 23:30:00"
    },
    # Primary 2: Madurai Azhagar Thiruvizha
    {
        "event_id": "EVT_MDU_AZHAGAR_2026",
        "event_name": "Madurai Sri Kallazhagar Vaigai Aatril Ezhuntharulal (Azhagar Thiruvizha)",
        "event_type": "Oor Thiruvizha",
        "festival_destination_stop_id": "STOP_MDU_GORI",
        "start_datetime": "2026-10-30 04:30:00",
        "programme_end_datetime": "2026-10-31 21:00:00",
        "expected_attendance": 120000,
        "expected_departure_window_start": "2026-10-31 21:00:00",
        "expected_departure_window_end": "2026-10-31 23:45:00"
    },
    # Secondary and historical regional fairs
    {
        "event_id": "EVT_MDU_CHITHIRAI_HIST",
        "event_name": "Madurai Meenakshi Amman Thirukalyanam & Chithirai Ther",
        "event_type": "Ther Thiruvizha",
        "festival_destination_stop_id": "STOP_MDU_PERIYAR",
        "start_datetime": "2025-05-02 06:00:00",
        "programme_end_datetime": "2025-05-03 21:30:00",
        "expected_attendance": 95000,
        "expected_departure_window_start": "2025-05-03 21:30:00",
        "expected_departure_window_end": "2025-05-03 23:59:00"
    },
    {
        "event_id": "EVT_TVR_PANGUNI_HIST",
        "event_name": "Thiruvarur Panguni Uthiram Float Festival (Theppathiruvizha)",
        "event_type": "Theppa Thiruvizha",
        "festival_destination_stop_id": "STOP_TVR_CENTRAL",
        "start_datetime": "2025-03-24 07:00:00",
        "programme_end_datetime": "2025-03-25 22:00:00",
        "expected_attendance": 50000,
        "expected_departure_window_start": "2025-03-25 22:00:00",
        "expected_departure_window_end": "2025-03-26 01:00:00"
    },
    {
        "event_id": "EVT_MNG_PANGUNI_HIST",
        "event_name": "Mannargudi Rajagopalaswamy Therottam",
        "event_type": "Ther Thiruvizha",
        "festival_destination_stop_id": "STOP_MNG_MAIN",
        "start_datetime": "2025-04-10 06:00:00",
        "programme_end_datetime": "2025-04-11 20:00:00",
        "expected_attendance": 42000,
        "expected_departure_window_start": "2025-04-11 20:00:00",
        "expected_departure_window_end": "2025-04-11 23:00:00"
    },
    {
        "event_id": "EVT_KUM_MAHAMAHAM_ANNUAL",
        "event_name": "Kumbakonam Mahamaham Tank Theerthavari",
        "event_type": "Theerthavari Thiruvizha",
        "festival_destination_stop_id": "STOP_KUM_MAIN",
        "start_datetime": "2025-02-18 05:00:00",
        "programme_end_datetime": "2025-02-18 21:00:00",
        "expected_attendance": 65000,
        "expected_departure_window_start": "2025-02-18 21:00:00",
        "expected_departure_window_end": "2025-02-18 23:45:00"
    }
]

event_rows = list(festival_list)
# Expand to 2050 events across TN temple calendars (historical 2021-2026)
for i in range(len(festival_list) + 1, 2051):
    base = festival_list[(i - 1) % len(festival_list)]
    year = 2021 + (i % 6)
    month = 1 + (i % 12)
    day = 1 + (i % 27)
    start_dt = datetime(year, month, day, 6, 0)
    end_dt = start_dt + timedelta(hours=random.choice([14, 16, 22, 28, 36]))
    dep_start = end_dt
    dep_end = dep_start + timedelta(hours=random.choice([2, 3, 4]))
    ev_type = random.choice(["Ther Thiruvizha", "Oor Thiruvizha", "Theppa Thiruvizha", "Theerthavari Thiruvizha", "Sandhanakoodu Urus", "Annual Peruvizha"])
    dest_stop = stop_rows[(i * 3) % len(stop_rows)]["stop_id"]
    
    event_rows.append({
        "event_id": f"EVT_TN_GEN_{i:04d}",
        "event_name": f"{base['event_name']} - Annual Observance {year}",
        "event_type": ev_type,
        "festival_destination_stop_id": dest_stop,
        "start_datetime": start_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "programme_end_datetime": end_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "expected_attendance": random.randint(15000, 110000),
        "expected_departure_window_start": dep_start.strftime("%Y-%m-%d %H:%M:%S"),
        "expected_departure_window_end": dep_end.strftime("%Y-%m-%d %H:%M:%S")
    })

with open(os.path.join(DATA_DIR, "festival_events.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "event_id", "event_name", "event_type", "festival_destination_stop_id",
        "start_datetime", "programme_end_datetime", "expected_attendance",
        "expected_departure_window_start", "expected_departure_window_end"
    ])
    writer.writeheader()
    writer.writerows(event_rows)
print(f"festival_events.csv: {len(event_rows)} rows created.")

# --- 5. TRAVEL TIMES MATRIX ---
travel_rows = []
for i in range(1, 2151):
    f_idx = (i * 3) % len(stop_rows)
    t_idx = (i * 7 + 1) % len(stop_rows)
    if f_idx == t_idx:
        t_idx = (t_idx + 1) % len(stop_rows)
    from_id = stop_rows[f_idx]["stop_id"]
    to_id = stop_rows[t_idx]["stop_id"]
    dist = round(random.uniform(2.5, 45.0), 2)
    # realistic TN traffic speed: 20-35 km/h
    mins = int((dist / random.uniform(18.0, 32.0)) * 60) + random.randint(3, 15)
    status = random.choices(["Normal", "Heavy_Festival_Traffic", "Diversion", "Cleared"], weights=[0.60, 0.25, 0.10, 0.05])[0]
    updated = (datetime(2026, 10, 18, 12, 0) + timedelta(minutes=i % 1440)).strftime("%Y-%m-%d %H:%M")
    
    travel_rows.append({
        "from_stop_id": from_id,
        "to_stop_id": to_id,
        "estimated_travel_minutes": mins,
        "distance_km": dist,
        "road_status": status,
        "last_updated": updated
    })

# Add explicit critical pairwise paths for the Scenario 1 challenge:
# 1. Thiruvarur Central to Outer Stop (2km away)
travel_rows[0] = {
    "from_stop_id": "STOP_TVR_OUTER2K",
    "to_stop_id": "STOP_TVR_CENTRAL",
    "estimated_travel_minutes": 8,
    "distance_km": 2.1,
    "road_status": "Normal",
    "last_updated": "2026-10-19 20:30"
}
# 2. Madurai Outer to Mattuthavani Main (2km away)
travel_rows[1] = {
    "from_stop_id": "STOP_MDU_OUTER2K",
    "to_stop_id": "STOP_MDU_MAIN",
    "estimated_travel_minutes": 7,
    "distance_km": 2.0,
    "road_status": "Normal",
    "last_updated": "2026-10-31 20:45"
}

with open(os.path.join(DATA_DIR, "travel_times.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["from_stop_id", "to_stop_id", "estimated_travel_minutes", "distance_km", "road_status", "last_updated"])
    writer.writeheader()
    writer.writerows(travel_rows)
print(f"travel_times.csv: {len(travel_rows)} rows created.")

# --- 6. HISTORICAL PASSENGER DEMAND DATASET ---
demand_rows = []
WEATHER_CONDS = ["Clear", "Partly Cloudy", "Humid Evening", "Light Rain", "Heavy Rain", "Sudden Thunderstorm"]

for i in range(1, 2301):
    ev_idx = i % len(festival_list)
    ev = festival_list[ev_idx]
    
    # Days around festival
    base_date = datetime.strptime(ev["start_datetime"][:10], "%Y-%m-%d") + timedelta(days=(i % 2))
    date_str = base_date.strftime("%Y-%m-%d")
    
    hour = (i % 24)
    minute = (i % 4) * 15
    time_interval = f"{hour:02d}:{minute:02d}-{(hour if minute < 45 else (hour+1)%24):02d}:{(minute+15)%60:02d}"
    
    origin = stop_rows[(i * 5) % 15]["stop_id"]
    dest = ev["festival_destination_stop_id"]
    ev_type = ev["event_type"]
    ev_end = ev["programme_end_datetime"][11:16]
    weather = random.choices(WEATHER_CONDS, weights=[0.45, 0.25, 0.15, 0.10, 0.03, 0.02])[0]
    
    # Peak demand surge physics:
    # If time is within 2 hours of event_end_time -> SURGE exponentially!
    # Normal hours: 300 to 1200 pax. Surge: 12000 to 42000 pax!
    ev_end_h = int(ev_end.split(":")[0])
    is_surge_window = abs(hour - ev_end_h) <= 2
    
    if is_surge_window:
        # Scenario 1 replica: ~40,000 trying to leave in 2 hours
        passenger_count = random.randint(18000, 42000)
        # Without proactive system: only scheduled 10-14 buses!
        buses_operated = random.randint(10, 16)
        # 14 buses * ~70 people = only ~1,000 served! Remaining stranded, climbing windows!
        passengers_served = min(passenger_count, buses_operated * random.randint(65, 80))
    else:
        passenger_count = random.randint(400, 2500)
        buses_operated = random.randint(8, 20)
        passengers_served = min(passenger_count, buses_operated * random.randint(45, 60))
        
    demand_rows.append({
        "date": date_str,
        "time_interval": time_interval,
        "origin_stop_id": origin,
        "destination_id": dest,
        "event_type": ev_type,
        "event_end_time": ev_end,
        "weather_condition": weather,
        "passenger_count": passenger_count,
        "buses_operated": buses_operated,
        "passengers_served": passengers_served
    })

with open(os.path.join(DATA_DIR, "historical_passenger_demand.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "date", "time_interval", "origin_stop_id", "destination_id",
        "event_type", "event_end_time", "weather_condition",
        "passenger_count", "buses_operated", "passengers_served"
    ])
    writer.writeheader()
    writer.writerows(demand_rows)
print(f"historical_passenger_demand.csv: {len(demand_rows)} rows created.")

# --- 7. WEATHER FORECASTS DATASET ---
weather_rows = []
for i in range(1, 2151):
    loc_id = f"LOC_TN_{(i % 25) + 1:03d}"
    fc_date = datetime(2026, 10, 15) + timedelta(hours=i % 480)
    temp = round(random.uniform(26.5, 36.8), 1)
    rain_prob = random.choice([5, 10, 15, 30, 65, 85, 90])
    rain_mm = round(random.uniform(0.0, 38.5) if rain_prob > 40 else 0.0, 1)
    w_cond = "Heavy Rain" if rain_mm > 15 else ("Light Rain" if rain_prob > 50 else ("Humid" if temp > 33 else "Partly Cloudy"))
    issued = (fc_date - timedelta(days=random.randint(1, 5))).strftime("%Y-%m-%d %H:%M")
    
    weather_rows.append({
        "location_id": loc_id,
        "forecast_datetime": fc_date.strftime("%Y-%m-%d %H:%M:%S"),
        "temperature": temp,
        "rain_probability": rain_prob,
        "rainfall_mm": rain_mm,
        "weather_condition": w_cond,
        "forecast_issued_at": issued
    })

with open(os.path.join(DATA_DIR, "weather_forecasts.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["location_id", "forecast_datetime", "temperature", "rain_probability", "rainfall_mm", "weather_condition", "forecast_issued_at"])
    writer.writeheader()
    writer.writerows(weather_rows)
print(f"weather_forecasts.csv: {len(weather_rows)} rows created.")

# --- 8. SCHEDULED SERVICES DATASET (Fixed Fleet Baseline & Tradeoff source) ---
scheduled_rows = []
for i in range(1, 2201):
    bus = bus_rows[(i - 1) % len(bus_rows)]["bus_id"]
    route_id = f"RTE_TN_{(i % 60) + 1:03d}"
    orig = stop_rows[(i * 2) % len(stop_rows)]["stop_id"]
    dest = stop_rows[(i * 3 + 1) % len(stop_rows)]["stop_id"]
    dep_dt = datetime(2026, 10, 18, 5, 0) + timedelta(minutes=(i * 18) % (14 * 1440))
    arr_dt = dep_dt + timedelta(minutes=random.randint(25, 90))
    planned_cap = random.choice([50, 55, 60, 65])
    
    scheduled_rows.append({
        "service_id": f"SRV_{i:05d}",
        "bus_id": bus,
        "route_id": route_id,
        "origin_stop_id": orig,
        "destination_stop_id": dest,
        "departure_datetime": dep_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "arrival_datetime": arr_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "planned_capacity": planned_cap
    })

with open(os.path.join(DATA_DIR, "scheduled_services.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["service_id", "bus_id", "route_id", "origin_stop_id", "destination_stop_id", "departure_datetime", "arrival_datetime", "planned_capacity"])
    writer.writeheader()
    writer.writerows(scheduled_rows)
print(f"scheduled_services.csv: {len(scheduled_rows)} rows created.")

# --- 9. ALLOCATION REQUESTS DATASET (Inter-Depot Workflow) ---
allocation_rows = []
REQ_STATUSES = ["Approved", "Dispatched", "Pending_Confirmation", "In_Transit", "Completed"]
for i in range(1, 2101):
    req_depot = "DEP_TVR_01" if (i % 2 == 0) else "DEP_MDU_02"
    offer_depot = depot_rows[(i * 4) % len(depot_rows)]["divisional_depot_id"]
    if offer_depot == req_depot:
        offer_depot = depot_rows[(i * 4 + 1) % len(depot_rows)]["divisional_depot_id"]
    bus = bus_rows[(i * 2) % len(bus_rows)]["bus_id"]
    req_at = datetime(2026, 10, 19, 14, 0) + timedelta(minutes=(i * 3) % 4320)
    status = random.choices(REQ_STATUSES, weights=[0.40, 0.25, 0.20, 0.10, 0.05])[0]
    dec_at = (req_at + timedelta(minutes=random.randint(2, 12))).strftime("%Y-%m-%d %H:%M:%S") if status != "Pending_Confirmation" else "PENDING"
    
    allocation_rows.append({
        "request_id": f"REQ_{i:05d}",
        "requesting_divisional_depot_id": req_depot,
        "offering_divisional_depot_id": offer_depot,
        "bus_id": bus,
        "requested_at": req_at.strftime("%Y-%m-%d %H:%M:%S"),
        "status": status,
        "decision_at": dec_at
    })

with open(os.path.join(DATA_DIR, "allocation_requests.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["request_id", "requesting_divisional_depot_id", "offering_divisional_depot_id", "bus_id", "requested_at", "status", "decision_at"])
    writer.writeheader()
    writer.writerows(allocation_rows)
print(f"allocation_requests.csv: {len(allocation_rows)} rows created.")

# --- 10. FESTIVAL ACTUALS DATASET (Validation & Real-time sensors) ---
actual_rows = []
for i in range(1, 2151):
    ev = festival_list[i % len(festival_list)]
    stop = stop_rows[(i * 2) % 15]["stop_id"]
    hour = (i % 24)
    minute = (i % 4) * 15
    tint = f"{hour:02d}:{minute:02d}-{(hour if minute < 45 else (hour+1)%24):02d}:{(minute+15)%60:02d}"
    
    # Mirror demand with realistic ground sensor variance (+- 8%)
    ev_end_h = int(ev["programme_end_datetime"][11:13])
    is_surge = abs(hour - ev_end_h) <= 2
    if is_surge:
        act_pax = random.randint(19500, 41200)
        # after AI re-allocation in historical test run, served is high!
        act_served = int(act_pax * random.uniform(0.88, 0.98))
    else:
        act_pax = random.randint(350, 2400)
        act_served = act_pax
        
    actual_rows.append({
        "event_id": ev["event_id"],
        "stop_id": stop,
        "time_interval": tint,
        "actual_passenger_count": act_pax,
        "actual_passengers_served": act_served
    })

with open(os.path.join(DATA_DIR, "festival_actuals.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=["event_id", "stop_id", "time_interval", "actual_passenger_count", "actual_passengers_served"])
    writer.writeheader()
    writer.writerows(actual_rows)
print(f"festival_actuals.csv: {len(actual_rows)} rows created.")

print("All 10 datasets generated successfully with >= 2000 rows each!")
