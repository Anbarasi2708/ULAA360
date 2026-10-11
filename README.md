# ULAA360: Tamil Nadu Festival Crowd Transport Predictor & Fleet Reallocation Platform

**ULAA360** is an intelligent public transport optimization and proactive fleet reallocation system designed specifically for the **Tamil Nadu State Transport Corporation (TNSTC)**. It empowers transport authorities, depot managers, and commuters with real-time crowd prediction, proactive bus reallocation, inter-depot fleet requests, and universal journey planning during major festival events.

---

## 🌟 Key Features

### 1. 🤖 AI/ML Festival Crowd Prediction Engine
- Trained Machine Learning models (`RandomForestRegressor`, `GradientBoostingRegressor`) predicting hourly passenger influx based on:
  - Festival event type and expected total attendance (e.g., Thiruvarur Ther Thiruvizha, Madurai Chithirai, Palani Thaipusam).
  - Weather dynamics (precipitation, high heat index).
  - Programme climax/end-time departure surge curves.
  - Proactive dispatch timing calculations (moving spare buses 2 hours ahead of peak crowd arrival).

### 2. 🔄 Inter-Depot Request & Allocation Workflow
- Multi-Corporation Switcher supporting all major TNSTC divisions:
  - **Kumbakonam**, **Villupuram**, **Madurai**, **Salem**, **Coimbatore**, and **Tirunelveli**.
- Live depot-to-depot spare bus requisitioning, request acceptance/rejection, and fleet status tracking:
  - *Departed Yesterday*
  - *Reached Destination*
  - *Yet to Arrive / In-Transit*

### 3. 🗺️ Universal Tamil Nadu Journey Planner & 184 Bus Stands
- Complete catalog of **184 integrated bus stands** across Tamil Nadu with accurate geographic coordinates.
- Interactive route finder with live estimated travel times, bus frequency, and Electronic Ticket Vending Machine (ETVM) capacity utilization.

### 4. 📊 Depot Operations & Commuter Dashboard
- Real-time fleet health, available spare capacity, safety waiting capacity at festival destination stops.
- Bilingual / localized UI with interactive maps, intuitive alerts, and clear crowd safety indicators.

---

## 🚀 Quick Start (Local Setup)

### Prerequisites
- Python 3.10+ installed
- Web browser (Chrome, Edge, Firefox, Safari)

### 1. Clone the Repository
```bash
git clone https://github.com/Anbarasi2708/ULAA360.git
cd ULAA360
```

### 2. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 3. Run the Application Server
```bash
python server.py
```

### 4. Open the Application
Navigate to [http://localhost:8080](http://localhost:8080) in your web browser.

---

## ☁️ Deployment Guide

### Deploy to Vercel (1-Click)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAnbarasi2708%2FULAA360)

1. Click the **Deploy with Vercel** button above or import the GitHub repository (`https://github.com/Anbarasi2708/ULAA360`) directly in your [Vercel Dashboard](https://vercel.com/new).
2. Vercel automatically detects `vercel.json` and configures the Python Serverless Function (`api/index.py`) and static asset routing.
3. Click **Deploy** — your live application will be live at `https://ulaa360.vercel.app` in under 60 seconds!

### Other Cloud Platforms (Render, Railway, Heroku)
- **Procfile** is included: `web: python server.py`
- **Dynamic Port**: The server automatically reads the `PORT` environment variable assigned by cloud hosting platforms.
- **Self-contained**: Built-in HTTP API handler and static asset delivery without complex build pipelines.

---

## 📁 Project Structure

```
ULAA360/
├── app.js                              # Client-side state, map rendering, and API logic
├── index.html                          # Main application UI and dashboards
├── style.css                           # Modern styling and responsive design
├── server.py                           # Python backend HTTP server and REST endpoints
├── requirements.txt                    # Python runtime dependencies
├── Procfile                            # Cloud platform process file
├── .gitignore                          # Ignored temporary files and artifacts
├── assets/
│   └── ulaa360_logo.png                # Official ULAA360 branding logo
├── data/
│   ├── allocation_requests.csv         # Inter-depot request records
│   ├── buses.csv                       # Bus fleet registry and capacities
│   ├── depot_daily_fleet_trips.csv     # Daily depot trip logs
│   ├── divisional_depots.csv           # TNSTC divisional depots master
│   ├── festival_events.csv             # Festival schedules and metadata
│   ├── historical_passenger_demand.csv # Historical passenger crowd data
│   ├── stops.csv                       # Core bus terminal stops
│   ├── tamil_nadu_bus_stand_names_184 (1).csv # 184 Tamil Nadu bus stand dataset
│   ├── ticketing_machine.csv           # ETVM ticketing transaction logs
│   ├── tnstc_*_schedules.csv           # Regional TNSTC timetables & schedules
│   ├── travel_times.csv                # Route travel time matrix
│   └── weather_forecasts.csv           # Weather forecast parameters
├── models/
│   ├── all_bus_stops.json              # Processed 184 stations JSON cache
│   ├── consolidated_fleet_schedules.json # Aggregated schedule registry
│   └── trained_models.joblib           # Pre-trained ML predictive models
└── scripts/
    ├── predictor.py                    # Inference engine & optimization math
    ├── train_predictor.py              # ML training pipeline
    ├── generate_datasets.py            # Dataset synthesis & validation
    └── generate_additional_data.py     # Ancillary test data generator
```

---

## 👥 Contributors & Acknowledgements
- Developed for Tamil Nadu State Transport Corporation (TNSTC) crowd management.
- Repository: [https://github.com/Anbarasi2708/ULAA360](https://github.com/Anbarasi2708/ULAA360)
