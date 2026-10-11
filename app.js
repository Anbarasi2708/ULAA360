/**
 * Ulaa360 - Frontend Application Controller
 * Clean White Transit Theme Edition:
 * 1. TNSTC Multi-Corporation Divisional Depots Switcher & Credentials Directory
 * 2. Cross-Depot Request & Response Workflow (Digital Negotiation Loop)
 * 3. Tri-Stage Daily Fleet Operations: 3-Column Visual Kanban Board (Departed, Reached, Yet to Arrive)
 * 4. Universal Tamil Nadu Passenger Journey Planner with Visual Transit Ticket Cards & ETVM Live Capacity
 * 5. Dynamic Differentiation: Normal City (Coimbatore) vs Festival City (Thiruvarur/Madurai) with Spare Fleet
 * 6. Mapbox Light-v11 Transit Map & Chart.js Visualizations
 */

const MAPBOX_TOKEN = "pk.eyJ1IjoibWFoYWRoYXJhbmkiLCJhIjoiY212MmRhZ2dsMGVlZDJ5cXY0bnJwaGVydiJ9.L7ri0Nl8X1WpvdqzqvjraQ";

// Global State
let currentRole = "admin";
let currentEventId = "EVT_TVR_THER_2026";
let currentDepotId = "DEP_TVR_01";
let currentLanguage = "en";

let tnstcDepots = [];
let allTripsData = { departed_yesterday: [], reached_destination: [], yet_to_arrive: [] };
let activeRecommendations = [];
let securedBuses = 0;
let totalRequiredBuses = 52;

let mapInstance = null;
let mapMarkers = [];
let surgeChartInstance = null;
let feederChartInstance = null;

// Document Ready Initialization
document.addEventListener("DOMContentLoaded", () => {
  const savedRole = sessionStorage.getItem("ulaa360_role");
  if (savedRole) {
    document.getElementById("role-gate-modal").style.display = "none";
    setRole(savedRole);
  } else {
    document.getElementById("role-gate-modal").style.display = "flex";
  }

  initMapbox();
  loadFestivalData();
  initDepotsDirectory();
  initStopsDatalist();
  loadDepotOperations(currentDepotId);
  executePassengerSearch(); // default search for initial passenger view
  initDevoteeChatbot(); // initialize devotee voice chatbot assistant
});

// ============================================================================
// 1. ROLE SWITCHING & LANDING GATE
// ============================================================================
function selectRole(role) {
  sessionStorage.setItem("ulaa360_role", role);
  document.getElementById("role-gate-modal").style.display = "none";
  setRole(role);
}

function setRole(role) {
  currentRole = role;
  const adminView = document.getElementById("admin-view");
  const userView = document.getElementById("user-view");
  const adminBtn = document.getElementById("nav-btn-admin");
  const userBtn = document.getElementById("nav-btn-user");

  if (role === "admin") {
    adminView.style.display = "block";
    userView.style.display = "none";
    adminBtn.classList.add("active");
    userBtn.classList.remove("active");
    setTimeout(() => { if (mapInstance) mapInstance.resize(); }, 150);
  } else {
    adminView.style.display = "none";
    userView.style.display = "block";
    adminBtn.classList.remove("active");
    userBtn.classList.add("active");
    initDevoteeChatbot();
  }
}

function toggleRoleModal() {
  const modal = document.getElementById("role-gate-modal");
  modal.style.display = (modal.style.display === "flex") ? "none" : "flex";
}

