"""
Ulaa360 TNSTC Divisional Depots & ETVM (Ticket Vending Machine) Data Generator
Generates:
1. Complete directory of TNSTC Corporation Divisional Depots with credentials
2. ticket_vending_machine_logs.csv (>= 2000 rows) with realistic passenger counts and capacities
3. depot_daily_trip_status.csv (>= 2000 rows) for:
   - Departed Yesterday
   - Reached Destination
   - Yet to Arrive / In-Transit
"""

import csv
import os
import random
from datetime import datetime, timedelta

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
os.makedirs(DATA_DIR, exist_ok=True)

random.seed(42)

# --- 1. MAJOR TNSTC DIVISIONAL DEPOTS DIRECTORY WITH PASSWORDS ---
TNSTC_MAJOR_DEPOTS = [
    # TNSTC Kumbakonam Division
    {"id": "DEP_TVR_01", "name": "Thiruvarur Central Depot", "corp": "TNSTC Kumbakonam", "region": "Thiruvarur", "username": "mgr_tvr_central", "password": "TVR@Tnstc#2026", "contact": "+91-4366-222001"},
    {"id": "DEP_TVR_02", "name": "Thiruvarur Therady Feeder Depot", "corp": "TNSTC Kumbakonam", "region": "Thiruvarur", "username": "mgr_tvr_therady", "password": "TVR@Therady#26", "contact": "+91-4366-222002"},
    {"id": "DEP_MNG_01", "name": "Mannargudi Division Depot", "corp": "TNSTC Kumbakonam", "region": "Thiruvarur South", "username": "mgr_mannargudi", "password": "MNG@Tnstc#2026", "contact": "+91-4367-251001"},
    {"id": "DEP_KUM_01", "name": "Kumbakonam Town Central Depot", "corp": "TNSTC Kumbakonam", "region": "Thanjavur North", "username": "mgr_kumbakonam", "password": "KUM@Tnstc#2026", "contact": "+91-435-2401001"},
    {"id": "DEP_TNJ_01", "name": "Thanjavur Old Stand Depot", "corp": "TNSTC Kumbakonam", "region": "Thanjavur", "username": "mgr_thanjavur", "password": "TNJ@Tnstc#2026", "contact": "+91-4362-230001"},
    {"id": "DEP_NGP_01", "name": "Nagapattinam Port Depot", "corp": "TNSTC Kumbakonam", "region": "Nagapattinam", "username": "mgr_nagapattinam", "password": "NGP@Tnstc#2026", "contact": "+91-4365-244001"},
    {"id": "DEP_MYL_01", "name": "Mayiladuthurai Depot", "corp": "TNSTC Kumbakonam", "region": "Mayiladuthurai", "username": "mgr_mayiladuthurai", "password": "MYL@Tnstc#2026", "contact": "+91-4364-228001"},
    {"id": "DEP_TRY_01", "name": "Trichy Central Cantt Depot", "corp": "TNSTC Kumbakonam", "region": "Tiruchirappalli", "username": "mgr_trichy_cantt", "password": "TRY@Tnstc#2026", "contact": "+91-431-2460001"},
    {"id": "DEP_KRR_01", "name": "Karur Central Depot", "corp": "TNSTC Kumbakonam", "region": "Karur", "username": "mgr_karur", "password": "KRR@Tnstc#2026", "contact": "+91-4324-260001"},
    {"id": "DEP_PDK_01", "name": "Pudukkottai Central Depot", "corp": "TNSTC Kumbakonam", "region": "Pudukkottai", "username": "mgr_pudukkottai", "password": "PDK@Tnstc#2026", "contact": "+91-4322-221001"},

    # TNSTC Madurai Division
    {"id": "DEP_MDU_01", "name": "Madurai Central Periyar Depot", "corp": "TNSTC Madurai", "region": "Madurai", "username": "mgr_mdu_periyar", "password": "MDU@Periyar#26", "contact": "+91-452-2342001"},
    {"id": "DEP_MDU_02", "name": "Mattuthavani Integrated Depot", "corp": "TNSTC Madurai", "region": "Madurai", "username": "mgr_mdu_mibt", "password": "MDU@Mattuthavani#26", "contact": "+91-452-2342002"},
    {"id": "DEP_MDU_05", "name": "Melur Divisional Depot", "corp": "TNSTC Madurai", "region": "Madurai Rural", "username": "mgr_melur", "password": "MLR@Tnstc#2026", "contact": "+91-452-2342005"},
    {"id": "DEP_DGL_01", "name": "Dindigul Bypass Depot", "corp": "TNSTC Madurai", "region": "Dindigul", "username": "mgr_dindigul", "password": "DGL@Tnstc#2026", "contact": "+91-451-2421001"},
    {"id": "DEP_VNR_01", "name": "Virudhunagar Town Depot", "corp": "TNSTC Madurai", "region": "Virudhunagar", "username": "mgr_virudhunagar", "password": "VNR@Tnstc#2026", "contact": "+91-4562-243001"},
    {"id": "DEP_THN_01", "name": "Theni Central Depot", "corp": "TNSTC Madurai", "region": "Theni", "username": "mgr_theni", "password": "THN@Tnstc#2026", "contact": "+91-4546-252001"},

    # TNSTC Coimbatore Division (Regular town scenarios)
    {"id": "DEP_CBE_01", "name": "Coimbatore Gandhipuram Central Depot", "corp": "TNSTC Coimbatore", "region": "Coimbatore", "username": "mgr_cbe_gandhipuram", "password": "CBE@Gandhi#2026", "contact": "+91-422-2521001"},
    {"id": "DEP_CBE_02", "name": "Coimbatore Ukkadam Depot", "corp": "TNSTC Coimbatore", "region": "Coimbatore", "username": "mgr_cbe_ukkadam", "password": "CBE@Ukkadam#26", "contact": "+91-422-2521002"},
    {"id": "DEP_CBE_03", "name": "Coimbatore Singanallur Moffusil Depot", "corp": "TNSTC Coimbatore", "region": "Coimbatore", "username": "mgr_cbe_singanallur", "password": "CBE@Singa#2026", "contact": "+91-422-2521003"},
    {"id": "DEP_TPR_01", "name": "Tiruppur Old Stand Depot", "corp": "TNSTC Coimbatore", "region": "Tiruppur", "username": "mgr_tiruppur", "password": "TPR@Tnstc#2026", "contact": "+91-421-2241001"},
    {"id": "DEP_ERD_01", "name": "Erode Central Bus Terminal Depot", "corp": "TNSTC Coimbatore", "region": "Erode", "username": "mgr_erode", "password": "ERD@Tnstc#2026", "contact": "+91-424-2251001"},
    {"id": "DEP_OTY_01", "name": "Nilgiris Ooty Central Depot", "corp": "TNSTC Coimbatore", "region": "Nilgiris", "username": "mgr_ooty", "password": "OTY@Tnstc#2026", "contact": "+91-423-2441001"},

    # TNSTC Salem Division
    {"id": "DEP_SLM_01", "name": "Salem Meyyanur Central Depot", "corp": "TNSTC Salem", "region": "Salem", "username": "mgr_salem", "password": "SLM@Tnstc#2026", "contact": "+91-427-2448001"},
    {"id": "DEP_DPI_01", "name": "Dharmapuri Central Depot", "corp": "TNSTC Salem", "region": "Dharmapuri", "username": "mgr_dharmapuri", "password": "DPI@Tnstc#2026", "contact": "+91-4342-260001"},
    {"id": "DEP_KGI_01", "name": "Krishnagiri Town Depot", "corp": "TNSTC Salem", "region": "Krishnagiri", "username": "mgr_krishnagiri", "password": "KGI@Tnstc#2026", "contact": "+91-4343-232001"},

    # TNSTC Villupuram Division
    {"id": "DEP_VPM_01", "name": "Villupuram Central Depot", "corp": "TNSTC Villupuram", "region": "Villupuram", "username": "mgr_villupuram", "password": "VPM@Tnstc#2026", "contact": "+91-4146-222001"},
    {"id": "DEP_VLR_01", "name": "Vellore Old Stand Depot", "corp": "TNSTC Villupuram", "region": "Vellore", "username": "mgr_vellore", "password": "VLR@Tnstc#2026", "contact": "+91-416-2222001"},
    {"id": "DEP_TVM_01", "name": "Tiruvannamalai Central Depot", "corp": "TNSTC Villupuram", "region": "Tiruvannamalai", "username": "mgr_tiruvannamalai", "password": "TVM@Tnstc#2026", "contact": "+91-4175-236001"},

    # TNSTC Tirunelveli Division
    {"id": "DEP_TNV_01", "name": "Tirunelveli Vannarpettai Depot", "corp": "TNSTC Tirunelveli", "region": "Tirunelveli", "username": "mgr_tirunelveli", "password": "TNV@Tnstc#2026", "contact": "+91-462-2572001"},
    {"id": "DEP_TUT_01", "name": "Thoothukudi New Stand Depot", "corp": "TNSTC Tirunelveli", "region": "Thoothukudi", "username": "mgr_thoothukudi", "password": "TUT@Tnstc#2026", "contact": "+91-461-2321001"},
    {"id": "DEP_NGL_01", "name": "Nagercoil Ranithottam Depot", "corp": "TNSTC Tirunelveli", "region": "Kanyakumari", "username": "mgr_nagercoil", "password": "NGL@Tnstc#2026", "contact": "+91-4652-240001"},

    # MTC Chennai & SETC
    {"id": "DEP_CHN_01", "name": "Chennai Koyambedu CMBT Depot", "corp": "MTC Chennai", "region": "Chennai", "username": "mgr_chennai_cmbt", "password": "CHN@Cmbt#2026", "contact": "+91-44-24792001"},
    {"id": "DEP_CHN_02", "name": "Chennai Broadway Central Depot", "corp": "MTC Chennai", "region": "Chennai", "username": "mgr_chennai_broadway", "password": "CHN@Broadway#26", "contact": "+91-44-25342001"},
    {"id": "DEP_SETC_01", "name": "SETC Express Central Trichy Depot", "corp": "SETC Tamil Nadu", "region": "Statewide Express", "username": "mgr_setc_trichy", "password": "SETC@Express#26", "contact": "+91-431-2461001"}
]

