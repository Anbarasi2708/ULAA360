"""
Ulaa360 Model Training & Dataset Consolidation Engine
Trains ML models using scikit-learn on:
- ticket_vending_machine_logs.csv (ETVM live ticketing transactions)
- ticketing_machine.csv (Live conductor bus occupancy)
- historical_passenger_demand.csv (Multi-year festival & route passenger counts)
- All 6 TNSTC Divisional Schedules (Kumbakonam, Coimbatore, Madurai, Salem, Tirunelveli, Villupuram)
- tamil_nadu_bus_stand_names_184 (1).csv (184 authentic TN bus stand names)

Exports:
- models/trained_models.joblib (Trained RandomForest & GradientBoosting models + encoders)
- models/consolidated_fleet_schedules.json (Consolidated index of all TNSTC schedules with depots, bus numbers, timings, categories)
- models/all_bus_stops.json (Normalized list of all 184 bus stands + festival hubs)
"""

import os
import csv
import json
import re
from datetime import datetime
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, mean_absolute_error

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
MODELS_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODELS_DIR, exist_ok=True)

def clean_str(s):
    if not s:
        return ""
    return str(s).strip()

def extract_hour_from_time(t_str):
    if not t_str:
        return 12.0
    t_str = str(t_str).strip()
    # Matches "2026-10-19 06:04:00" or "06:04" or "06:04 AM" or "01:15-01:30"
    m_full = re.search(r'(\d{1,2}):(\d{2})', t_str)
    if m_full:
        h = int(m_full.group(1))
        m = int(m_full.group(2))
        if "pm" in t_str.lower() and h < 12:
            h += 12
        elif "am" in t_str.lower() and h == 12:
            h = 0
        return round(h + (m / 60.0), 2)
    return 12.0