// ============================================================================
// 2. TNSTC DIVISIONAL DEPOTS SWITCHER & CREDENTIALS DIRECTORY
// ============================================================================
async function initDepotsDirectory() {
  try {
    const res = await fetch("/api/depots_list");
    const data = await res.json();
    tnstcDepots = data.depots || [];

    const select = document.getElementById("active-depot-select");
    const credTbody = document.getElementById("credentials-tbody");
    select.innerHTML = "";
    credTbody.innerHTML = "";

    // Group depots by corporation
    const corps = {};
    tnstcDepots.forEach(d => {
      if (!corps[d.corp]) corps[d.corp] = [];
      corps[d.corp].push(d);
    });

    Object.keys(corps).forEach(corpName => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = corpName;

      corps[corpName].forEach(depot => {
        const opt = document.createElement("option");
        opt.value = depot.id;
        opt.innerText = `${depot.name} (${depot.region})`;
        if (depot.id === currentDepotId) opt.selected = true;
        optgroup.appendChild(opt);

        // Populate Credentials Table
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><code>${depot.id}</code></td>
          <td><strong>${depot.name}</strong></td>
          <td><span class="badge-rowcount">${depot.corp}</span></td>
          <td>${depot.region}</td>
          <td><code style="color: #0284c7; font-weight: 700;">${depot.username}</code></td>
          <td><code style="color: #059669; font-weight: 700;">${depot.password}</code></td>
          <td>${depot.contact}</td>
          <td>
            <button class="btn-table-action" onclick="switchToDepot('${depot.id}')">Switch Active</button>
          </td>
        `;
        credTbody.appendChild(tr);
      });

      select.appendChild(optgroup);
    });

    updateActiveDepotBadge();

  } catch (err) {
    console.error("Failed to load depots directory:", err);
  }
}

function onDepotChanged() {
  const select = document.getElementById("active-depot-select");
  currentDepotId = select.value;
  updateActiveDepotBadge();
  loadDepotOperations(currentDepotId);
}

function switchToDepot(depotId) {
  currentDepotId = depotId;
  document.getElementById("active-depot-select").value = depotId;
  updateActiveDepotBadge();
  closeCredentialsModal();
  loadDepotOperations(currentDepotId);
}

function updateActiveDepotBadge() {
  const depot = tnstcDepots.find(d => d.id === currentDepotId);
  const badge = document.getElementById("active-depot-corp-badge");
  if (depot && badge) {
    badge.innerText = depot.corp;
  }
}

function openCredentialsModal() {
  document.getElementById("credentials-modal").style.display = "flex";
}

function closeCredentialsModal() {
  document.getElementById("credentials-modal").style.display = "none";
}

// ============================================================================
// 3. CROSS-DEPOT REQUEST & RESPONSE WORKFLOW
// ============================================================================
async function loadDepotOperations(depotId) {
  await loadInterDepotRequests(depotId);
  await loadTriStageTrips(depotId);
}

async function loadInterDepotRequests(depotId) {
  try {
    const res = await fetch(`/api/interdepot_requests?depot_id=${depotId}`);
    const data = await res.json();

    const inList = document.getElementById("incoming-requests-list");
    const outList = document.getElementById("outgoing-requests-list");
    const inBadge = document.getElementById("incoming-req-badge");
    const outBadge = document.getElementById("outgoing-req-badge");

    inList.innerHTML = "";
    outList.innerHTML = "";

    // 1. Incoming Requests to this depot
    const incoming = data.incoming_requests || [];
    inBadge.innerText = `${incoming.length} Request${incoming.length === 1 ? '' : 's'}`;

    if (incoming.length === 0) {
      inList.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-muted); padding: 8px;">No incoming requests for this depot currently.</div>`;
    } else {
      incoming.forEach(req => {
        const item = document.createElement("div");
        item.style.cssText = `background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; font-size: 0.82rem; box-shadow: var(--shadow-sm);`;
        
        const isPending = (req.status === "Pending_Confirmation" || req.status.includes("Sent"));
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #0284c7;">From: ${req.requesting_divisional_depot_id}</strong>
            <span style="font-size: 0.72rem; color: ${isPending ? '#d97706' : '#059669'}; font-weight: 700;">
              ${req.status.replace(/_/g, " ")}
            </span>
          </div>
          <div style="color: var(--text-main); margin-bottom: 6px;">
            Requesting: <strong>${req.bus_id}</strong> (${req.requested_at})
          </div>
          <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 8px;">
            ${req.response_note || 'Requesting standby festival buses.'}
          </div>
          ${isPending ? `
            <div style="display: flex; gap: 8px;">
              <button class="btn-primary-sm" style="padding: 5px 12px; font-size: 0.76rem;" onclick="respondToIncomingRequest('${req.request_id}', 'accept')">
                ✓ Accept & Dispatch
              </button>
              <button class="btn-secondary" style="padding: 5px 12px; font-size: 0.76rem;" onclick="respondToIncomingRequest('${req.request_id}', 'decline')">
                Decline
              </button>
            </div>
          ` : `
            <span style="color: #059669; font-size: 0.76rem; font-weight: 700;">✓ Dispatched to festival hub</span>
          `}
        `;
        inList.appendChild(item);
      });
    }

    // 2. Outgoing Requests from this depot
    const outgoing = data.outgoing_requests || [];
    outBadge.innerText = `${outgoing.length} Active`;

    if (outgoing.length === 0) {
      outList.innerHTML = `<div style="font-size: 0.82rem; color: var(--text-muted); padding: 8px;">No outgoing reallocation requests sent yet.</div>`;
    } else {
      outgoing.forEach(req => {
        const item = document.createElement("div");
        item.style.cssText = `background: #ffffff; border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 12px; font-size: 0.82rem; box-shadow: var(--shadow-sm);`;

        const isConfirmed = req.status.includes("Confirmed") || req.status.includes("Dispatched");
        item.innerHTML = `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #059669;">To: ${req.offering_divisional_depot_id}</strong>
            <span style="font-size: 0.72rem; color: ${isConfirmed ? '#059669' : '#d97706'}; font-weight: 700;">
              ${req.status.replace(/_/g, " ")}
            </span>
          </div>
          <div style="color: var(--text-main); margin-bottom: 4px;">
            Requested Fleet: <strong>${req.bus_id}</strong>
          </div>
          <div style="font-size: 0.76rem; color: ${isConfirmed ? '#065f46' : 'var(--text-muted)'};">
            <strong>Response:</strong> ${req.response_note || 'Awaiting depot decision.'}
          </div>
        `;
        outList.appendChild(item);
      });
    }

  } catch (err) {
    console.error("Error loading inter-depot requests:", err);
  }
}

async function respondToIncomingRequest(requestId, decision) {
  try {
    const res = await fetch("/api/respond_request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        request_id: requestId,
        decision: decision,
        depot_id: currentDepotId
      })
    });
    const result = await res.json();
    if (result.success) {
      alert(`Request ${requestId} ${decision}ed successfully! Notification sent.`);
      loadInterDepotRequests(currentDepotId);
    }
  } catch (err) {
    console.error("Error responding to request:", err);
  }
}

// ============================================================================
// 4. TRI-STAGE FLEET OPERATIONS: 3-COLUMN KANBAN BOARD
// ============================================================================
async function loadTriStageTrips(depotId) {
  try {
    const res = await fetch(`/api/depot_trips?depot_id=${depotId}`);
    allTripsData = await res.json();

    document.getElementById("count-departed").innerText = allTripsData.counts.departed_yesterday;
    document.getElementById("count-reached").innerText = allTripsData.counts.reached_destination;
    document.getElementById("count-intransit").innerText = allTripsData.counts.yet_to_arrive;

    renderTripsKanban();

  } catch (err) {
    console.error("Error loading tri-stage trips:", err);
  }
}

function renderTripsKanban() {
  const departedStack = document.getElementById("kanban-departed-stack");
  const reachedStack = document.getElementById("kanban-reached-stack");
  const intransitStack = document.getElementById("kanban-intransit-stack");

  departedStack.innerHTML = "";
  reachedStack.innerHTML = "";
  intransitStack.innerHTML = "";

  // 1. Departed Yesterday
  (allTripsData.departed_yesterday || []).forEach(trip => {
    departedStack.appendChild(createTripKanbanCard(trip, "departed"));
  });

  // 2. Reached Destination
  (allTripsData.reached_destination || []).forEach(trip => {
    reachedStack.appendChild(createTripKanbanCard(trip, "reached"));
  });

  // 3. Yet to Arrive / In-Transit
  (allTripsData.yet_to_arrive || []).forEach(trip => {
    intransitStack.appendChild(createTripKanbanCard(trip, "intransit"));
  });
}