# Write TNSTC Depots with Credentials to JSON for the system
with open(os.path.join(DATA_DIR, "tnstc_depots_credentials.json"), "w", encoding="utf-8") as f:
    import json
    json.dump(TNSTC_MAJOR_DEPOTS, f, indent=2)

print(f"tnstc_depots_credentials.json: {len(TNSTC_MAJOR_DEPOTS)} major depots saved.")


# --- 2. TICKET VENDING MACHINE LOGS (ETVM) DATASET (>= 2200 rows) ---
# Simulates electronic ticketing machines recording live bus occupancies
etvm_rows = []
BUS_IDS = [f"TN-{'58' if i % 2 == 0 else ('49' if i % 3 == 0 else '38')}-N-{1000 + i:04d}" for i in range(1, 400)]
ROUTES = [
    {"id": "RTE_CBE_01", "from": "Coimbatore Gandhipuram", "to": "Singanallur", "type": "Regular_Town"},
    {"id": "RTE_CBE_02", "from": "Coimbatore Ukkadam", "to": "Pollachi", "type": "Regular_Moffusil"},
    {"id": "RTE_CBE_03", "from": "Coimbatore Gandhipuram", "to": "Mettupalayam", "type": "Regular_Moffusil"},
    {"id": "RTE_TVR_01", "from": "Thiruvarur Central", "to": "Kumbakonam Stand", "type": "Festival_Crowded"},
    {"id": "RTE_TVR_02", "from": "Vilamal Outer Stand (2km)", "to": "Mannargudi Stand", "type": "Spare_Special_Shuttle"},
    {"id": "RTE_TVR_03", "from": "Vilamal Outer Stand (2km)", "to": "Kumbakonam Stand", "type": "Spare_Special_Shuttle"},
    {"id": "RTE_MDU_01", "from": "Madurai Mattuthavani", "to": "Dindigul Bypass", "type": "Festival_Crowded"},
    {"id": "RTE_MDU_02", "from": "Madurai Ring Road (2km)", "to": "Melur Stand", "type": "Spare_Special_Shuttle"},
    {"id": "RTE_MDU_03", "from": "Madurai Periyar Stand", "to": "Tirumangalam Stand", "type": "Regular_Town"},
    {"id": "RTE_SLM_01", "from": "Salem Central Stand", "to": "Erode Terminal", "type": "Regular_Moffusil"},
    {"id": "RTE_TRY_01", "from": "Trichy Central Cantt", "to": "Thanjavur New Stand", "type": "Regular_Moffusil"},
    {"id": "RTE_TNV_01", "from": "Tirunelveli New Stand", "to": "Thoothukudi Stand", "type": "Regular_Moffusil"},
]

