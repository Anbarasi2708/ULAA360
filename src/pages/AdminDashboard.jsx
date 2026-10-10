import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ArrowLeft, Bell, Settings, Bus, AlertTriangle, CheckCircle, TrendingUp, Inbox, Send, Activity, CloudRain, Sun } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import 'leaflet/dist/leaflet.css';
import './AdminDashboard.css';

const mockStops = [
  { id: 'TN_KOM_010', name: 'Thiruvarur New Bus Stand', lat: 10.7725, lng: 79.6339, crowd: 4500, cap: 18000, color: '#dc2626' }, 
  { id: 'TN_CBE_001', name: 'Gandhipuram Central', lat: 11.0169, lng: 76.9678, crowd: 300, cap: 50000, color: '#059669' }
];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeDepot, setActiveDepot] = useState('TNSTC_KUM');
  const [weather, setWeather] = useState(null);
  const [requestState, setRequestState] = useState(
    JSON.parse(localStorage.getItem('ulaa_request')) || { status: 'IDLE', to: '', from: '' }
  );

  useEffect(() => {
    const depot = localStorage.getItem('activeDepot');
    if (depot) setActiveDepot(depot);

    // Fetch Weather Data (Live Open-Meteo API)
    fetch('https://api.open-meteo.com/v1/forecast?latitude=10.7661&longitude=79.6344&current_weather=true')
      .then(res => res.json())
      .then(data => {
        setWeather(data.current_weather);
      })
      .catch(console.error);

    // Listen for cross-window localStorage changes (live updates)
    const handleStorage = () => {
      const saved = localStorage.getItem('ulaa_request');
      if (saved) setRequestState(JSON.parse(saved));
    };
    window.addEventListener('storage', handleStorage);
    
    // Fallback polling for single-window test
    const interval = setInterval(() => {
      handleStorage();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const handleOutgoingRequest = () => {
    const newReq = { status: 'PENDING', from: 'TNSTC_KUM', to: 'TNSTC_MDU' };
    localStorage.setItem('ulaa_request', JSON.stringify(newReq));
    setRequestState(newReq);
  };

  const handleBackupRequest = () => {
    const newReq = { status: 'PENDING', from: 'TNSTC_KUM', to: 'TNSTC_SLM' };
    localStorage.setItem('ulaa_request', JSON.stringify(newReq));
    setRequestState(newReq);
  };

  const handleApproveIncoming = () => {
    const newReq = { ...requestState, status: 'APPROVED' };
    localStorage.setItem('ulaa_request', JSON.stringify(newReq));
    setRequestState(newReq);
  };

  const handleDenyIncoming = () => {
    const newReq = { ...requestState, status: 'DENIED' };
    localStorage.setItem('ulaa_request', JSON.stringify(newReq));
    setRequestState(newReq);
  };

  const isKumbakonam = activeDepot === 'TNSTC_KUM'; // Sender
  const isMadurai = activeDepot === 'TNSTC_MDU'; // Receiver 1

  return (
    <div className="admin-container">
      <nav className="admin-nav glass-panel">
        <div className="flex items-center gap-4">
          <button className="icon-btn" onClick={() => navigate('/')}><ArrowLeft /></button>
          <img src="/logo.png" alt="Logo" style={{ height: '32px' }} onError={(e) => e.target.style.display = 'none'} />
          <h2>{activeDepot.replace('TNSTC_', '')} Dashboard</h2>
        </div>
        <div className="flex items-center gap-4">
          {weather && (
            <div className="flex items-center gap-2 mr-4" style={{ color: 'var(--text-secondary)' }}>
              {weather.weathercode > 50 ? <CloudRain size={20} color="#3b82f6" /> : <Sun size={20} color="#f59e0b" />}
              <span>{weather.temperature}°C (Live Weather)</span>
            </div>
          )}
          {isKumbakonam && (
            <div className="festival-badge">
              <span className="live-dot"></span>
              Thiruvarur Festival Active
            </div>
          )}
          <button className="icon-btn"><Bell /></button>
          <button className="icon-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}><Settings /></button>
        </div>
      </nav>

      <div className="admin-grid">
        <div className="main-content flex-col gap-4">
          <div className="glass-panel p-4 flex-col" style={{ flex: 1 }}>
            <div className="map-header">
              <h3>Live Crowd & Fleet Positions</h3>
              <div className="legend">
                <span style={{ color: '#dc2626' }}>● Overcrowded</span>
                <span style={{ color: '#059669' }}>● Normal</span>
              </div>
            </div>
            <div className="map-container" style={{ minHeight: '300px' }}>
              <MapContainer center={isKumbakonam ? [10.7725, 79.6339] : [11.0169, 76.9678]} zoom={13} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
                <TileLayer 
                  url="https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFoYWRoYXJhbmkiLCJhIjoiY212MmRhZ2dsMGVlZDJ5cXY0bnJwaGVydiJ9.L7ri0Nl8X1WpvdqzqvjraQ" 
                  attribution='Map data &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                />
                {mockStops.map(stop => (
                  <CircleMarker 
                    key={stop.id} 
                    center={[stop.lat, stop.lng]} 
                    radius={stop.crowd > 1000 ? 16 : 8}
                    pathOptions={{ color: stop.color, fillColor: stop.color, fillOpacity: 0.6 }}
                  >
                    <Popup>
                      <div className="popup-content">
                        <h4>{stop.name}</h4>
                        <p>Crowd: {stop.crowd} / {stop.cap}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>
          </div>

          <div className="glass-panel p-6">
            <h3 className="widget-title mb-4"><Activity size={20}/> Yesterday's Fleet Status</h3>
            <div className="flex gap-4">
              <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                <p className="text-secondary">Departed</p>
                <h2>142</h2>
              </div>
              <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                <p className="text-secondary">Reached Safely</p>
                <h2>138</h2>
              </div>
              <div className="stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <p className="text-secondary">Yet to Arrive / Transit</p>
                <h2>4</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="side-panel flex-col gap-4">
          {/* Incoming Requests for Madurai */}
          {activeDepot === requestState.to && requestState.status !== 'IDLE' && (
            <div className="glass-panel widget">
              <h3 className="widget-title"><Inbox size={20}/> Incoming Requests</h3>
              <div className="recommendation-card border-left-blue">
                <span className="badge badge-ai mb-2 block">From: {requestState.from}</span>
                <h4>Emergency: 5 Spare Buses</h4>
                <p className="text-secondary text-sm mb-4 mt-2">Requested for Festival crowd clearance.</p>
                
                {requestState.status === 'PENDING' && (
                  <div className="flex gap-2">
                    <button className="btn-primary" style={{ flex: 1, padding: '8px' }} onClick={handleApproveIncoming}>Approve</button>
                    <button className="btn-primary" style={{ flex: 1, padding: '8px', background: '#f1f5f9', color: '#0f172a', boxShadow: 'none', border: '1px solid #cbd5e1' }} onClick={handleDenyIncoming}>Deny</button>
                  </div>
                )}
                
                {requestState.status === 'APPROVED' && (
                  <div className="flex items-center gap-2 text-success mt-2 font-medium">
                    <CheckCircle size={18} /> Request Accepted. Buses Dispatched.
                  </div>
                )}
                
                {requestState.status === 'DENIED' && (
                  <div className="flex items-center gap-2 text-danger mt-2 font-medium">
                    <AlertTriangle size={18} /> Request Denied.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outgoing Requests / Predictions for Kumbakonam */}
          {activeDepot === 'TNSTC_KUM' && (
            <div className="glass-panel widget">
              <h3 className="widget-title"><TrendingUp size={20}/> AI Prediction</h3>
              <div className="alert-box critical mb-4">
                <AlertTriangle size={24} />
                <div>
                  <strong>Temple Stop Overload</strong>
                  {weather && weather.weathercode > 50 ? (
                    <p>Rain detected! Crowd clearance delayed by 30 mins. Need extra capacity.</p>
                  ) : (
                    <p>Expected 40,000 departing passengers in next 2 hours.</p>
                  )}
                </div>
              </div>
              
              <h3 className="widget-title"><Send size={20}/> Cross-Depot Request</h3>
              
              {requestState.status === 'IDLE' && (
                <div className="recommendation-card">
                  <h4>Request 5 buses from Madurai Div</h4>
                  <p className="trade-off">Status: Madurai has 12 free idle buses.</p>
                  <button className="btn-primary w-full mt-4" onClick={handleOutgoingRequest}>Send Request to MDU</button>
                </div>
              )}

              {requestState.status === 'PENDING' && requestState.to === 'TNSTC_MDU' && (
                <div className="recommendation-card">
                  <h4>Request sent to Madurai</h4>
                  <button className="btn-primary w-full pending mt-4" disabled>
                    <span className="spinner"></span> Status: Pending...
                  </button>
                </div>
              )}

              {requestState.status === 'APPROVED' && requestState.to === 'TNSTC_MDU' && (
                <div className="recommendation-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <h4>Madurai Request Accepted!</h4>
                  <p className="text-secondary text-sm mt-2">TN-58-N-2034, TN-58-N-1299 en route.</p>
                </div>
              )}

              {requestState.status === 'DENIED' && requestState.to === 'TNSTC_MDU' && (
                <div className="recommendation-card" style={{ borderLeft: '4px solid #dc2626', background: '#fef2f2' }}>
                  <h4 style={{ color: '#dc2626' }} className="flex items-center gap-2"><AlertTriangle size={18}/> Madurai Denied Request</h4>
                  <p className="text-secondary text-sm mt-2 mb-4">Finding next available corporation...</p>
                  
                  <div className="p-3 bg-white rounded border border-gray-200 mt-2">
                    <h5 className="font-semibold mb-1 text-primary">Backup Suggestion: Salem Division</h5>
                    <p className="text-sm text-secondary">Salem has 8 free idle buses. Available: TN-30-N-9988, TN-30-N-1122</p>
                    <button className="btn-primary w-full mt-3" onClick={handleBackupRequest} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
                      Request Salem (SLM)
                    </button>
                  </div>
                </div>
              )}

              {requestState.status === 'PENDING' && requestState.to === 'TNSTC_SLM' && (
                <div className="recommendation-card">
                  <h4>Request sent to Salem</h4>
                  <button className="btn-primary w-full pending mt-4" disabled>
                    <span className="spinner"></span> Status: Pending...
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