function createTripKanbanCard(trip, stage) {
  const card = document.createElement("div");
  card.className = "kanban-trip-card";

  const occ = 15 + (Math.abs(hashString(trip.bus_id)) % 38);
  const cap = 55;
  const occPct = Math.round((occ / cap) * 100);
  const fillClass = occPct > 80 ? "fill-red" : (occPct > 45 ? "fill-amber" : "fill-green");

  let statusBadge = "";
  if (stage === "departed") {
    statusBadge = `<span style="font-size: 0.72rem; color: #64748b; font-weight: 700; background: #f1f5f9; padding: 2px 7px; border-radius: 4px;">✓ Checked in Bay</span>`;
  } else if (stage === "reached") {
    statusBadge = `<span style="font-size: 0.72rem; color: #059669; font-weight: 700; background: #ecfdf5; padding: 2px 7px; border-radius: 4px;">✓ Platform Docked</span>`;
  } else {
    statusBadge = `<span style="font-size: 0.72rem; color: #0284c7; font-weight: 700; background: #eff6ff; padding: 2px 7px; border-radius: 4px;">⏳ En Route (ETA ${trip.scheduled_arrival_timestamp.slice(11)})</span>`;
  }

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
      <strong style="color: var(--accent-blue); font-size: 0.88rem;">${trip.bus_id}</strong>
      ${statusBadge}
    </div>
    <div style="font-size: 0.84rem; font-weight: 700; color: var(--text-main); margin-bottom: 4px;">
      ${trip.route_name}
    </div>
    <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 8px;">
      📍 <code>${trip.current_location_or_dock}</code> &bull; Crew: ${trip.driver_crew_id}
    </div>
    <div style="background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px; padding: 6px 8px;">
      <div style="display: flex; justify-content: space-between; font-size: 0.72rem; font-weight: 700; margin-bottom: 3px;">
        <span>ETVM Live Capacity</span>
        <span style="color: ${occPct > 80 ? '#dc2626' : '#059669'};">${occ}/${cap} seats (${occPct}%)</span>
      </div>
      <div class="etvm-bar-track" style="height: 6px;">
        <div class="etvm-bar-fill ${fillClass}" style="width: ${occPct}%;"></div>
      </div>
    </div>
  `;
  return card;
}

function hashString(s) {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = ((hash << 5) - hash) + s.charCodeAt(i);
  return hash;
}

// ============================================================================
// 5. UNIVERSAL PASSENGER JOURNEY PLANNER: TRANSIT TICKET CARDS
// ============================================================================
async function initStopsDatalist() {
  try {
    const res = await fetch("/api/all_stops");
    const data = await res.json();
    const datalist = document.getElementById("tn-stops-list");
    datalist.innerHTML = "";
    (data.stops || []).forEach(stop => {
      const opt = document.createElement("option");
      opt.value = stop;
      datalist.appendChild(opt);
    });
  } catch (err) {
    console.error("Error loading stops datalist:", err);
  }
}

function setQuickSearch(fromStop, toStop, travelDate = "2026-10-19", timeSlot = "Evening") {
  const fromEl = document.getElementById("search-from-input");
  const toEl = document.getElementById("search-to-input");
  const dateEl = document.getElementById("search-date-input");
  const timeEl = document.getElementById("search-time-select");

  if (fromEl) fromEl.value = fromStop;
  if (toEl) toEl.value = toStop;
  if (dateEl) dateEl.value = travelDate;
  if (timeEl) timeEl.value = timeSlot;

  executePassengerSearch();
}

function swapPassengerRoute() {
  const fromEl = document.getElementById("search-from-input");
  const toEl = document.getElementById("search-to-input");
  if (!fromEl || !toEl) return;
  const temp = fromEl.value;
  fromEl.value = toEl.value;
  toEl.value = temp;
  executePassengerSearch();
}

async function executePassengerSearch() {
  const from = (document.getElementById("search-from-input")?.value || "").trim();
  const to = (document.getElementById("search-to-input")?.value || "").trim();
  const travelDate = document.getElementById("search-date-input")?.value || "2026-10-19";
  const timeSlot = document.getElementById("search-time-select")?.value || "all";

  // Update Summary Bar
  const routeText = document.getElementById("summary-route-text");
  const dateText = document.getElementById("summary-date-text");
  const surgeChip = document.getElementById("summary-surge-chip");
  const spareChip = document.getElementById("summary-spare-chip");
  const busesChip = document.getElementById("summary-buses-chip");

  if (routeText) routeText.innerText = `${from || "Origin"} ➔ ${to || "Destination"}`;
  if (dateText) {
    const dObj = new Date(travelDate);
    const dFormatted = !isNaN(dObj.getTime()) ? dObj.toLocaleDateString("en-GB", { day: 'numeric', month: 'short', year: 'numeric' }) : travelDate;
    dateText.innerText = `Travel Date: ${dFormatted} • Slot: ${timeSlot}`;
  }

  try {
    const url = `/api/search_buses?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(travelDate)}&time=${encodeURIComponent(timeSlot)}`;
    const res = await fetch(url);
    const data = await res.json();

    const spareBox = document.getElementById("festival-spare-fleet-box");
    const spareGrid = document.getElementById("spare-buses-grid");
    const regGrid = document.getElementById("regular-buses-grid");

    if (spareGrid) spareGrid.innerHTML = "";
    if (regGrid) regGrid.innerHTML = "";

    const totalFound = (data.spare_buses?.length || 0) + (data.regular_buses?.length || 0);
    if (busesChip) busesChip.innerText = `Total ${totalFound} Services Available`;

    // Update status chips based on strict IF condition: has_spare_buses
    if (data.has_spare_buses) {
      if (surgeChip) {
        surgeChip.className = "journey-stat-chip surge";
        surgeChip.innerText = `🚨 ${data.spare_bus_condition_note || 'Festival Departure Surge'}`;
        surgeChip.style.display = "inline-flex";
      }
      if (spareChip) {
        spareChip.className = "journey-stat-chip safe";
        spareChip.innerText = "🌟 48 Free Seats at 2km Satellite Stand";
        spareChip.style.display = "inline-flex";
      }
    } else {
      if (surgeChip) {
        surgeChip.className = "journey-stat-chip safe";
        surgeChip.innerText = "🏙️ Normal Transit Corridor (Regular Schedules)";
        surgeChip.style.display = "inline-flex";
      }
      if (spareChip) {
        spareChip.style.display = "none";
      }
    }

    // 1. Festival Special & Spare Fleet Cards (Rendered ONLY if departing from festival town on surge dates)
    if (data.has_spare_buses && data.spare_buses && data.spare_buses.length > 0) {
      if (spareBox) spareBox.style.display = "block";

      const condDesc = document.getElementById("spare-fleet-condition-desc");
      if (condDesc && data.festival_info?.eligibility_reason) {
        condDesc.innerText = `🚨 ${data.festival_info.eligibility_reason}. Staged reserve buses with guaranteed seats waiting 2km away at ${data.festival_info.satellite_hub}!`;
      }

      data.spare_buses.forEach(b => {
        const card = document.createElement("div");
        card.className = "bus-ticket-card spare-special";
        
        const occPct = b.occupancy_percentage;
        const fillClass = occPct > 80 ? "fill-red" : (occPct > 45 ? "fill-amber" : "fill-green");

        card.innerHTML = `
          <div>
            <div class="card-top-row">
              <span class="bus-badge-num">${b.bus_id}</span>
              <span class="card-fare-badge spare">💰 கட்டணம்: ${b.fare_formatted || '₹35'}</span>
              <span class="dep-time-tag">⏱️ ${b.departure_time}</span>
            </div>
            <div class="card-route-title">${b.service_name}</div>
            <div style="font-size: 0.8rem; color: #065f46; font-weight: 700; margin-bottom: 4px;">
              🏢 ${b.parent_corporation || 'TNSTC'} &bull; Subdivision Depot: ${b.subdivision_depot || 'Satellite Unit'}
            </div>
            <div class="card-platform-text">
              📍 <strong>Staging:</strong> ${b.departure_location} (${b.platform}) &bull; <strong>Type:</strong> ${b.bus_type || 'Special Express Shuttle'}
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 6px;">
              🔄 <strong>Frequency:</strong> ${b.frequency_type || 'Continuous Loop'} &bull; 🆔 <strong>Route:</strong> ${b.route_id || 'SPARE-01'}
            </div>
            <div class="etvm-occupancy-wrapper">
              <div class="etvm-labels">
                <span style="color: #059669; font-weight: 700;">✓ ${b.free_seats} Free Seats Guaranteed</span>
                <span>${b.occupied_seats}/${b.total_capacity} (${occPct}%)</span>
              </div>
              <div class="etvm-bar-track">
                <div class="etvm-bar-fill ${fillClass}" style="width: ${occPct}%;"></div>
              </div>
            </div>
          </div>
          <div style="font-size: 0.76rem; color: #047857; background: #ecfdf5; padding: 8px 12px; border-radius: 6px; border: 1px solid #a7f3d0; margin-top: 8px;">
            🚍 ${b.shuttle_feeder}
          </div>
        `;
        spareGrid.appendChild(card);
      });
    } else {
      if (spareBox) spareBox.style.display = "none";
    }

    // 2. Regular Buses (Normal Town or Crowded City) - Rendered with exact fares
    const regCountBadge = document.getElementById("regular-buses-count-badge");
    if (regCountBadge) {
      regCountBadge.innerText = `${data.regular_buses?.length || 0} Scheduled Services Verified`;
    }

    if (!data.regular_buses || data.regular_buses.length === 0) {
      if (regGrid) regGrid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 24px;">No scheduled services found matching this date & time slot. Try selecting "All Day" or another date.</div>`;
      return;
    }

    data.regular_buses.forEach(b => {
      const card = document.createElement("div");
      card.className = "bus-ticket-card";

      const isFull = (b.occupancy_percentage >= 95);
      const occPct = b.occupancy_percentage;
      const fillClass = occPct > 80 ? "fill-red" : (occPct > 45 ? "fill-amber" : "fill-green");

      card.innerHTML = `
        <div>
          <div class="card-top-row">
            <span class="bus-badge-num">${b.bus_id}</span>
            <span class="card-fare-badge">💰 கட்டணம்: ${b.fare_formatted || '₹40'}</span>
            <span class="dep-time-tag">⏱️ ${b.departure_time}</span>
          </div>
          <div class="card-route-title">${b.service_name}</div>
          <div style="font-size: 0.8rem; color: #1e40af; font-weight: 700; margin-bottom: 4px;">
            🏢 ${b.parent_corporation || 'TNSTC'} &bull; Subdivision Depot: ${b.subdivision_depot || 'Central Depot'}
          </div>
          <div class="card-platform-text">
            📍 <strong>Terminal:</strong> ${b.departure_location || 'Main Terminus'} (${b.platform || 'Bay 1'}) &bull; <strong>Type:</strong> ${b.bus_type || b.service_type}
          </div>
          <div style="font-size: 0.76rem; color: var(--text-muted); margin-bottom: 6px;">
            🔄 <strong>Frequency:</strong> ${b.frequency_type || 'Daily Service'} &bull; 🏁 <strong>Arrival:</strong> ${b.arrival_time || 'On Schedule'} &bull; 🆔 <strong>Route:</strong> ${b.route_id || 'TNSTC-EXP'}
          </div>
          <div class="etvm-occupancy-wrapper">
            <div class="etvm-labels">
              <span style="color: ${isFull ? '#dc2626' : '#059669'}; font-weight: 700;">
                ${isFull ? '🚨 Packed / Overcrowded' : `✓ ${b.free_seats} Free Seats Available`}
              </span>
              <span>${b.occupied_seats}/${b.total_capacity} (${occPct}%)</span>
            </div>
            <div class="etvm-bar-track">
              <div class="etvm-bar-fill ${fillClass}" style="width: ${occPct}%;"></div>
            </div>
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
          <span style="font-size: 0.76rem; font-weight: 700; color: ${isFull ? '#dc2626' : '#059669'};">
            ${b.crowd_status}
          </span>
          <span style="font-size: 0.72rem; color: var(--text-muted); background: #f1f5f9; padding: 2px 8px; border-radius: 10px;">ETVM Live ML Verified</span>
        </div>
      `;
      regGrid.appendChild(card);
    });

  } catch (err) {
    console.error("Error executing passenger search:", err);
  }
}