base_time = datetime(2026, 10, 19, 6, 0)

for i in range(1, 2350):
    ticket_id = f"ETVM_TN_{100000 + i}"
    machine_id = f"ETVM_MCH_{(i % 120) + 1:03d}"
    bus_id = BUS_IDS[i % len(BUS_IDS)]
    route = ROUTES[i % len(ROUTES)]
    
    issued_dt = base_time + timedelta(minutes=(i * 4) % (48 * 60))
    pax = random.choices([1, 2, 3, 4, 5], weights=[0.60, 0.25, 0.08, 0.05, 0.02])[0]
    total_cap = 52 if "CBE" in bus_id or i % 2 == 0 else 60
    
    # In festival areas, buses get full fast. In normal town (Coimbatore), standard occupancy.
    if "Festival" in route["type"]:
        cum_occupancy = min(total_cap, random.randint(45, total_cap))
    elif "Spare" in route["type"]:
        cum_occupancy = random.randint(5, 30)  # Plenty of empty seats on spare shuttles!
    else:
        cum_occupancy = random.randint(14, 46) # Normal town route occupancy

    occ_pct = round((cum_occupancy / total_cap) * 100, 1)
    fare = pax * random.choice([15, 22, 35, 48, 65])
    
    etvm_rows.append({
        "ticket_id": ticket_id,
        "machine_id": machine_id,
        "bus_id": bus_id,
        "route_id": route["id"],
        "route_name": f"{route['from']} ➔ {route['to']}",
        "service_category": route["type"],
        "issued_datetime": issued_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "origin_stop": route["from"],
        "destination_stop": route["to"],
        "tickets_issued": pax,
        "fare_collected_inr": fare,
        "current_occupied_seats": cum_occupancy,
        "total_bus_capacity": total_cap,
        "occupancy_percentage": occ_pct
    })

