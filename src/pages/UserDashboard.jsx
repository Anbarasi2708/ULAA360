import { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Clock, Users, Bus, Navigation, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../LanguageContext';
import './UserDashboard.css';

export default function UserDashboard() {
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLanguage();
  
  const [allStops, setAllStops] = useState([]);
  const [fromStopName, setFromStopName] = useState('Thiruvarur (Festival Node)');
  const [toStopName, setToStopName] = useState('Coimbatore Gandhipuram Central Bus Stand');

  useEffect(() => {
    fetch('/data/stops_processed.csv')
      .then(res => res.text())
      .then(csv => {
        const rows = csv.split('\n').slice(1).filter(r => r.trim());
        const parsed = rows.map(row => {
          const match = row.match(/([^,]+),"([^"]+)",([^,]+),([^,]+),([^,]+)/);
          if (match) {
            return { id: match[1], name: match[2] };
          }
          return null;
        }).filter(Boolean);
        // Ensure Thiruvarur is pushed to the top for easy testing
        const tvrIdx = parsed.findIndex(p => p.name.toLowerCase().includes('thiruvarur'));
        if (tvrIdx > -1) {
          const tvr = parsed.splice(tvrIdx, 1)[0];
          parsed.unshift(tvr);
        }
        setAllStops(parsed);
      })
      .catch(console.error);
  }, []);
  
  const generateBusNumber = (str, seed) => {
    let hash = 0;
    if (!str) str = "default";
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const rtos = [38, 45, 49, 58, 72, 74, 99];
    const rto = rtos[Math.abs(hash) % rtos.length];
    const num = Math.abs(hash * seed) % 9000 + 1000;
    return `TN-${rto}-N-${num}`;
  };

  const getStopData = () => {
    const isFestival = fromStopName.toLowerCase().includes('thiruvarur');
    const toName = (toStopName || 'City').split(' ')[0];
    
    if (isFestival) {
      return {
        status: t('crowded'),
        color: '#dc2626',
        wait: '30 mins',
        crowd: '4,500',
        recommendation: lang === 'ta' ? 'கும்பகோணம் கோட்டத்தில் இருந்து கூடுதல் பேருந்துகள் இயக்கப்பட்டுள்ளன. வரிசை B-ல் காத்திருக்கவும்.' : 'Extra buses have been allocated by Kumbakonam Depot. Wait in Queue B for Express services.',
        regularBuses: [
          { route: `Express to ${toName}`, eta: '5 min', no: generateBusNumber(toStopName, 1), cap: 50, occ: 65 },
          { route: `LSS Route`, eta: '12 min', no: generateBusNumber(toStopName, 2), cap: 40, occ: 42 }
        ],
        spareBuses: [
          { route: `Special to ${toName}`, eta: '15 min', no: 'SPARE-101', cap: 60, occ: 0 },
          { route: 'Madurai SPL (From MDU Div)', eta: '20 min', no: 'SPARE-MDU', cap: 50, occ: 0 }
        ]
      };
    }
    return {
      status: t('normal'),
      color: '#059669',
      wait: '5 mins',
      crowd: '15',
      recommendation: t('boardAnytime'),
      regularBuses: [
        { route: `Local via ${toName}`, eta: '5 min', no: generateBusNumber(toStopName, 3), cap: 40, occ: 15 },
        { route: `Express to ${toName}`, eta: '25 min', no: generateBusNumber(toStopName, 4), cap: 50, occ: 20 }
      ],
      spareBuses: []
    };
  };

  const data = getStopData();

  const renderOccupancy = (occ, cap) => {
    const isOver = occ > cap;
    return (
      <div className={`occupancy-badge ${isOver ? 'overcrowded' : 'normal'}`}>
        <Users size={14} /> 
        {occ}/{cap} {isOver ? `(${t('standing')})` : `(${t('seatsAvail')})`}
      </div>
    );
  };

  return (
    <div className="user-container">
      <nav className="user-nav glass-panel">
        <button className="icon-btn" onClick={() => navigate('/')}><ArrowLeft /></button>
        <img src="/logo.png" alt="Logo" style={{ height: '32px' }} onError={(e) => e.target.style.display = 'none'} />
        <button onClick={toggleLang} className="icon-btn font-semibold text-sm">
          {lang === 'en' ? 'TA' : 'EN'}
        </button>
      </nav>

      <div className="user-content mt-4">
        <div className="glass-panel p-6 flex-col gap-4">
          <div>
            <label className="text-secondary mb-2 block">{t('from')}</label>
            <div className="select-wrapper">
              <MapPin className="select-icon" size={20} />
              <select 
                value={fromStopName} 
                onChange={(e) => setFromStopName(e.target.value)}
                className="stop-select custom-select"
              >
                {allStops.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-secondary mb-2 block">{t('to')}</label>
            <div className="select-wrapper">
              <Navigation className="select-icon" size={20} />
              <select 
                value={toStopName} 
                onChange={(e) => setToStopName(e.target.value)}
                className="stop-select custom-select"
              >
                {allStops.map(s => <option key={`to-${s.id}`} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="status-grid mt-4">
          <div className="glass-panel p-6 flex-col items-center justify-center text-center">
            <Users size={32} color={data.color} className="mb-2" />
            <h3 style={{ color: data.color }}>{data.status}</h3>
            <p className="text-secondary mt-1">{data.crowd} {t('peopleWaiting')}</p>
          </div>
          <div className="glass-panel p-6 flex-col items-center justify-center text-center">
            <Clock size={32} className="mb-2 text-primary" />
            <h3>{data.wait}</h3>
            <p className="text-secondary mt-1">{t('waitTime')}</p>
          </div>
        </div>

        <div className="glass-panel p-6 mt-4 suggestion-box">
          <div className="flex items-center gap-2 mb-2">
            <Info size={20} className="text-accent" />
            <h3 className="text-accent">{t('liveSuggestion')}</h3>
          </div>
          <p>{data.recommendation}</p>
        </div>

        <h3 className="mt-6 mb-4 flex items-center gap-2"><Bus /> {t('regularDepartures')}</h3>
        <div className="flex-col gap-2">
          {data.regularBuses.map((arr, i) => (
            <div key={i} className="arrival-card glass-panel">
              <div className="flex-col">
                <span className="route-name">{arr.route}</span>
                <span className="text-secondary text-sm">{arr.no}</span>
              </div>
              <div className="flex-col items-end gap-1">
                <span className="eta-badge">{arr.eta}</span>
                {renderOccupancy(arr.occ, arr.cap)}
              </div>
            </div>
          ))}
        </div>

        {data.spareBuses.length > 0 && (
          <>
            <h3 className="mt-6 mb-4 flex items-center gap-2" style={{ color: '#0ea5e9' }}>
              <Bus /> {t('specialBuses')}
            </h3>
            <div className="flex-col gap-2">
              {data.spareBuses.map((arr, i) => (
                <div key={i} className="arrival-card glass-panel" style={{ borderLeft: '4px solid #0ea5e9', background: '#f0f9ff' }}>
                  <div className="flex-col">
                    <span className="route-name" style={{ color: '#0369a1' }}>{arr.route}</span>
                    <span className="text-secondary text-sm">{arr.no}</span>
                  </div>
                  <div className="flex-col items-end gap-1">
                    <span className="eta-badge" style={{ background: '#0ea5e9' }}>{arr.eta}</span>
                    {renderOccupancy(arr.occ, arr.cap)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