// ============================================================================
// 5B. FLOATING DEVOTEE AI CHATBOT TOGGLE
// ============================================================================
function toggleFloatingChatbot() {
  const win = document.getElementById("floating-chatbot-window");
  if (!win) return;
  if (win.style.display === "none" || win.style.display === "") {
    win.style.display = "flex";
    initDevoteeChatbot();
    const inp = document.getElementById("chat-text-input");
    if (inp) inp.focus();
  } else {
    win.style.display = "none";
  }
}

// ============================================================================
// 5B. DEVOTEE AI CHATBOT ASSISTANT (BILINGUAL & WEB SPEECH VOICE INPUT)
// ============================================================================
let chatCurrentLang = "ta";
let speechRecognition = null;
let isListening = false;

const CHAT_QUESTIONS = {
  ta: [
    "காலியான உதிரி பேருந்துகள் எங்கு நிற்கின்றன?",
    "40,000 கூட்ட நெரிசலை தவிர்க்க எப்போது கிளம்புவது?",
    "இலவச மின்சார இணைப்பு வாகனம் எங்கு கிடைக்கும்?",
    "நேரடி ETVM இருக்கை நிலவரத்தை எப்படி பார்ப்பது?",
    "இன்று இரவு மழை வருமா?",
    "கோயம்புத்தூர் - பொள்ளாச்சி பேருந்து வசதிகள்?"
  ],
  en: [
    "Where are empty spare buses parked?",
    "What is the best time to leave to avoid 40,000 crowd rush?",
    "How to get free electric feeder shuttle to Vilamal?",
    "How to check live ETVM seat vacancies?",
    "Is it going to rain tonight during festival exit?",
    "Regular buses from Coimbatore to Pollachi?"
  ]
};

function renderChatPredefinedChips() {
  const container = document.getElementById("chat-predefined-chips");
  if (!container) return;
  container.innerHTML = "";
  const list = CHAT_QUESTIONS[chatCurrentLang] || CHAT_QUESTIONS.en;
  list.forEach(q => {
    const chip = document.createElement("button");
    chip.className = "predefined-chip";
    chip.innerText = q;
    chip.onclick = () => askChatbotQuestion(q);
    container.appendChild(chip);
  });
}

function toggleChatLanguage() {
  chatCurrentLang = (chatCurrentLang === "ta") ? "en" : "ta";
  const langText = document.getElementById("chat-lang-text");
  const inputField = document.getElementById("chat-text-input");
  const chipsLabel = document.getElementById("chips-bar-label");

  if (chatCurrentLang === "ta") {
    if (langText) langText.innerText = "தமிழ் (Active) / EN";
    if (inputField) inputField.placeholder = "தமிழில் கேட்கவும் அல்லது 🎙️ பேசி கேட்கவும்... (எ.கா: காலி பேருந்து எங்குள்ளது?)";
    if (chipsLabel) chipsLabel.innerText = "⚡ விரைவு வினாக்கள்:";
  } else {
    if (langText) langText.innerText = "English (Active) / தமிழ்";
    if (inputField) inputField.placeholder = "Ask in English or click 🎙️ to speak... (e.g. Where are empty buses?)";
    if (chipsLabel) chipsLabel.innerText = "⚡ Quick Questions:";
  }
  renderChatPredefinedChips();
}