def load_184_bus_stands():
    """Loads all 184 bus stand names from the user provided dataset."""
    csv_path = os.path.join(DATA_DIR, "tamil_nadu_bus_stand_names_184 (1).csv")
    stops = []
    if os.path.exists(csv_path):
        with open(csv_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                val = clean_str(row.get("name"))
                if val and val not in stops:
                    stops.append(val)
    
    # Also ensure festival special points and major regional hubs are included
    additional_hubs = [
        "Thiruvarur Central Municipal Stand",
        "Vilamal Outer Bypass Stand (2km North)",
        "Therady Chariot Grounds East Gate",
        "Madurai Ring Road By-Pass (2km East)",
        "Madurai Goripalayam Stand",
        "Kumbakonam Central Bus Stand",
        "Mannargudi Rajagopalaswamy Temple Stand",
        "Nagapattinam New Bus Stand",
        "Trichy Central Cantt Stand",
        "Salem Meyyanur Central Stand",
        "Erode Central Bus Terminal",
        "Tirunelveli New Bus Stand",
        "Coimbatore Gandhipuram Central Bus Stand"
    ]
    for hub in additional_hubs:
        if hub not in stops:
            stops.append(hub)
            
    stops.sort()
    out_path = os.path.join(MODELS_DIR, "all_bus_stops.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(stops, f, indent=2, ensure_ascii=False)
    print(f"[OK] Saved {len(stops)} bus stops into {out_path}")
    return stops

def load_all_divisional_schedules():
    """Consolidates all TNSTC division schedules into a unified searchable index."""
    schedule_files = [
        ("tnstc_kumbakonam_schedules.csv", "TNSTC Kumbakonam"),
        ("tnstc_coimbatore_schedules.csv", "TNSTC Coimbatore"),
        ("tnstc_madurai_schedules.csv", "TNSTC Madurai"),
        ("tnstc_salem_schedules.csv", "TNSTC Salem"),
        ("tnstc_tirunelveli_schedules.csv", "TNSTC Tirunelveli"),
        ("villupuram.csv", "TNSTC Villupuram")
    ]
    
    consolidated = []
    
    for filename, corp_fallback in schedule_files:
        path = os.path.join(DATA_DIR, filename)
        if not os.path.exists(path):
            continue
        with open(path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                corp = clean_str(row.get("Parent_Corporation") or corp_fallback)
                division = clean_str(row.get("Regional_Division"))
                depot = clean_str(row.get("Subdivision_Depot"))
                bus_no = clean_str(row.get("Bus_Registration_Number"))
                bus_type = clean_str(row.get("Bus_Type"))
                route_id = clean_str(row.get("Route_ID"))
                origin = clean_str(row.get("Origin_Bus_Stand"))
                destination = clean_str(row.get("Destination_Bus_Stand"))
                dep_time = clean_str(row.get("Departure_Time"))
                arr_time = clean_str(row.get("Arrival_Time"))
                frequency = clean_str(row.get("Frequency_Type"))
                
                if origin and destination and bus_no:
                    consolidated.append({
                        "parent_corporation": corp,
                        "regional_division": division,
                        "subdivision_depot": depot,
                        "bus_registration_number": bus_no,
                        "bus_type": bus_type,
                        "route_id": route_id,
                        "origin_bus_stand": origin,
                        "destination_bus_stand": destination,
                        "departure_time": dep_time,
                        "arrival_time": arr_time,
                        "frequency_type": frequency,
                        "dep_hour": extract_hour_from_time(dep_time)
                    })
    
    # Also load scheduled_services.csv for additional corridor schedules
    sched_path = os.path.join(DATA_DIR, "scheduled_services.csv")
    if os.path.exists(sched_path):
        with open(sched_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader):
                if idx >= 600: # sample representative scheduled services
                    break
                bus_id = clean_str(row.get("bus_id"))
                orig_id = clean_str(row.get("origin_stop_id"))
                dest_id = clean_str(row.get("destination_stop_id"))
                dep_dt = clean_str(row.get("departure_datetime"))
                arr_dt = clean_str(row.get("arrival_datetime"))
                cap = int(row.get("planned_capacity", 55))
                
                # Derive human-friendly name
                corp = "TNSTC Express Operations"
                div = "Corridor Operations"
                depot = "Central Fleet Depot"
                
                if "58" in bus_id:
                    corp = "TNSTC Madurai"
                    div = "Madurai"
                    depot = "Mattuthavani Integrated Depot"
                elif "49" in bus_id:
                    corp = "TNSTC Kumbakonam"
                    div = "Thiruvarur"
                    depot = "Thiruvarur Central Depot"
                elif "38" in bus_id or "39" in bus_id:
                    corp = "TNSTC Coimbatore"
                    div = "Coimbatore"
                    depot = "Gandhipuram Central Depot"
                elif "30" in bus_id:
                    corp = "TNSTC Salem"
                    div = "Salem"
                    depot = "Salem Meyyanur Depot"
                
                # Format times
                dep_time = dep_dt.split(" ")[1][:5] if " " in dep_dt else "08:30"
                arr_time = arr_dt.split(" ")[1][:5] if " " in arr_dt else "10:30"
                
                # Clean stop labels
                o_label = orig_id.replace("STOP_", "").replace("_", " ").title() + " Bus Stand"
                d_label = dest_id.replace("STOP_", "").replace("_", " ").title() + " Bus Stand"
                
                consolidated.append({
                    "parent_corporation": corp,
                    "regional_division": div,
                    "subdivision_depot": depot,
                    "bus_registration_number": bus_id,
                    "bus_type": "Mofussil (Express)",
                    "route_id": clean_str(row.get("route_id") or f"TN-EXP-{idx+1:03d}"),
                    "origin_bus_stand": o_label,
                    "destination_bus_stand": d_label,
                    "departure_time": dep_time,
                    "arrival_time": arr_time,
                    "frequency_type": "Daily Service",
                    "dep_hour": extract_hour_from_time(dep_time)
                })

    out_schedules = os.path.join(MODELS_DIR, "consolidated_fleet_schedules.json")
    with open(out_schedules, "w", encoding="utf-8") as f:
        json.dump(consolidated, f, indent=2, ensure_ascii=False)
    print(f"[OK] Consolidated {len(consolidated)} schedules into {out_schedules}")
    return consolidated

def train_demand_and_occupancy_models():
    """Trains ML models on real ETVM logs and historical demand data."""
    print("Training ML models on ETVM ticketing logs & historical demand...")
    
    # 1. Prepare ETVM Ticketing Data
    etvm_path = os.path.join(DATA_DIR, "ticket_vending_machine_logs.csv")
    ticket_features = []
    occupancy_targets = []
    
    if os.path.exists(etvm_path):
        with open(etvm_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                dt_str = clean_str(row.get("issued_datetime"))
                hour = extract_hour_from_time(dt_str)
                service_cat = clean_str(row.get("service_category"))
                occ_pct = float(row.get("occupancy_percentage", 50.0))
                total_cap = float(row.get("total_bus_capacity", 60.0))
                
                # Feature encoding
                is_peak = 1.0 if (7.5 <= hour <= 10.5 or 17.5 <= hour <= 22.5) else 0.0
                is_festival = 1.0 if "Festival" in service_cat else 0.0
                is_spare = 1.0 if "Spare" in service_cat else 0.0
                
                cat_code = 0.0
                if "Festival" in service_cat:
                    cat_code = 3.0
                elif "Spare" in service_cat:
                    cat_code = 1.0
                elif "Deluxe" in service_cat:
                    cat_code = 2.0
                elif "Town" in service_cat:
                    cat_code = 0.5
                else:
                    cat_code = 1.5
                    
                ticket_features.append([hour, is_peak, is_festival, is_spare, cat_code, total_cap])
                occupancy_targets.append(occ_pct)
                
    # 2. Add Ticketing Machine Logs
    tx_path = os.path.join(DATA_DIR, "ticketing_machine.csv")
    if os.path.exists(tx_path):
        with open(tx_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                ts_str = clean_str(row.get("timestamp"))
                hour = extract_hour_from_time(ts_str)
                cap = float(row.get("total_capacity", 50.0))
                occ = float(row.get("current_occupancy", 25.0))
                crowd = clean_str(row.get("crowd_status"))
                
                occ_pct = round((occ / max(1.0, cap)) * 100.0, 1)
                is_peak = 1.0 if (7.5 <= hour <= 10.5 or 17.5 <= hour <= 22.5) else 0.0
                is_festival = 1.0 if crowd == "OVERCROWDED" else 0.0
                is_spare = 0.0
                cat_code = 2.0 if is_festival else 1.0
                
                ticket_features.append([hour, is_peak, is_festival, is_spare, cat_code, cap])
                occupancy_targets.append(occ_pct)

    X_occ = np.array(ticket_features, dtype=float)
    y_occ = np.array(occupancy_targets, dtype=float)
    
    print(f"Total training samples for Occupancy Model: {len(X_occ)}")
    X_train_o, X_test_o, y_train_o, y_test_o = train_test_split(X_occ, y_occ, test_size=0.2, random_state=42)
    
    rf_occupancy = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)
    rf_occupancy.fit(X_train_o, y_train_o)
    
    preds_o = rf_occupancy.predict(X_test_o)
    r2_o = r2_score(y_test_o, preds_o)
    mae_o = mean_absolute_error(y_test_o, preds_o)
    print(f"Occupancy Model RF: R2 Score = {r2_o:.4f}, MAE = {mae_o:.2f}%")
    
    # 3. Train Passenger Demand Regressor on Historical Demand Data
    demand_path = os.path.join(DATA_DIR, "historical_passenger_demand.csv")
    demand_features = []
    demand_targets = []
    
    if os.path.exists(demand_path):
        with open(demand_path, mode="r", encoding="utf-8-sig") as f:
            reader = csv.DictReader(f)
            for row in reader:
                t_int = clean_str(row.get("time_interval"))
                hour = extract_hour_from_time(t_int)
                evt_type = clean_str(row.get("event_type"))
                weather = clean_str(row.get("weather_condition"))
                passengers = float(row.get("passenger_count", 500.0))
                
                is_rain = 1.0 if "rain" in weather.lower() else 0.0
                has_event = 1.0 if ("thiruvizha" in evt_type.lower() or "festival" in evt_type.lower()) else 0.0
                is_peak = 1.0 if (18.0 <= hour <= 23.0) else 0.0
                
                # Season / weather risk factor
                w_factor = 2.0 if is_rain else 1.0
                
                demand_features.append([hour, is_peak, has_event, is_rain, w_factor])
                demand_targets.append(passengers)
                
    X_dem = np.array(demand_features, dtype=float)
    y_dem = np.array(demand_targets, dtype=float)
    
    print(f"Total training samples for Demand Model: {len(X_dem)}")
    X_train_d, X_test_d, y_train_d, y_test_d = train_test_split(X_dem, y_dem, test_size=0.2, random_state=42)
    
    gb_demand = GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=5, random_state=42)
    gb_demand.fit(X_train_d, y_train_d)
    
    preds_d = gb_demand.predict(X_test_d)
    r2_d = r2_score(y_test_d, preds_d)
    mae_d = mean_absolute_error(y_test_d, preds_d)
    print(f"Demand Model GB: R2 Score = {r2_d:.4f}, MAE = {mae_d:.2f} passengers")
    
    # 4. Save Trained Pipeline to Disk
    artifacts = {
        "rf_occupancy_model": rf_occupancy,
        "gb_demand_model": gb_demand,
        "metrics": {
            "occupancy_r2": float(r2_o),
            "occupancy_mae": float(mae_o),
            "demand_r2": float(r2_d),
            "demand_mae": float(mae_d)
        },
        "trained_at": datetime.now().isoformat(),
        "feature_names_occupancy": ["hour", "is_peak", "is_festival", "is_spare", "service_cat_code", "total_capacity"],
        "feature_names_demand": ["hour", "is_peak", "has_event", "is_rain", "weather_factor"]
    }
    
    model_save_path = os.path.join(MODELS_DIR, "trained_models.joblib")
    joblib.dump(artifacts, model_save_path)
    print(f"[OK] Trained models successfully saved to {model_save_path}")
    return artifacts

if __name__ == "__main__":
    print("=" * 60)
    print("STARTING ULAA360 MODEL RETRAINING & DATASET CONSOLIDATION")
    print("=" * 60)
    stops = load_184_bus_stands()
    schedules = load_all_divisional_schedules()
    models = train_demand_and_occupancy_models()
    print("=" * 60)
    print("TRAINING COMPLETE! ALL DATASETS COMPILED & MODELS EXPORTED.")
    print("=" * 60)
