"""
Ulaa360 Web Application Server
Updated with:
1. TNSTC Divisional Depots Multi-Corporation Switcher & Credentials Directory
2. Live Inter-Depot Request & Response Workflow (Cross-Depot Notifications)
3. Tri-Stage Fleet Operations (Departed Yesterday, Reached Location, Yet to Arrive)
4. Universal Tamil Nadu Passenger Journey Planner with ETVM Live Bus Capacity
5. Dynamic Differentiation: Normal Towns (Coimbatore) vs Crowded Festival Cities (Thiruvarur/Madurai) with Spare Fleets
"""

import csv
import json
import mimetypes
import os
import random
import sys
import urllib.parse
from datetime import datetime, timedelta
from http.server import HTTPServer, SimpleHTTPRequestHandler

# Import prediction engine
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "scripts"))
from predictor import (
    predict_festival_demand,
    compute_smart_reallocations,
    load_csv,
    search_fleet_buses,
    get_all_stops_list
)

BASE_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(BASE_DIR, "data")
PUBLIC_DIR = BASE_DIR

PORT = 8080

class Ulaa360Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC_DIR, **kwargs)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == "/api/festivals":
            self.send_json_response(self.handle_get_festivals())
        elif path == "/api/predict":
            event_id = query.get("event_id", ["EVT_TVR_THER_2026"])[0]
            self.send_json_response(predict_festival_demand(event_id))
        elif path == "/api/recommendations":
            event_id = query.get("event_id", ["EVT_TVR_THER_2026"])[0]
            self.send_json_response(compute_smart_reallocations(event_id))
        elif path == "/api/stops_and_depots":
            event_id = query.get("event_id", ["EVT_TVR_THER_2026"])[0]
            self.send_json_response(self.handle_get_stops_depots(event_id))
        elif path == "/api/depots_list":
            self.send_json_response(self.handle_get_depots_list())
        elif path == "/api/interdepot_requests":
            depot_id = query.get("depot_id", ["DEP_TVR_01"])[0]
            self.send_json_response(self.handle_get_interdepot_requests(depot_id))
        elif path == "/api/depot_trips":
            depot_id = query.get("depot_id", ["DEP_TVR_01"])[0]
            self.send_json_response(self.handle_get_depot_trips(depot_id))
        elif path == "/api/search_buses":
            origin = query.get("from", [""])[0]
            dest = query.get("to", [""])[0]
            travel_date = query.get("date", ["2026-10-19"])[0]
            time_pref = query.get("time", ["all"])[0]
            self.send_json_response(self.handle_search_buses(origin, dest, travel_date, time_pref))
        elif path == "/api/chatbot":
            q = query.get("q", [""])[0]
            lang = query.get("lang", ["en"])[0]
            self.send_json_response(self.handle_chatbot_query(q, lang))
        elif path == "/api/all_stops":
            self.send_json_response(self.handle_get_all_stops())
        elif path == "/api/datasets":
            self.send_json_response(self.handle_get_datasets_info())
        elif path == "/api/dataset_content":
            filename = query.get("file", [""])[0]
            self.send_json_response(self.handle_get_dataset_content(filename))
        else:
            super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8")
        data = json.loads(body) if body else {}

        if path == "/api/allocate":
            self.send_json_response(self.handle_allocate_action(data))
        elif path == "/api/respond_request":
            self.send_json_response(self.handle_respond_request(data))
        elif path == "/api/add_festival":
            self.send_json_response(self.handle_add_festival(data))
        elif path == "/api/chatbot":
            self.send_json_response(self.handle_chatbot_query(data.get("query", ""), data.get("lang", "en")))
        else:
            self.send_response(404)
            self.end_headers()

    def send_json_response(self, data_obj, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(json.dumps(data_obj).encode("utf-8"))

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    # --- TNSTC DEPOTS LIST WITH PASSWORDS ---
    def handle_get_depots_list(self):
        cred_path = os.path.join(DATA_DIR, "tnstc_depots_credentials.json")
        if os.path.exists(cred_path):
            with open(cred_path, "r", encoding="utf-8") as f:
                return {"depots": json.load(f)}
        return {"depots": []}

    # --- INTER-DEPOT REQUEST & RESPONSE WORKFLOW ---
    def handle_get_interdepot_requests(self, depot_id):
        req_file = os.path.join(DATA_DIR, "allocation_requests.csv")
        incoming = []
        outgoing = []
        
        # Also include sample active requests for demonstration
        # If depot_id is Thiruvarur Central, it sent requests to Mannargudi & Kumbakonam
        if os.path.exists(req_file):
            with open(req_file, "r", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
                for r in reversed(rows[-150:]):
                    req_id = r.get("request_id")
                    from_depot = r.get("requesting_divisional_depot_id")
                    to_depot = r.get("offering_divisional_depot_id")
                    
                    # Incoming request to this offering depot
                    if depot_id in to_depot or to_depot in depot_id:
                        incoming.append(r)
                    # Outgoing request from this requesting depot
                    elif depot_id in from_depot or from_depot in depot_id:
                        outgoing.append(r)

        # Ensure realistic interactive defaults if CSV only has historical rows
        if not incoming and not outgoing:
            outgoing = [
                {
                    "request_id": "REQ_TVR_2026_01",
                    "requesting_divisional_depot_id": depot_id,
                    "offering_divisional_depot_id": "Mannargudi Division Depot (DEP_MNG_01)",
                    "bus_id": "12 Buses (Batch REC_MNG_02)",
                    "requested_at": "2026-10-19 14:30:00",
                    "status": "Confirmed_By_Offering_Depot",
                    "decision_at": "2026-10-19 14:35:12",
                    "response_note": "Confirmed. 12 moffusil buses dispatched via Needamangalam."
                },
                {
                    "request_id": "REQ_TVR_2026_02",
                    "requesting_divisional_depot_id": depot_id,
                    "offering_divisional_depot_id": "Kumbakonam Central Depot (DEP_KUM_01)",
                    "bus_id": "14 Buses (Batch REC_KUM_04)",
                    "requested_at": "2026-10-19 14:45:00",
                    "status": "Pending_Confirmation",
                    "decision_at": "PENDING",
                    "response_note": "Awaiting Kumbakonam depot manager acceptance."
                }
            ]
            incoming = [
                {
                    "request_id": "REQ_INC_901",
                    "requesting_divisional_depot_id": "Thiruvarur Central (DEP_TVR_01)",
                    "offering_divisional_depot_id": depot_id,
                    "bus_id": "4 Standby Shuttles (Batch REC_TVR_LOCAL_01)",
                    "requested_at": "2026-10-19 15:10:00",
                    "status": "Pending_Confirmation",
                    "decision_at": "PENDING",
                    "response_note": "Requesting 4 idle buses currently at Vilamal Outer Stand (2km North)."
                }
            ]

        return {
            "depot_id": depot_id,
            "incoming_requests": incoming[:20],
            "outgoing_requests": outgoing[:20]
        }

    def handle_respond_request(self, data):
        req_id = data.get("request_id")
        decision = data.get("decision", "accept")  # "accept" or "decline"
        note = data.get("response_note", "Actioned by divisional manager.")
        depot_id = data.get("depot_id", "DEP_OFFERING")
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        status = "Confirmed_And_Dispatched" if decision == "accept" else "Declined_No_Reserve"

        # Update in CSV
        req_file = os.path.join(DATA_DIR, "allocation_requests.csv")
        try:
            with open(req_file, "a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=[
                    "request_id", "requesting_divisional_depot_id", "offering_divisional_depot_id",
                    "bus_id", "requested_at", "status", "decision_at"
                ])
                writer.writerow({
                    "request_id": req_id,
                    "requesting_divisional_depot_id": "REQUESTER",
                    "offering_divisional_depot_id": depot_id,
                    "bus_id": "Requested Reallocation Fleet",
                    "requested_at": now_str,
                    "status": status,
                    "decision_at": now_str
                })
        except Exception as e:
            print("Error logging respond request:", e)

        return {
            "success": True,
            "request_id": req_id,
            "decision": decision,
            "status": status,
            "message": f"Successfully {decision}ed bus request {req_id}!"
        }

    # --- TRI-STAGE FLEET OPERATIONS ---
    def handle_get_depot_trips(self, depot_id):
        trips_file = os.path.join(DATA_DIR, "depot_daily_fleet_trips.csv")
        departed_yesterday = []
        reached_destination = []
        yet_to_arrive = []

        if os.path.exists(trips_file):
            with open(trips_file, "r", encoding="utf-8") as f:
                rows = list(csv.DictReader(f))
                # Filter by depot or provide matching regional records
                for r in rows:
                    if r.get("depot_id") == depot_id or len(departed_yesterday) < 8:
                        stage = r.get("stage")
                        if stage == "Departed_Yesterday" and len(departed_yesterday) < 12:
                            departed_yesterday.append(r)
                        elif stage == "Reached_Destination" and len(reached_destination) < 12:
                            reached_destination.append(r)
                        elif stage == "Yet_To_Arrive_In_Transit" and len(yet_to_arrive) < 12:
                            yet_to_arrive.append(r)

        return {
            "depot_id": depot_id,
            "departed_yesterday": departed_yesterday,
            "reached_destination": reached_destination,
            "yet_to_arrive": yet_to_arrive,
            "counts": {
                "departed_yesterday": len(departed_yesterday),
                "reached_destination": len(reached_destination),
                "yet_to_arrive": len(yet_to_arrive)
            }
        }

    # --- UNIVERSAL PASSENGER BUS SEARCH & ETVM CAPACITY (DATE & LOCATION DYNAMIC) ---
    def calculate_bus_fare(self, origin, dest, service_type, is_spare=False):
        if is_spare:
            return 35  # Subsidized flat festival special shuttle fare

        o = origin.lower()
        d = dest.lower()

        # Known major corridor base fare rates (in INR)
        if ("thiruvarur" in o or "thiruvarur" in d) and "kumbakonam" in d:
            base = 40
        elif ("thiruvarur" in o or "thiruvarur" in d) and "mannargudi" in d:
            base = 28
        elif ("thiruvarur" in o or "thiruvarur" in d) and "thanjavur" in d:
            base = 56
        elif ("thiruvarur" in o or "thiruvarur" in d) and "nagapattinam" in d:
            base = 30
        elif ("coimbatore" in o or "coimbatore" in d) and "pollachi" in d:
            base = 35
        elif ("coimbatore" in o or "coimbatore" in d) and "mettupalayam" in d:
            base = 32
        elif ("madurai" in o or "madurai" in d) and "dindigul" in d:
            base = 58
        elif ("madurai" in o or "madurai" in d) and "melur" in d:
            base = 26
        elif ("salem" in o or "salem" in d) and "erode" in d:
            base = 45
        elif ("chennai" in o or "chennai" in d):
            base = 210
        else:
            h = sum(ord(c) for c in (origin + dest)) % 25
            base = 35 + h

        st = service_type.lower()
        if "ordinary" in st or "town" in st:
            return max(20, base - 8)
        elif "deluxe" in st:
            return base + 18
        elif "ultra" in st:
            return base + 35
        elif "express" in st or "point-to-point" in st:
            return base + 10
        else:
            return base

    def handle_search_buses(self, origin, dest, travel_date="2026-10-19", time_pref="all"):
        return search_fleet_buses(origin, dest, travel_date, time_pref)

    # --- DEVOTEE CHATBOT ASSISTANT (BILINGUAL NLP ENGINE) ---
    def handle_chatbot_query(self, query, lang="en"):
        q = (query or "").lower().strip()
        is_tamil = (lang == "ta") or any(ord(c) >= 2944 and ord(c) <= 3071 for c in q) or any(w in q for w in ["எங்கு", "எப்போது", "பேருந்து", "காலி", "மழை", "நெரிசல்", "விலமல்", "கும்பகோணம்"])

        # Intent 1: Spare & Empty Buses Location
        if any(w in q for w in ["spare", "empty", "free bus", "where are", "satellite", "காலி", "உதிரி", "எங்கு நிற்கின்றன", "எங்குள்ளன", "விலமல்"]):
            if is_tamil:
                return {
                    "answer": "🚨 **மத்திய பேருந்து நிலையத்தில் 12 பேருந்துகள் மட்டுமே உள்ளதால் கடும் நெரிசல் நிலவுகிறது.**\n\nமாறாக, **2.1 கி.மீ தொலைவில் உள்ள விலமல் புறவழிச்சாலை நிலையத்திற்கு (Vilamal Outer Stand)** செல்லுங்கள்! அங்கு **4 முதல் 8 காலியான சிறப்பு உதிரி பேருந்துகள் 48+ காலி இருக்கைகளுடன்** காத்திருக்கின்றன.\n\n⚡ கோயில் கிழக்கு வாசலில் (தேரடி) இருந்து 3 நிமிடங்களுக்கு ஒருமுறை **இலவச மின்சார இணைப்பு வாகனங்கள்** இயக்கப்படுகின்றன.",
                    "quick_links": ["விலமல் பேருந்து நிலையம் எங்குள்ளது?", "கும்பகோணத்திற்கு பேருந்து உள்ளதா?", "இருக்கை நிலவரம் என்ன?"]
                }
            else:
                return {
                    "answer": "🚨 **The Main Central Bus Stand has only 12 buses and is severely jammed (people climbing through windows).**\n\nInstead, head to the **Vilamal Outer Bypass Stand (2.1 km North)** where **4 to 8 Special Spare Buses are waiting empty with 48+ free seats**!\n\n⚡ Free connecting electric shuttles depart every 3 minutes from the East Temple Gate (Therady) right to the satellite stand.",
                    "quick_links": ["How to take free shuttle?", "Buses to Kumbakonam?", "Check live seat capacity"]
                }

        # Intent 2: Best Time to Leave / Avoid Rush
        elif any(w in q for w in ["best time", "avoid rush", "when to leave", "crowd peak", "window", "எப்போது கிளம்புவது", "நேரம்", "நெரிசல் தவிர்க்க"]):
            if is_tamil:
                return {
                    "answer": "💡 **முக்கிய அறிவுரை:** திருவிழா நிகழ்ச்சி இரவு **20:30 மணிக்கு** நிறைவடைகிறது. இரவு **20:45 முதல் 22:30 வரை** சுமார் 40,000 பக்தர்கள் ஒரே நேரத்தில் வெளியேறுவதால் உச்சக்கட்ட நெரிசல் ஏற்படும்.\n\n**நெரிசலை தவிர்க்கும் வழிகள்:**\n1. **முன்கூட்டியே புறப்படுதல்:** இரவு 19:45-க்குள் புறப்படுங்கள்.\n2. **2 கி.மீ துணை நிலையம்:** இரவு 20:30-க்கு மேல் கிளம்பினால், மத்திய நிலையத்தை தவிர்த்து **விலமல் புறவழிச்சாலை நிலையத்திற்கு** செல்லுங்கள் (8 நிமிடங்களுக்கு ஒருமுறை தடையற்ற பேருந்துகள்).",
                    "quick_links": ["காலியான உதிரி பேருந்துகள் எங்குள்ளன?", "மழை வருமா?", "இலவச இணைப்பு வாகனம்"]
                }
            else:
                return {
                    "answer": "💡 **Crowd Avoidance Advisory:** The festival chariot programme concludes at **20:30**. Between **20:45 and 22:30**, ~40,000 pilgrims will exit at once, causing severe stampede-like bottlenecks at the main stand.\n\n**Best Strategies:**\n1. **Early Exit:** Depart before 19:45 before the concluding pooja.\n2. **Use 2km Satellite Stand:** If exiting post-20:30, board directly at **Vilamal Outer Bypass Stand** where buses leave every 8 minutes with zero waiting line.",
                    "quick_links": ["Where are empty spare buses?", "Is it going to rain?", "Free feeder shuttles"]
                }

        # Intent 3: Feeder Shuttle / E-rickshaw Link
        elif any(w in q for w in ["shuttle", "e-rickshaw", "feeder", "how to reach", "connect", "இணைப்பு வாகனம்", "எப்படி செல்வது"]):
            if is_tamil:
                return {
                    "answer": "⚡ **இலவச மின்சார இணைப்பு வாகன சேவை:**\n\nகோயில் கிழக்கு வாசல் (தேரடி) பகுதியில் இலவச மின்சார வாகனங்கள் நிறுத்தப்பட்டுள்ளன. அவை 3 நிமிடங்களுக்கு ஒருமுறை புறப்பட்டு, வெறும் **4 நிமிடங்களில் உங்களை விலமல் சிறப்பு பேருந்து நிலையத்திற்கு** அழைத்துச் செல்லும். எந்த கட்டணமும் இல்லை!",
                    "quick_links": ["காலியான உதிரி பேருந்துகள் எங்குள்ளன?", "கும்பகோணம் பேருந்து எப்போது?"]
                }
            else:
                return {
                    "answer": "⚡ **Free Electric Feeder Shuttle Service:**\n\nDesignated electric e-rickshaws are stationed at the **East Temple Chariot Gate (Therady)**. They depart every 3 minutes and reach the **Vilamal Satellite Stand** in under 4 minutes. Free of cost!",
                    "quick_links": ["Where are spare buses parked?", "Buses to Mannargudi?"]
                }

        # Intent 4: Live ETVM Seat Check
        elif any(w in q for w in ["seat", "capacity", "etvm", "ticket", "இருக்கை", "சீட்", "காலி"]):
            if is_tamil:
                return {
                    "answer": "🎫 **நேரடி ETVM இருக்கை கணக்கீடு:**\n\nஉலா360 தளம் அரசு பேருந்துகளின் மின்னணு பயணச்சீட்டு இயந்திரங்களுடன் (ETVM) நேரடியாக இணைக்கப்பட்டுள்ளது.\n\n🟢 **பச்சை நிறம்:** 40+ காலி இருக்கைகள் உள்ளன (உதாரணம்: விலமல் உதிரி பேருந்துகள்).\n🔴 **சிவப்பு நிறம்:** 100% நிரம்பியது (மத்திய பேருந்து நிலைய பேருந்துகள்).\n\nபயண திட்டமிடுதலில் உங்கள் வழித்தடத்தை உள்ளிட்டு இருக்கைகளை உடனுக்குடன் பார்க்கலாம்!",
                    "quick_links": ["கும்பகோணத்திற்கு பேருந்து உள்ளதா?", "பொள்ளாச்சி பேருந்து"]
                }
            else:
                return {
                    "answer": "🎫 **Live ETVM Seat Capacity Tracking:**\n\nUlaa360 synchronizes in real-time with conductor Electronic Ticket Vending Machines (ETVMs).\n\n🟢 **Green:** 40+ Vacant seats available (Spare Satellite fleet).\n🔴 **Red:** 100% Packed / Full capacity (Central Stand regular buses).\n\nUse our journey planner cards above to check live seat numbers before heading out!",
                    "quick_links": ["Buses to Kumbakonam?", "Where are empty buses?"]
                }

        # Intent 5: Weather Forecast
        elif any(w in q for w in ["rain", "weather", "forecast", "மழை", "வானிலை"]):
            if is_tamil:
                return {
                    "answer": "🌦️ **வானிலை எச்சரிக்கை:**\n\nவானிலை முன்னறிவிப்பின்படி இரவு **21:00 மணியளவில் 65% மழை பெய்ய வாய்ப்புள்ளது**. மழை காரணமாக பக்தர்கள் 30 நிமிடங்கள் முன்னதாகவே வெளியேறக்கூடும். எனவே முன்கூட்டியே திட்டமிடுங்கள் அல்லது மேற்கூரை உள்ள விலமல் நிலையத்தை பயன்படுத்துங்கள்.",
                    "quick_links": ["கூட்டத்தை தவிர்க்க எப்போது கிளம்புவது?", "காலியான பேருந்துகள் எங்கு நிற்கின்றன?"]
                }
            else:
                return {
                    "answer": "🌦️ **Weather Alert:**\n\nMeteorological radar forecasts a **65% probability of evening showers around 21:00**. In past festivals, sudden rain accelerated mass departures by 30 minutes. Plan an early return or take the covered Vilamal Satellite platform.",
                    "quick_links": ["Best time to leave?", "Where are empty buses?"]
                }

        # Intent 6: Coimbatore / Regular City
        elif any(w in q for w in ["coimbatore", "pollachi", "erode", "கோயம்புத்தூர்", "பொள்ளாச்சி"]):
            if is_tamil:
                return {
                    "answer": "🏙️ **கோயம்புத்தூர் மண்டல பேருந்துகள்:**\n\nகாந்திபுரம், உக்கடம் மற்றும் சிங்காநல்லூர் பேருந்து நிலையங்களில் இருந்து வழக்கமான TNSTC பேருந்துகள் தடையின்றி இயங்குகின்றன. இருக்கை வசதி 40-60% தாராளமாக உள்ளது. திருவிழா நெரிசல் இங்கு பொருந்தாது.",
                    "quick_links": ["கோயம்புத்தூர் - பொள்ளாச்சி பேருந்துகள்", "இருக்கை நிலவரம்"]
                }
            else:
                return {
                    "answer": "🏙️ **Coimbatore Regional Transit:**\n\nRegular TNSTC services operate normally from Gandhipuram, Ukkadam, and Singanallur hubs with comfortable 40-60% seat occupancies. No festival overcrowding applies in Coimbatore.",
                    "quick_links": ["Coimbatore to Pollachi buses", "Check seat occupancy"]
                }

        # Intent 7: Madurai Chithirai Festival
        elif any(w in q for w in ["madurai", "chithirai", "alagar", "vaigai", "goripalayam", "மதுரை", "அழகர்", "சித்திரை"]):
            if is_tamil:
                return {
                    "answer": "🚩 **மதுரை சித்திரை திருவிழா நேரடி வழிகாட்டி:**\n\nஸ்ரீ கள்ளழகர் வைகை ஆற்றில் எழுந்தருளும் வைபவத்திற்குப் பிறகு மாட்டுத்தாவணி (MIBT) பேருந்து நிலையத்தில் கடுமையான நெரிசல் ஏற்படும்.\n\n• **2 கி.மீ புறவழிச்சாலை (Madurai Ring Road By-Pass):** இங்கு 6 உதிரி பேருந்துகள் காலி இருக்கைகளுடன் காத்திருக்கின்றன!\n• **கோரிப்பாளையம்:** வைகை ஆற்றங்கரையில் இருந்து 3 நிமிட மின்சார இணைப்பு வாகனங்கள் இயக்கப்படுகின்றன.",
                    "quick_links": ["காலியான உதிரி பேருந்துகள் எங்கு நிற்கின்றன?", "கூட்ட நெரிசலை தவிர்க்க எப்போது கிளம்புவது?"]
                }
            else:
                return {
                    "answer": "🚩 **Madurai Chithirai Festival Transit Guide:**\n\nFollowing Lord Kallazhagar's Vaigai River entry, Mattuthavani Terminus (MIBT) experiences critical crowd surges.\n\n• **2km Satellite Stand (Madurai Ring Road By-Pass):** 6 standby buses are staged empty with guaranteed seating!\n• **Feeder Link:** Free 3-minute shuttles operate from Goripalayam Vaigai bank directly to the bypass stand.",
                    "quick_links": ["Where are empty spare buses parked?", "Best time to leave?"]
                }

        # Intent 8: Fares & Ticket Booking
        elif any(w in q for w in ["fare", "ticket", "cost", "price", "book", "online", "கட்டணம்", "டிக்கெட்", "விலை", "பதிவு"]):
            if is_tamil:
                return {
                    "answer": "🎟️ **கட்டணம் மற்றும் பயணச்சீட்டு தகவல்:**\n\n• திருவிழா சிறப்பு உதிரி பேருந்துகளுக்கு அரசு வழக்கமான கட்டணமே வசூலிக்கப்படுகிறது (கூடுதல் கட்டணம் இல்லை!).\n• பேருந்திலேயே நடத்துநரிடம் (ETVM இயந்திரம் மூலம்) பயணச்சீட்டு பெறலாம். முன்கூட்டிய முன்பதிவு தேவையில்லை.\n• கோயில் வாசலில் இருந்து விலமல் நிலையம் வரை செல்லும் **மின்சார இணைப்பு வாகனங்கள் 100% இலவசம்**!",
                    "quick_links": ["இருக்கை நிலவரம் என்ன?", "காலியான உதிரி பேருந்துகள் எங்கு நிற்கின்றன?"]
                }
            else:
                return {
                    "answer": "🎟️ **Fares & Ticketing Information:**\n\n• Festival Special Spare buses charge standard Government regulated TNSTC fares (no surge pricing!).\n• Tickets are issued on-board by conductors via ETVM handheld machines. No advance booking is required.\n• The connecting electric shuttles from the temple grounds to the 2km satellite stand are **100% Free**!",
                    "quick_links": ["Check live seat capacity", "Where are empty buses?"]
                }

        # Intent 9: Specific Route Enquiry (Kumbakonam, Thanjavur, Mannargudi, Dindigul, Trichy)
        elif any(w in q for w in ["kumbakonam", "thanjavur", "mannargudi", "dindigul", "trichy", "chennai", "கும்பகோணம்", "தஞ்சாவூர்", "மன்னார்குடி", "திண்டுக்கல்"]):
            if is_tamil:
                return {
                    "answer": "🚍 **வழித்தட பேருந்து விவரங்கள்:**\n\nவிலமல் புறவழிச்சாலை துணை நிலையத்திலிருந்து (2.1 கி.மீ வடக்கு) கும்பகோணம், தஞ்சாவூர், மன்னார்குடி மற்றும் நாகப்பட்டினம் நோக்கி **ஒவ்வொரு 8 முதல் 12 நிமிடங்களுக்கும் நேரடி சிறப்பு பேருந்துகள்** புறப்படுகின்றன!\n\nமேலே உள்ள பயண திட்டமிடுதலில் உங்கள் சேருமிடத்தைத் தேர்ந்தெடுத்து பேருந்துகளின் நேரத்தை உடனே பார்க்கலாம்.",
                    "quick_links": ["இலவச இணைப்பு வாகனம் எங்கு கிடைக்கும்?", "இருக்கை நிலவரம் என்ன?"]
                }
            else:
                return {
                    "answer": "🚍 **Route Specific Departures:**\n\nDirect festival specials depart every **8 to 12 minutes** from the **Vilamal Outer Satellite Stand (2.1km North)** to Kumbakonam, Thanjavur, Mannargudi, and Nagapattinam with guaranteed vacant seats!\n\nUse our Journey Planner above to see exact bus timings and platform bays.",
                    "quick_links": ["How to take free shuttle?", "Check live seat capacity"]
                }

        # Default Greeting / Fallback
        else:
            if is_tamil:
                return {
                    "answer": f"வணக்கம்! நான் உங்கள் **உலா360 திருவிழா உதவியாளர்**. நீங்கள் கேட்டது: *\"{query}\"*\n\nதிருவிழா காலங்களில் மத்திய பேருந்து நிலைய நெரிசலை தவிர்த்து, 2 கி.மீ தொலைவில் உள்ள காலியான உதிரி பேருந்துகளை அடையவும், நேரடி இருக்கை நிலவரத்தை அறியவும் நான் உங்களுக்கு வழிகாட்டுகிறேன். கீழே உள்ள விரைவு வினாக்களை கிளிக் செய்யவும்!",
                    "quick_links": ["காலியான உதிரி பேருந்துகள் எங்கு நிற்கின்றன?", "கூட்ட நெரிசலை தவிர்க்க எப்போது கிளம்புவது?", "இலவச இணைப்பு வாகனம் எங்கு கிடைக்கும்?"]
                }
            else:
                return {
                    "answer": f"Vanakkam! I am your **Ulaa360 Transit Assistant**. You asked: *\"{query}\"*\n\nI can help you navigate festival crowd surges, find the 2km empty spare buses, check live ETVM seat vacancies, and guide you to free feeder e-rickshaws. Click any quick question below or ask me anything!",
                    "quick_links": ["Where are empty spare buses parked?", "What is the best time to leave to avoid rush?", "How to take free feeder shuttle?"]
                }

    # --- ALL TAMIL NADU STOPS FOR PASSENGER AUTOCOMPLETE ---
    def handle_get_all_stops(self):
        stops = get_all_stops_list()
        return {"stops": stops}

    # --- JURY DATASETS HANDLERS ---
    def handle_get_datasets_info(self):
        files = [
            "tamil_nadu_bus_stand_names_184 (1).csv",
            "tnstc_kumbakonam_schedules.csv",
            "tnstc_coimbatore_schedules.csv",
            "tnstc_madurai_schedules.csv",
            "tnstc_salem_schedules.csv",
            "tnstc_tirunelveli_schedules.csv",
            "villupuram.csv",
            "ticket_vending_machine_logs.csv",
            "ticketing_machine.csv",
            "depot_daily_fleet_trips.csv",
            "historical_passenger_demand.csv",
            "stops.csv",
            "divisional_depots.csv",
            "buses.csv",
            "travel_times.csv",
            "festival_events.csv",
            "weather_forecasts.csv",
            "scheduled_services.csv",
            "allocation_requests.csv",
            "festival_actuals.csv"
        ]
        info_list = []
        for fn in files:
            p = os.path.join(DATA_DIR, fn)
            if os.path.exists(p):
                with open(p, "r", encoding="utf-8") as f:
                    reader = csv.reader(f)
                    headers = next(reader, [])
                    row_count = sum(1 for _ in reader)
                info_list.append({
                    "filename": fn,
                    "rows": row_count,
                    "columns": headers,
                    "size_bytes": os.path.getsize(p)
                })
        return {"datasets": info_list}

    def handle_get_dataset_content(self, filename):
        safe_name = os.path.basename(filename)
        p = os.path.join(DATA_DIR, safe_name)
        if not os.path.exists(p):
            return {"error": "File not found"}
        with open(p, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = []
            for i, r in enumerate(reader):
                if i >= 50:
                    break
                rows.append(r)
            return {"filename": safe_name, "sample_rows": rows}

    def handle_get_festivals(self):
        events = load_csv("festival_events.csv")
        primary_ids = ["EVT_TVR_THER_2026", "EVT_MDU_AZHAGAR_2026"]
        top_events = [e for e in events if e.get("event_id") in primary_ids]
        other_events = [e for e in events if e.get("event_id") not in primary_ids][:15]
        return {"festivals": top_events + other_events, "total_recorded": len(events)}

    def handle_get_stops_depots(self, event_id):
        stops = load_csv("stops.csv")
        depots = load_csv("divisional_depots.csv")
        is_tvr = ("TVR" in event_id)
        center = [79.6370, 10.7730] if is_tvr else [78.1310, 9.9287]

        reg_filter = "Thiruvarur" if is_tvr else "Madurai"
        relevant_stops = [s for s in stops if reg_filter.lower() in s["stop_name"].lower() or s["stop_id"].startswith("STOP_TVR" if is_tvr else "STOP_MDU")][:20]
        relevant_depots = [d for d in depots if reg_filter.lower() in d["depot_name"].lower() or d["divisional_depot_id"].startswith("DEP_TVR" if is_tvr else "DEP_MDU")][:15]

        if is_tvr:
            core_stops = [
                {
                    "stop_id": "STOP_TVR_CENTRAL",
                    "stop_name": "Thiruvarur Central Municipal Bus Stand (Main Hub)",
                    "latitude": 10.7730,
                    "longitude": 79.6370,
                    "safe_waiting_capacity": 1200,
                    "current_waiting_crowd": 38400,
                    "status": "CRITICAL_OVERCROWDED",
                    "buses_at_stop": 12,
                    "details": "🚨 12 buses scheduled. Stand overwhelmed, window climbing reported."
                },
                {
                    "stop_id": "STOP_TVR_OUTER2K",
                    "stop_name": "Vilamal Outer Bypass Stand (2km North)",
                    "latitude": 10.7910,
                    "longitude": 79.6250,
                    "safe_waiting_capacity": 850,
                    "current_waiting_crowd": 12,
                    "status": "SURPLUS_EMPTY",
                    "buses_at_stop": 4,
                    "details": "🟢 4 buses waiting empty with virtually no passengers! Only 2.1 km (8 mins) away."
                },
                {
                    "stop_id": "STOP_TVR_THERADY",
                    "stop_name": "Therady Chariot Grounds East Gate",
                    "latitude": 10.7765,
                    "longitude": 79.6328,
                    "safe_waiting_capacity": 950,
                    "current_waiting_crowd": 24000,
                    "status": "HIGH_SURGE",
                    "buses_at_stop": 6,
                    "details": "Major exit convergence from Temple Car route."
                }
            ]
        else:
            core_stops = [
                {
                    "stop_id": "STOP_MDU_MAIN",
                    "stop_name": "Mattuthavani Integrated Terminus (MIBT)",
                    "latitude": 9.9481,
                    "longitude": 78.1561,
                    "safe_waiting_capacity": 1600,
                    "current_waiting_crowd": 42000,
                    "status": "CRITICAL_OVERCROWDED",
                    "buses_at_stop": 14,
                    "details": "🚨 Huge crowd convergence after Lord Kallazhagar returns from Vaigai River."
                },
                {
                    "stop_id": "STOP_MDU_OUTER2K",
                    "stop_name": "Madurai Ring Road By-Pass Stop (2km East)",
                    "latitude": 9.9405,
                    "longitude": 78.1750,
                    "safe_waiting_capacity": 900,
                    "current_waiting_crowd": 18,
                    "status": "SURPLUS_EMPTY",
                    "buses_at_stop": 6,
                    "details": "🟢 6 buses waiting empty 2 km away. ETA to MIBT is 7 mins."
                },
                {
                    "stop_id": "STOP_MDU_GORI",
                    "stop_name": "Goripalayam Vaigai Bank Stop",
                    "latitude": 9.9295,
                    "longitude": 78.1305,
                    "safe_waiting_capacity": 800,
                    "current_waiting_crowd": 31000,
                    "status": "HIGH_SURGE",
                    "buses_at_stop": 8,
                    "details": "Primary devotee entry/exit near Vaigai riverbed."
                }
            ]

        return {
            "center": center,
            "core_stops": core_stops,
            "relevant_stops": relevant_stops,
            "relevant_depots": relevant_depots
        }

    def handle_allocate_action(self, data):
        rec_id = data.get("recommendation_id")
        action = data.get("action", "approve")
        donor_depot = data.get("donor_depot_name", "Nearby Regional Depot")
        bus_count = data.get("bus_count", 4)
        req_depot = data.get("requesting_depot", "Thiruvarur Central (DEP_TVR_01)")

        req_file = os.path.join(DATA_DIR, "allocation_requests.csv")
        req_id = f"REQ_ACT_{int(datetime.now().timestamp())}"
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        status_map = {
            "approve": "Requested_Sent_To_Offering_Depot",
            "confirm": "Confirmed_By_Offering_Depot",
            "dispatch": "Dispatched_In_Transit"
        }
        final_status = status_map.get(action, "Approved")

        new_row = {
            "request_id": req_id,
            "requesting_divisional_depot_id": req_depot,
            "offering_divisional_depot_id": donor_depot,
            "bus_id": f"{bus_count} Buses (Batch {rec_id})",
            "requested_at": now_str,
            "status": final_status,
            "decision_at": now_str
        }

        try:
            with open(req_file, "a", newline="", encoding="utf-8") as f:
                writer = csv.DictWriter(f, fieldnames=[
                    "request_id", "requesting_divisional_depot_id", "offering_divisional_depot_id",
                    "bus_id", "requested_at", "status", "decision_at"
                ])
                writer.writerow(new_row)
        except Exception as e:
            print("Error appending allocation request:", e)

        return {
            "success": True,
            "request_id": req_id,
            "recommendation_id": rec_id,
            "new_status": final_status,
            "message": f"Successfully processed {action} for {bus_count} buses from {donor_depot}!"
        }

    def handle_add_festival(self, data):
        event_name = data.get("event_name", "Local Oor Thiruvizha")
        event_type = data.get("event_type", "Oor Thiruvizha")
        dest_stop = data.get("destination_stop", "STOP_TVR_CENTRAL")
        start_dt = data.get("start_datetime", "2026-11-05 06:00:00")
        end_dt = data.get("programme_end_datetime", "2026-11-05 21:00:00")
        attendance = int(data.get("expected_attendance", 35000))

        event_id = f"EVT_CUSTOM_{int(datetime.now().timestamp())}"
        new_event = {
            "event_id": event_id,
            "event_name": event_name,
            "event_type": event_type,
            "festival_destination_stop_id": dest_stop,
            "start_datetime": start_dt,
            "programme_end_datetime": end_dt,
            "expected_attendance": attendance,
            "expected_departure_window_start": end_dt,
            "expected_departure_window_end": (datetime.strptime(end_dt, "%Y-%m-%d %H:%M:%S") + timedelta(hours=3)).strftime("%Y-%m-%d %H:%M:%S")
        }

        ev_file = os.path.join(DATA_DIR, "festival_events.csv")
        with open(ev_file, "a", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=[
                "event_id", "event_name", "event_type", "festival_destination_stop_id",
                "start_datetime", "programme_end_datetime", "expected_attendance",
                "expected_departure_window_start", "expected_departure_window_end"
            ])
            writer.writerow(new_event)

        return {"success": True, "event": new_event}


def run_server():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, Ulaa360Handler)
    print(f"Ulaa360 Server running at http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