function askChatbotQuestion(q) {
  sendChatbotMessage(q);
}

function onChatInputKeyDown(e) {
  if (e.key === "Enter") {
    sendChatbotMessage();
  }
}

function clearChatMessages() {
  const container = document.getElementById("chat-messages-container");
  if (!container) return;
  container.innerHTML = "";
  initDevoteeChatbotGreeting();
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function speakChatMessage(btn, textToSpeak) {
  if (!window.speechSynthesis) {
    alert("Speech synthesis is not supported on this browser.");
    return;
  }

  if (window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    document.querySelectorAll(".chat-tts-btn").forEach(b => {
      b.classList.remove("speaking");
      b.innerHTML = "🔊 " + (chatCurrentLang === "ta" ? "கேட்க" : "Read Aloud");
    });
    if (btn.dataset.wasSpeaking === "true") {
      btn.dataset.wasSpeaking = "false";
      return;
    }
  }

  // Strip markdown symbols and emojis for natural speech
  const clean = textToSpeak
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/[\#\*\_\`]/g, "")
    .replace(/[🚨🟢🔴💡⚡🎫🌦️🏙️✓•\n]/g, " ");

  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = (chatCurrentLang === "ta") ? "ta-IN" : "en-IN";
  utter.rate = 0.95;

  btn.classList.add("speaking");
  btn.innerHTML = "⏹️ " + (chatCurrentLang === "ta" ? "நிறுத்து" : "Stop");
  btn.dataset.wasSpeaking = "true";

  utter.onend = () => {
    btn.classList.remove("speaking");
    btn.innerHTML = "🔊 " + (chatCurrentLang === "ta" ? "கேட்க" : "Read Aloud");
    btn.dataset.wasSpeaking = "false";
  };

  utter.onerror = () => {
    btn.classList.remove("speaking");
    btn.innerHTML = "🔊 " + (chatCurrentLang === "ta" ? "கேட்க" : "Read Aloud");
    btn.dataset.wasSpeaking = "false";
  };

  window.speechSynthesis.speak(utter);
}

function toggleVoiceRecognition() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) {
    alert("Voice recognition is not supported in this browser environment. Please use text input instead.");
    return;
  }

  const micBtn = document.getElementById("mic-btn");
  const banner = document.getElementById("voice-status-banner");
  const bannerText = document.getElementById("voice-status-text");

  if (isListening && speechRecognition) {
    speechRecognition.stop();
    isListening = false;
    micBtn.classList.remove("listening");
    if (banner) banner.style.display = "none";
    return;
  }

  speechRecognition = new SpeechRec();
  speechRecognition.lang = (chatCurrentLang === "ta") ? "ta-IN" : "en-IN";
  speechRecognition.continuous = false;
  speechRecognition.interimResults = true;

  speechRecognition.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
    if (banner) {
      banner.style.display = "flex";
      if (bannerText) {
        bannerText.innerText = (chatCurrentLang === "ta") 
          ? "🎙️ குரல் பதிவு இயக்கத்தில் உள்ளது... தமிழில் பேசுங்கள்!" 
          : "🎙️ Listening... Speak your transit question now in English or Tamil!";
      }
    }
  };

  speechRecognition.onresult = (event) => {
    let interim = "";
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      interim += event.results[i][0].transcript;
    }
    const inputField = document.getElementById("chat-text-input");
    if (inputField) inputField.value = interim;
  };

  speechRecognition.onerror = (event) => {
    console.warn("Speech recognition error:", event.error);
    isListening = false;
    micBtn.classList.remove("listening");
    if (banner) banner.style.display = "none";
  };

  speechRecognition.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
    if (banner) banner.style.display = "none";
    const inputField = document.getElementById("chat-text-input");
    if (inputField && inputField.value.trim().length > 0) {
      sendChatbotMessage();
    }
  };

  try {
    speechRecognition.start();
  } catch (err) {
    console.error("Speech recognition start failed:", err);
  }
}

async function sendChatbotMessage(customText = null) {
  const inputField = document.getElementById("chat-text-input");
  const text = customText || (inputField ? inputField.value.trim() : "");
  if (!text) return;

  if (inputField) inputField.value = "";

  const container = document.getElementById("chat-messages-container");
  if (!container) return;

  // 1. User Message Bubble
  const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const userMsg = document.createElement("div");
  userMsg.className = "chat-bubble user";
  userMsg.innerHTML = `
    <div class="bubble-content">${escapeHtml(text)}</div>
    <div class="bubble-footer" style="justify-content: flex-end;">${nowTime}</div>
  `;
  container.appendChild(userMsg);
  container.scrollTop = container.scrollHeight;

  // 2. Bot Typing Bubble
  const typingId = "typing-" + Date.now();
  const typingBubble = document.createElement("div");
  typingBubble.id = typingId;
  typingBubble.className = "chat-bubble bot";
  typingBubble.innerHTML = `
    <div class="bubble-content" style="color: var(--text-muted); font-style: italic;">
      🤖 ${chatCurrentLang === "ta" ? "உலா வழிகாட்டி பதிலளிக்கிறது..." : "Ulaa Assistant is thinking..."}
    </div>
  `;
  container.appendChild(typingBubble);
  container.scrollTop = container.scrollHeight;

  try {
    const res = await fetch(`/api/chatbot?q=${encodeURIComponent(text)}&lang=${chatCurrentLang}`);
    const data = await res.json();
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    // Render formatted response
    let formattedAnswer = (data.answer || "")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/\n\n/g, "<br><br>")
      .replace(/\n/g, "<br>");

    const botMsg = document.createElement("div");
    botMsg.className = "chat-bubble bot";

    let quickLinksHtml = "";
    if (data.quick_links && data.quick_links.length > 0) {
      quickLinksHtml = `<div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 10px;">` +
        data.quick_links.map(ql => `<button class="predefined-chip" style="font-size: 0.74rem; padding: 4px 10px;" onclick="askChatbotQuestion('${escapeHtml(ql)}')">${escapeHtml(ql)}</button>`).join("") +
        `</div>`;
    }

    const rawAnswer = data.answer || "";
    const ttsId = "tts-" + Date.now();

    botMsg.innerHTML = `
      <div class="bubble-content">
        <div>${formattedAnswer}</div>
        ${quickLinksHtml}
      </div>
      <div class="bubble-footer">
        <span>${nowTime}</span>
        <button class="chat-tts-btn" id="${ttsId}">
          🔊 ${chatCurrentLang === "ta" ? "கேட்க" : "Read Aloud"}
        </button>
      </div>
    `;
    container.appendChild(botMsg);
    container.scrollTop = container.scrollHeight;

    const ttsBtn = document.getElementById(ttsId);
    if (ttsBtn) {
      ttsBtn.onclick = () => speakChatMessage(ttsBtn, rawAnswer);
    }

  } catch (err) {
    console.error("Chatbot query error:", err);
    const typingEl = document.getElementById(typingId);
    if (typingEl) typingEl.remove();

    const errBubble = document.createElement("div");
    errBubble.className = "chat-bubble bot";
    errBubble.innerHTML = `
      <div class="bubble-content" style="color: #dc2626;">
        ⚠️ ${chatCurrentLang === "ta" ? "மன்னிக்கவும், தகவலைப் பெற முடியவில்லை. மீண்டும் முயற்சிக்கவும்." : "Sorry, could not fetch transit advice. Please try again."}
      </div>
    `;
    container.appendChild(errBubble);
  }
}