with open(os.path.join(DATA_DIR, "ticket_vending_machine_logs.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "ticket_id", "machine_id", "bus_id", "route_id", "route_name", "service_category",
        "issued_datetime", "origin_stop", "destination_stop", "tickets_issued",
        "fare_collected_inr", "current_occupied_seats", "total_bus_capacity", "occupancy_percentage"
    ])
    writer.writeheader()
    writer.writerows(etvm_rows)

print(f"ticket_vending_machine_logs.csv: {len(etvm_rows)} rows created.")


# --- 3. DEPOT DAILY FLEET TRIP STATUS DATASET (>= 2150 rows) ---
# Covers:
# - Departed Yesterday
# - Reached Destination
# - Yet to Arrive (Live In-Transit)
trip_status_rows = []
TRIP_STAGES = ["Departed_Yesterday", "Reached_Destination", "Yet_To_Arrive_In_Transit"]

yesterday_ref = datetime(2026, 10, 18, 14, 0)

for i in range(1, 2250):
    trip_id = f"TRIP_TN_{50000 + i}"
    depot_assigned = TNSTC_MAJOR_DEPOTS[i % len(TNSTC_MAJOR_DEPOTS)]
    bus_id = BUS_IDS[i % len(BUS_IDS)]
    route = ROUTES[i % len(ROUTES)]
    stage = random.choices(TRIP_STAGES, weights=[0.35, 0.40, 0.25])[0]
    
    if stage == "Departed_Yesterday":
        dep_time = yesterday_ref - timedelta(hours=random.randint(1, 18), minutes=random.randint(0, 50))
        arr_time = dep_time + timedelta(hours=random.randint(3, 8))
        cur_loc = f"{route['to']} (Trip Completed - In Bay)"
        delay_min = random.choice([0, 5, -8, 12, 0])
        status_note = "Completed schedule yesterday; vehicle inspected & available."
    elif stage == "Reached_Destination":
        dep_time = datetime(2026, 10, 19, 5, 0) + timedelta(minutes=(i * 12) % 720)
        arr_time = dep_time + timedelta(hours=random.randint(2, 6))
        cur_loc = f"{route['to']} (Platform Standby)"
        delay_min = random.choice([0, 2, -5, 8])
        status_note = "Safely docked at terminus platform. Passengers deboarded."
    else: # Yet_To_Arrive_In_Transit
        dep_time = datetime(2026, 10, 19, 15, 30) + timedelta(minutes=(i * 7) % 240)
        arr_time = dep_time + timedelta(hours=random.randint(2, 5))
        checkpoint = random.choice(["Toll Plaza NH-45", "Bypass Flyover", "Junction Circle", "Rural Feeder Link"])
        cur_loc = f"En Route via {checkpoint}"
        delay_min = random.choice([4, 10, 18, 25])
        status_note = f"Active on highway. ETA {arr_time.strftime('%H:%M')} (+{delay_min}m festival road buffer)."

    trip_status_rows.append({
        "trip_id": trip_id,
        "depot_id": depot_assigned["id"],
        "depot_name": depot_assigned["name"],
        "bus_id": bus_id,
        "route_name": f"{route['from']} ➔ {route['to']}",
        "stage": stage,
        "departure_timestamp": dep_time.strftime("%Y-%m-%d %H:%M"),
        "scheduled_arrival_timestamp": arr_time.strftime("%Y-%m-%d %H:%M"),
        "current_location_or_dock": cur_loc,
        "delay_minutes": delay_min,
        "driver_crew_id": f"CRW-TN-{(i % 80) + 101:03d}",
        "operational_notes": status_note
    })

with open(os.path.join(DATA_DIR, "depot_daily_fleet_trips.csv"), "w", newline="", encoding="utf-8") as f:
    writer = csv.DictWriter(f, fieldnames=[
        "trip_id", "depot_id", "depot_name", "bus_id", "route_name", "stage",
        "departure_timestamp", "scheduled_arrival_timestamp", "current_location_or_dock",
        "delay_minutes", "driver_crew_id", "operational_notes"
    ])
    writer.writeheader()
    writer.writerows(trip_status_rows)

print(f"depot_daily_fleet_trips.csv: {len(trip_status_rows)} rows created.")
