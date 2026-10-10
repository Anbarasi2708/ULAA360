import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { ArrowLeft, Bell, Settings, Bus, AlertTriangle, CheckCircle, TrendingUp, Inbox, Send, Activity, CloudRain, Sun, CalendarDays, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import 'leaflet/dist/leaflet.css';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLanguage();
  const [activeDepot, setActiveDepot] = useState('TNSTC_KUM');
  const [weather, setWeather] = useState(null);
  const [tnCities, setTnCities] = useState([]);

  // Default robust request state
  const [requestState, setRequestState] = useState(
    JSON.parse(localStorage.getItem('ulaa_demo_req')) || { status: 'IDLE', to: '', from: '', rejectReason: '' }
  );

  const [denyInput, setDenyInput] = useState('');
  const [showDenyInput, setShowDenyInput] = useState(false);

  useEffect(() => {
    const depot = localStorage.getItem('activeDepot');
    if (depot) setActiveDepot(depot);

    // Fetch the 184 dataset dynamically
    fetch('/data/stops_processed.csv')
      .then(res => res.text())
      .then(csv => {
        const rows = csv.split('\n').slice(1).filter(r => r.trim());
        const parsed = rows.map(row => {
          const match = row.match(/([^,]+),"([^"]+)",([^,]+),([^,]+),([^,]+)/);
          if (match) {
            return {
              id: match[1],
              name: match[2],
              lat: parseFloat(match[3]),
              lng: parseFloat(match[4]),
              cap: parseInt(match[5])
            };
          }
          return null;
        }).filter(Boolean);
        setTnCities(parsed);
      })
      .catch(console.error);

    fetch('https://api.open-meteo.com/v1/forecast?latitude=10.7661&longitude=79.6344&current_weather=true')
      .then(res => res.json())
      .then(data => setWeather(data.current_weather))
      .catch(console.error);

    const handleStorage = () => {
      const savedReq = localStorage.getItem('ulaa_demo_req');
      if (savedReq) setRequestState(JSON.parse(savedReq));
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 1000);

    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  const updateRequest = (newState) => {
    localStorage.setItem('ulaa_demo_req', JSON.stringify(newState));
    setRequestState(newState);
  };

  const handleOutgoingRequest = () => {
    updateRequest({ status: 'PENDING', from: 'TNSTC_KUM', to: 'TNSTC_MDU', rejectReason: '' });
  };

  const handleBackupRequest = () => {
    updateRequest({ status: 'PENDING', from: 'TNSTC_KUM', to: 'TNSTC_SLM', rejectReason: '' });
  };

  const handleApproveIncoming = () => {
    updateRequest({ ...requestState, status: 'APPROVED' });
  };

  const handleConfirmDeny = () => {
    if (!denyInput.trim()) return;
    updateRequest({ ...requestState, status: 'DENIED', rejectReason: denyInput });
    setShowDenyInput(false);
    setDenyInput('');
  };

  const isKumbakonam = activeDepot === 'TNSTC_KUM'; 
  const isMadurai = activeDepot === 'TNSTC_MDU'; 

  // Hardcode the festival logic directly into the map for 100% reliability during demo
  const mapStops = tnCities.map(city => {
    let level = 'Normal';
    let color = '#10b981';
    
    // Deterministic pseudo-random crowd based on string length to stay static on refresh
    let crowd = 50 + (city.name.length * 7) + parseInt(city.id.replace(/\D/g, '')) % 100;
    
    const cName = city.name.toLowerCase();
    
    // Always show Thiruvarur as crowded for the demo
    if (cName.includes('thiruvarur')) { 
      level = 'High'; color = '#dc2626'; crowd = 4500; 
    } else if (cName.includes('kumbakonam') || cName.includes('thanjavur') || cName.includes('nagapattinam')) { 
      level = 'Moderate'; color = '#f59e0b'; crowd = 1500 + (city.name.length * 10); 
    }
    
    return { ...city, level, color, crowd };
  });

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
              {weather.weathercode > 50 ? <CloudRain size={20} color="#0ea5e9" /> : <Sun size={20} color="#f59e0b" />}
              <span>{weather.temperature}°C</span>
            </div>
          )}
          
          {isKumbakonam && (
            <div className="festival-badge" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
              <span className="live-dot"></span> Thiruvarur Ther Festival
            </div>
          )}
          {isMadurai && (
            <div className="festival-badge" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#b45309' }}>
              <CalendarDays size={16} style={{ display: 'inline' }} /> Upcoming: Azhagar Thiruvizha (Oct 30, 31)
            </div>
          )}

          <button className="icon-btn font-semibold text-sm" onClick={toggleLang}>
            {lang === 'en' ? 'TA' : 'EN'}
          </button>
          <button className="icon-btn" title="Reset Demo Flow" onClick={() => updateRequest({ status: 'IDLE', to: '', from: '', rejectReason: '' })}>
            <RefreshCw size={20} />
          </button>
          <button className="icon-btn" onClick={() => { localStorage.clear(); navigate('/login'); }}><Settings /></button>
        </div>
      </nav>

      <div className="admin-grid">
        <div className="main-content flex-col gap-4">
          <div className="glass-panel p-4 flex-col" style={{ flex: 1 }}>
            <div className="map-header">
              <h3>{lang === 'ta' ? 'மாநிலம் தழுவிய கூட்ட நெரிசல் வரைபடம்' : 'Statewide 184-Terminal Crowd Map'}</h3>
              <div className="legend">
                <span style={{ color: '#dc2626', fontWeight: 600 }}>● High Crowd</span>
                <span style={{ color: '#f59e0b', fontWeight: 600 }}>● Moderate</span>
                <span style={{ color: '#10b981', fontWeight: 600 }}>● Normal</span>
              </div>
            </div>
            <div className="map-container" style={{ minHeight: '350px' }}>
              {tnCities.length > 0 && (
                <MapContainer center={[10.7725, 79.6339]} zoom={7} style={{ height: '100%', width: '100%', borderRadius: '12px' }}>
                  <TileLayer 
                    url="https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoibWFoYWRoYXJhbmkiLCJhIjoiY212MmRhZ2dsMGVlZDJ5cXY0bnJwaGVydiJ9.L7ri0Nl8X1WpvdqzqvjraQ" 
                    attribution='Map data &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
                  />
                  {mapStops.map(stop => (
                    <CircleMarker 
                      key={stop.id} 
                      center={[stop.lat, stop.lng]} 
                      radius={5}
                      pathOptions={{ color: stop.color, fillColor: stop.color, fillOpacity: stop.level === 'Normal' ? 0.3 : 0.8 }}
                    >
                      <Popup>
                        <div className="popup-content">
                          <h4>{stop.name}</h4>
                          <p>Crowd Level: <strong>{stop.level}</strong></p>
                          <p>Occupancy: {stop.crowd} / {stop.cap}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  ))}
                </MapContainer>
              )}
            </div>
          </div>
          
          <div className="glass-panel p-6">
            <h3 className="widget-title mb-4"><Activity size={20}/> {t('yesterdayStatus')}</h3>
            <div className="flex gap-4">
              <div className="stat-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
                <p className="text-secondary">{t('departed')}</p>
                <h2>142</h2>
              </div>
              <div className="stat-card" style={{ borderLeft: '4px solid var(--success)' }}>
                <p className="text-secondary">{t('reached')}</p>
                <h2>138</h2>
              </div>
              <div className="stat-card" style={{ borderLeft: '4px solid var(--warning)' }}>
                <p className="text-secondary">{t('transit')}</p>
                <h2>4</h2>
              </div>
            </div>
          </div>
        </div>

        <div className="side-panel flex-col gap-4">
          {/* Incoming Request View for Madurai */}
          {activeDepot === requestState.to && requestState.status !== 'IDLE' && (
            <div className="glass-panel widget">
              <h3 className="widget-title"><Inbox size={20}/> Incoming Requests</h3>
              <div className="recommendation-card border-left-blue">
                <span className="badge badge-ai mb-2 block">From: {requestState.from}</span>
                <h4>Request for 30 Spare Buses</h4>
                <div className="bg-gray-50 p-3 rounded my-3 border border-gray-100" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                  <p className="text-sm font-medium mb-1 text-primary">Requested Fleet Specifications:</p>
                  <ul className="text-sm text-secondary list-disc pl-4 mb-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    <li><strong>TN-58-N-1299</strong> (Type: LSS, Cap: 60) - 182km away</li>
                    <li><strong>TN-58-N-3044</strong> (Type: Express, Cap: 50) - 185km away</li>
                    <li>... and 28 more.</li>
                  </ul>
                  <p className="text-xs text-danger font-medium">Justification: Thiruvarur Festival Shortfall.</p>
                </div>
                
                {requestState.status === 'PENDING' && !showDenyInput && (
                  <div className="flex gap-2 mt-4">
                    <button className="btn-primary" style={{ flex: 1, padding: '8px' }} onClick={handleApproveIncoming}>{lang === 'ta' ? 'ஏற்க' : 'Approve'}</button>
                    <button className="btn-primary" style={{ flex: 1, padding: '8px', background: '#f1f5f9', color: '#0f172a', boxShadow: 'none', border: '1px solid #cbd5e1' }} onClick={() => setShowDenyInput(true)}>Deny</button>
                  </div>
                )}

                {showDenyInput && (
                  <div className="mt-4 flex-col gap-2 p-3" style={{ background: '#fef2f2', borderRadius: '8px', border: '1px solid #fecaca' }}>
                    <label className="text-sm font-semibold text-danger">Reason for Rejection *</label>
                    <input 
                      type="text" 
                      value={denyInput}
                      onChange={(e) => setDenyInput(e.target.value)}
                      placeholder="Type valid reason here..."
                      style={{ padding: '8px', borderRadius: '4px', border: '1px solid #fca5a5', width: '100%' }}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button className="btn-primary" style={{ flex: 1, background: '#dc2626', padding: '6px' }} onClick={handleConfirmDeny}>Confirm Deny</button>
                      <button className="btn-primary" style={{ flex: 1, background: '#e2e8f0', color: '#333', padding: '6px' }} onClick={() => setShowDenyInput(false)}>Cancel</button>
                    </div>
                  </div>
                )}
                
                {requestState.status === 'APPROVED' && (
                  <div className="flex items-center gap-2 text-success mt-4 font-medium">
                    <CheckCircle size={18} /> Request Accepted. Buses Dispatched.
                  </div>
                )}
                
                {requestState.status === 'DENIED' && (
                  <div className="flex-col gap-1 mt-4">
                    <div className="flex items-center gap-2 text-danger font-medium">
                      <AlertTriangle size={18} /> Request Denied.
                    </div>
                    <p className="text-sm" style={{ color: '#991b1b' }}>Your Reason: {requestState.rejectReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Outgoing Requests / Predictions for Kumbakonam */}
          {isKumbakonam && (
            <div className="glass-panel widget">
              <h3 className="widget-title"><TrendingUp size={20}/> AI Prediction Model</h3>
              <div className="alert-box critical mb-4" style={{ background: '#fef2f2', borderColor: '#fca5a5' }}>
                <AlertTriangle size={24} color="#dc2626" />
                <div>
                  <strong style={{ color: '#991b1b' }}>Thiruvarur Festival Overload</strong>
                  <ul className="text-sm mt-1" style={{ color: '#991b1b' }}>
                    <li>Past Demand: 3200 px</li>
                    <li>Growth/Weather Penalty: +1300 px</li>
                    <li><strong>Predicted Crowd: 4500 px</strong></li>
                  </ul>
                  <p className="mt-2 font-bold text-danger">Shortfall: 2000 passengers (30 buses)</p>
                </div>
              </div>
              
              <h3 className="widget-title"><Send size={20}/> Cross-Depot Request</h3>
              
              {requestState.status === 'IDLE' && (
                <div className="recommendation-card">
                  <h4>Request 30 buses from Madurai Div</h4>
                  <div className="bg-gray-50 p-2 rounded my-2 border border-gray-100" style={{ background: '#f8fafc', fontSize: '0.875rem' }}>
                    <p className="font-semibold text-primary mb-1">Available at MDU:</p>
                    <p className="text-secondary text-sm">Madurai has sufficient fleet. AI has bundled specific bus IDs and distances.</p>
                  </div>
                  <button className="btn-primary w-full mt-2" onClick={handleOutgoingRequest}>Send Request Payload</button>
                </div>
              )}

              {requestState.status === 'PENDING' && requestState.from === activeDepot && (
                <div className="recommendation-card">
                  <h4>Request sent to Madurai</h4>
                  <button className="btn-primary w-full pending mt-4" disabled>
                    <span className="spinner"></span> Status: Pending...
                  </button>
                </div>
              )}

              {requestState.status === 'APPROVED' && requestState.from === activeDepot && (
                <div className="recommendation-card" style={{ borderLeft: '4px solid #10b981' }}>
                  <h4 style={{ color: '#10b981' }} className="flex items-center gap-2"><CheckCircle size={18}/> Madurai Request Accepted!</h4>
                  <p className="text-secondary text-sm mt-2">All 30 buses en route.</p>
                </div>
              )}

              {requestState.status === 'DENIED' && requestState.from === activeDepot && (
                <div className="recommendation-card" style={{ borderLeft: '4px solid #dc2626', background: '#fef2f2' }}>
                  <h4 style={{ color: '#dc2626' }} className="flex items-center gap-2"><AlertTriangle size={18}/> Denied Request</h4>
                  <p className="text-sm font-semibold mt-2" style={{ color: '#991b1b' }}>Reason: "{requestState.rejectReason}"</p>
                  
                  <div className="p-3 bg-white rounded border border-gray-200 mt-4">
                    <h5 className="font-semibold mb-1 text-primary">Backup Suggestion: Salem Division</h5>
                    <p className="text-sm text-secondary">Salem has free idle buses.</p>
                    <button className="btn-primary w-full mt-2" onClick={handleBackupRequest} style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}>
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