function initDevoteeChatbotGreeting() {
  const container = document.getElementById("chat-messages-container");
  if (!container || container.children.length > 0) return;
  const welcomeBubble = document.createElement("div");
  welcomeBubble.className = "chat-bubble bot";
  const welcomeTextTa = "வணக்கம்! 🙏 நான் உங்கள் **உலா360 திருவிழா & பேருந்து வழிகாட்டி**.\n\n• மத்திய பேருந்து நிலைய நெரிசலை தவிர்த்து **2 கி.மீ தொலைவில் உள்ள காலியான உதிரி பேருந்துகளை** எங்கு அடைவது?\n• **40,000 கூட்ட நெரிசலை** தவிர்க்க சரியான வெளியேறும் நேரம் எது?\n• நேரடி **ETVM காலி இருக்கை நிலவரம்** மற்றும் **இலவச இணைப்பு மின்சார வாகனங்கள்** பற்றியும் என்னிடம் கேளுங்கள்!\n\nகீழே உள்ள வினாக்களை கிளிக் செய்யலாம் அல்லது 🎙️ மைக் பொத்தானை அழுத்தி குரல் வழியாகவும் கேட்கலாம்.";
  const welcomeTextEn = "Vanakkam! 🙏 I am your **Ulaa360 Festival Transit AI Assistant**.\n\n• Where to find **empty spare buses 2km away** to avoid the jammed central stand?\n• Best exit window to bypass the **40,000 crowd surge**?\n• Real-time **ETVM seat vacancies** & **free electric feeder shuttles**!\n\nClick any quick question below or tap the 🎙️ mic button to speak!";

  const text = (chatCurrentLang === "ta") ? welcomeTextTa : welcomeTextEn;
  const formatted = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  const ttsId = "tts-welcome-" + Date.now();

  welcomeBubble.innerHTML = `
    <div class="bubble-content">
      ${formatted}
    </div>
    <div class="bubble-footer">
      <span>Just now</span>
      <button class="chat-tts-btn" id="${ttsId}">
        🔊 ${chatCurrentLang === "ta" ? "கேட்க" : "Read Aloud"}
      </button>
    </div>
  `;
  container.appendChild(welcomeBubble);

  const ttsBtn = document.getElementById(ttsId);
  if (ttsBtn) {
    ttsBtn.onclick = () => speakChatMessage(ttsBtn, text);
  }
}

function initDevoteeChatbot() {
  renderChatPredefinedChips();
  initDevoteeChatbotGreeting();
}


// ============================================================================
// 6. MAPBOX LIGHT-V11 & FESTIVAL PREDICTION LOGIC
// ============================================================================
function initMapbox() {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  mapInstance = new mapboxgl.Map({
    container: "map-view",
    style: "mapbox://styles/mapbox/light-v11", // Clean White Theme Mapbox
    center: [79.6370, 10.7730],
    zoom: 12.8,
    pitch: 35
  });

  mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");
  mapInstance.on("load", () => { updateMapData(); });
}

function clearMapMarkers() {
  mapMarkers.forEach(m => m.remove());
  mapMarkers = [];
}

async function updateMapData() {
  if (!mapInstance) return;
  clearMapMarkers();

  try {
    const res = await fetch(`/api/stops_and_depots?event_id=${currentEventId}`);
    const data = await res.json();

    if (data.center) {
      mapInstance.flyTo({
        center: data.center,
        zoom: currentEventId.includes("MDU") ? 12.2 : 13.0,
        essential: true
      });
    }

    if (data.core_stops) {
      data.core_stops.forEach(stop => {
        const el = document.createElement("div");
        let markerBg = "#2563eb";
        let icon = "🚏";
        let pulseStyle = "";

        if (stop.status === "CRITICAL_OVERCROWDED") {
          markerBg = "#dc2626";
          icon = "🚨";
          pulseStyle = "box-shadow: 0 0 0 10px rgba(220, 38, 38, 0.3); animation: pulse 1.5s infinite;";
        } else if (stop.status === "SURPLUS_EMPTY") {
          markerBg = "#059669";
          icon = "🟢";
          pulseStyle = "box-shadow: 0 0 0 10px rgba(5, 150, 105, 0.3); animation: pulse 2s infinite;";
        }

        el.style.cssText = `
          width: 38px; height: 38px; background: ${markerBg};
          border: 2px solid #ffffff; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 16px; cursor: pointer; ${pulseStyle}
        `;
        el.innerHTML = icon;

        const popupContent = `
          <div style="color: #0f172a; padding: 4px; font-family: sans-serif;">
            <div style="font-weight: 800; font-size: 13px; margin-bottom: 4px;">${stop.stop_name}</div>
            <div style="font-size: 11px; margin-bottom: 4px;"><strong>Waiting Devotees:</strong> ${stop.current_waiting_crowd.toLocaleString()}</div>
            <div style="font-size: 11px; margin-bottom: 4px;"><strong>Safe Capacity:</strong> ${stop.safe_waiting_capacity}</div>
            <div style="font-size: 11px; margin-bottom: 4px;"><strong>Buses at Stand:</strong> ${stop.buses_at_stop}</div>
            <div style="font-size: 11px; color: ${markerBg}; font-weight: 700;">${stop.details}</div>
          </div>
        `;

        const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(popupContent);
        const marker = new mapboxgl.Marker(el)
          .setLngLat([stop.longitude, stop.latitude])
          .setPopup(popup)
          .addTo(mapInstance);

        mapMarkers.push(marker);
      });
    }

    if (data.relevant_depots) {
      data.relevant_depots.slice(0, 6).forEach(depot => {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 28px; height: 28px; background: #2563eb;
          border: 2px solid #fff; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        `;
        el.innerHTML = "🏢";

        const popup = new mapboxgl.Popup({ offset: 20 }).setHTML(`
          <div style="color: #0f172a; padding: 4px; font-family: sans-serif;">
            <div style="font-weight: 800; font-size: 12px;">${depot.depot_name}</div>
            <div style="font-size: 11px;">Region: ${depot.region}</div>
            <div style="font-size: 11px;">Contact: ${depot.contact_reference}</div>
            <div style="font-size: 10px; color: #059669; font-weight: 700;">Connected to Reallocation Loop</div>
          </div>
        `);

        const marker = new mapboxgl.Marker(el)
          .setLngLat([parseFloat(depot.longitude), parseFloat(depot.latitude)])
          .setPopup(popup)
          .addTo(mapInstance);

        mapMarkers.push(marker);
      });
    }

  } catch (err) {
    console.error("Error loading map stops:", err);
  }
}

async function onFestivalChanged() {
  const sel = document.getElementById("event-select");
  currentEventId = sel.value;
  securedBuses = 0;
  await loadFestivalData();
  await updateMapData();
}

async function loadFestivalData() {
  try {
    const predRes = await fetch(`/api/predict?event_id=${currentEventId}`);
    const predData = await predRes.json();

    const recRes = await fetch(`/api/recommendations?event_id=${currentEventId}`);
    const recData = await recRes.json();
    activeRecommendations = recData.recommendations || [];

    const peakCrowd = predData.peak_summary ? predData.peak_summary.peak_passenger_demand : 40000;
    document.getElementById("kpi-peak-crowd").innerText = peakCrowd.toLocaleString();

    const baseBuses = (currentEventId.includes("TVR") ? 12 : 18);
    document.getElementById("kpi-base-buses").innerText = baseBuses;

    totalRequiredBuses = Math.max(30, Math.ceil(peakCrowd / 60));
    document.getElementById("kpi-reassigned-buses").innerText = `${recData.summary.total_recommended_buses} Buses`;
    document.getElementById("kpi-weather").innerText = `${predData.weather.rain_probability}% Rain Prob`;

    const calloutTitle = document.getElementById("callout-title");
    const calloutDesc = document.getElementById("callout-desc");
    if (currentEventId.includes("TVR")) {
      calloutTitle.innerText = "Bottleneck Breaker Found (2km Away)!";
      calloutDesc.innerText = "4 empty buses waiting at Vilamal Stand (2.1 km away). ETA 8 minutes.";
    } else {
      calloutTitle.innerText = "Madurai Outer Ring Reserve Detected!";
      calloutDesc.innerText = "6 empty buses idling at Ring Road By-Pass (2.0 km away). ETA 7 minutes.";
    }

    renderSurgeChart(predData.crowd_curve);
    renderFeederChart(predData.feeder_routes);
    renderReallocationCards();
    renderTradeoffMatrix();

  } catch (err) {
    console.error("Failed to load festival data:", err);
  }
}

function renderSurgeChart(curveData) {
  const ctx = document.getElementById("surge-chart").getContext("2d");
  if (surgeChartInstance) surgeChartInstance.destroy();

  const labels = curveData.map(c => c.time);
  const demandData = curveData.map(c => c.predicted_demand);
  const baselineCapacity = curveData.map(c => c.scheduled_capacity);
  const safeCapacity = curveData.map(c => c.safe_capacity);

  const optimizedCapacity = curveData.map((c) => {
    const additionalBuses = c.is_peak ? 36 * 60 : 12 * 60;
    return c.scheduled_capacity + additionalBuses;
  });

  surgeChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Predicted Pilgrim Demand",
          data: demandData,
          borderColor: "#dc2626",
          backgroundColor: "rgba(220, 38, 38, 0.08)",
          borderWidth: 3,
          fill: true,
          tension: 0.35
        },
        {
          label: "AI Proactive Fleet Capacity",
          data: optimizedCapacity,
          borderColor: "#059669",
          borderWidth: 2.5,
          borderDash: [4, 4],
          tension: 0.2
        },
        {
          label: "Baseline Scheduled Capacity (12 Buses)",
          data: baselineCapacity,
          borderColor: "#2563eb",
          borderWidth: 2,
          tension: 0.1
        },
        {
          label: "Safe Bus Stand Waiting Capacity",
          data: safeCapacity,
          borderColor: "#d97706",
          borderWidth: 1.5,
          borderDash: [2, 2],
          pointRadius: 0
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { intersect: false, mode: "index" },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 12 }, grid: { color: "#f1f5f9" } },
        y: { ticks: { color: "#64748b" }, grid: { color: "#f1f5f9" } }
      },
      plugins: {
        legend: { labels: { color: "#1e293b", boxWidth: 12, font: { size: 11, weight: 'bold' } } }
      }
    }
  });
}

function renderFeederChart(feeders) {
  const ctx = document.getElementById("feeder-chart").getContext("2d");
  if (feederChartInstance) feederChartInstance.destroy();

  const labels = feeders.map(f => f.origin);
  const data = feeders.map(f => f.demand);

  feederChartInstance = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: ["#2563eb", "#0284c7", "#059669", "#d97706", "#7c3aed"],
        borderWidth: 2,
        borderColor: "#ffffff"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "right", labels: { color: "#1e293b", boxWidth: 12, font: { size: 10, weight: 'bold' } } }
      }
    }
  });
}

function renderReallocationCards() {
  const container = document.getElementById("reallocation-cards-container");
  container.innerHTML = "";

  activeRecommendations.forEach((rec) => {
    const isP0 = rec.priority.includes("P0");
    const pClass = isP0 ? "p0" : "p1";
    const isApproved = (rec.status !== "Ready for Manager Approval");

    const card = document.createElement("div");
    card.className = `reallocation-card ${isApproved ? "approved" : ""}`;
    card.id = `rec-card-${rec.recommendation_id}`;

    card.innerHTML = `
      <div class="rec-header">
        <span class="rec-priority ${pClass}">${rec.priority}</span>
        <span class="rec-eta">⏱️ Dispatch at ${rec.recommended_dispatch_time} (ETA ${rec.travel_time_minutes}m)</span>
      </div>

      <div class="rec-body">
        <div class="rec-title">
          <span>🚍</span> ${rec.bus_count} Buses from ${rec.donor_depot_name}
        </div>
        <div class="rec-buses">
          <strong>Staging Point:</strong> ${rec.donor_stop_name} (${rec.distance_km} km) &bull;
          <strong>Buses:</strong> ${rec.buses.slice(0, 3).join(", ")}${rec.buses.length > 3 ? "..." : ""}
        </div>

        <div class="tradeoff-box">
          <div class="tradeoff-label"><span>⚖️</span> Trade-Off & Service Impact Analysis:</div>
          <div class="tradeoff-detail">${rec.tradeoff_analysis.tradeoff_justification}</div>
          <div class="tradeoff-stats">
            <div class="tradeoff-stat-item">Donor Route: <strong>${rec.tradeoff_analysis.route_affected}</strong></div>
            <div class="tradeoff-stat-item">Off-Peak Load: <strong>${rec.tradeoff_analysis.donor_occupancy_rate}</strong></div>
            <div class="tradeoff-stat-item">Headway Shift: <strong>${rec.tradeoff_analysis.headway_change}</strong></div>
            <div class="tradeoff-stat-item">Pilgrims Saved: <strong style="color: #059669;">+${rec.tradeoff_analysis.pilgrims_rescued_count}</strong></div>
          </div>
        </div>
      </div>

      <div class="rec-footer">
        <span id="status-badge-${rec.recommendation_id}" style="font-size: 0.78rem; font-weight: 700; color: ${isApproved ? '#059669' : '#64748b'};">
          ${isApproved ? "✓ " + rec.status : "Waiting Approval"}
        </span>

        <button class="btn-approve" id="btn-approve-${rec.recommendation_id}" 
          ${isApproved ? "disabled" : ""} 
          onclick="handleApproveReallocation('${rec.recommendation_id}', ${rec.bus_count})">
          ${isApproved ? "Dispatched" : "Approve & Send Request"}
        </button>
      </div>
    `;

    container.appendChild(card);
  });

  updateNegotiationProgress();
}

async function handleApproveReallocation(recId, busCount) {
  const rec = activeRecommendations.find(r => r.recommendation_id === recId);
  if (!rec) return;

  const btn = document.getElementById(`btn-approve-${recId}`);
  const statusBadge = document.getElementById(`status-badge-${recId}`);

  btn.disabled = true;
  btn.innerText = "Requesting...";
  statusBadge.innerText = `📡 Request Sent to ${rec.donor_depot_name}...`;
  statusBadge.style.color = "var(--accent-cyan)";

  try {
    const res = await fetch("/api/allocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recommendation_id: recId,
        action: "approve",
        donor_depot_name: rec.donor_depot_name,
        bus_count: busCount,
        requesting_depot: currentDepotId
      })
    });
    await res.json();

    setTimeout(() => {
      statusBadge.innerText = `🤝 Confirmed by ${rec.donor_depot_name}!`;
      statusBadge.style.color = "var(--accent-amber)";

      setTimeout(() => {
        statusBadge.innerText = "🟢 Dispatched & In Transit!";
        statusBadge.style.color = "var(--accent-emerald)";
        btn.innerText = "Dispatched";
        document.getElementById(`rec-card-${recId}`).classList.add("approved");
        rec.status = "Dispatched & In Transit";

        securedBuses += busCount;
        updateNegotiationProgress();
        loadInterDepotRequests(currentDepotId);
      }, 1000);

    }, 900);

  } catch (err) {
    console.error("Allocation error:", err);
    btn.disabled = false;
    btn.innerText = "Approve & Send Request";
  }
}

function approvePriorityZero() {
  const p0 = activeRecommendations.find(r => r.priority.includes("P0"));
  if (p0) {
    handleApproveReallocation(p0.recommendation_id, p0.bus_count);
    document.getElementById("callout-empty-stand").style.display = "none";
  }
}

async function batchSimulateAll() {
  for (const rec of activeRecommendations) {
    if (rec.status === "Ready for Manager Approval") {
      await handleApproveReallocation(rec.recommendation_id, rec.bus_count);
      await new Promise(r => setTimeout(r, 1400));
    }
  }
}

function updateNegotiationProgress() {
  const totalBuses = activeRecommendations.reduce((sum, r) => sum + r.bus_count, 0);
  document.getElementById("secured-buses-count").innerText = `${securedBuses} / ${totalBuses} Buses`;
  const pct = Math.min(100, Math.round((securedBuses / totalBuses) * 100)) || 0;
  document.getElementById("negotiation-progress-text").innerText = `${pct}% Complete`;
}

function renderTradeoffMatrix() {
  const tbody = document.getElementById("tradeoff-table-body");
  tbody.innerHTML = "";

  activeRecommendations.forEach(rec => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${rec.recommendation_id}</strong></td>
      <td>${rec.donor_depot_name}</td>
      <td><span class="badge-rowcount">${rec.bus_count} Buses</span></td>
      <td><code>${rec.tradeoff_analysis.route_affected}</code></td>
      <td>${rec.tradeoff_analysis.donor_occupancy_rate}</td>
      <td style="color: #d97706; font-weight: 700;">${rec.tradeoff_analysis.headway_change}</td>
      <td style="color: #059669; font-weight: 700;">+${rec.tradeoff_analysis.pilgrims_rescued_count}</td>
      <td style="font-size: 0.78rem;">${rec.tradeoff_analysis.tradeoff_justification}</td>
    `;
    tbody.appendChild(tr);
  });
}

// ============================================================================
// 7. BILINGUAL TOGGLE & MODALS
// ============================================================================
function toggleLanguage() {
  currentLanguage = (currentLanguage === "en") ? "ta" : "en";
  const btn = document.getElementById("lang-toggle-btn");
  const heroTitle = document.getElementById("commuter-hero-title");
  const heroDesc = document.getElementById("commuter-hero-desc");
  const tagline = document.getElementById("tagline-text");

  if (currentLanguage === "ta") {
    btn.innerText = "🌐 English";
    tagline.innerText = "திருவிழா கூட்ட நெரிசல் & முன்கூட்டிய பேருந்து மாற்று மேலாண்மை";
    heroTitle.innerText = "உலா 360 - தமிழ்நாடு பயணிகள் & திருவிழா பேருந்து வழிகாட்டி";
    heroDesc.innerText = "அனைத்து தமிழ்நாடு வழித்தட தேடல் மற்றும் திருவிழா நேரடி பேருந்து நிலவரம். வழக்கமான பேருந்துகள் மற்றும் 2 கி.மீ துணை நிலைய சிறப்பு உதிரி பேருந்துகள் (நேரடி ETVM இருக்கை விவரம்).";
  } else {
    btn.innerText = "🌐 தமிழ்";
    tagline.innerText = "Crowd Surge & Smart Fleet Redistribution";
    heroTitle.innerText = "Ulaa360 - Tamil Nadu Commuter & Festival Bus Guide";
    heroDesc.innerText = "Universal Tamil Nadu transit search & festival crowd radar. Search any origin and destination across Tamil Nadu (regular schedules & spare festival fleets with live ETVM seat occupancy).";
  }
}

function openAddFestivalModal() {
  document.getElementById("add-festival-modal").style.display = "flex";
}

function closeAddFestivalModal() {
  document.getElementById("add-festival-modal").style.display = "none";
}

async function submitNewFestival(e) {
  e.preventDefault();
  const name = document.getElementById("new-fest-name").value;
  const type = document.getElementById("new-fest-type").value;
  const dest = document.getElementById("new-fest-dest").value;
  const endtime = document.getElementById("new-fest-endtime").value;
  const attendance = document.getElementById("new-fest-attendance").value;

  try {
    const res = await fetch("/api/add_festival", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_name: name,
        event_type: type,
        destination_stop: dest,
        programme_end_datetime: endtime.replace("T", " ") + ":00",
        expected_attendance: attendance
      })
    });
    const result = await res.json();
    if (result.success) {
      const sel = document.getElementById("event-select");
      const opt = document.createElement("option");
      opt.value = result.event.event_id;
      opt.innerText = `🚩 ${result.event.event_name}`;
      sel.appendChild(opt);
      sel.value = result.event.event_id;
      closeAddFestivalModal();
      onFestivalChanged();
      alert(`Festival "${name}" registered successfully! Demand predictions updated.`);
    }
  } catch (err) {
    console.error("Failed to add festival:", err);
  }
}
