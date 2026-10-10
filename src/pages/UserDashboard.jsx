import { useState } from 'react';
import { ArrowLeft, MapPin, Clock, Users, Bus, Navigation, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './UserDashboard.css';

const allStops = [
  { id: 'TN_CHE_001', name: 'Kilambakkam Kalaignar Centenary Bus Terminus (KCBT), Vandalur' },
  { id: 'TN_CHE_002', name: 'Puratchi Thalaivar Dr. MGR Bus Terminus (CMBT), Koyambedu' },
  { id: 'TN_CHE_003', name: 'Madhavaram Moffusil Bus Terminus (MMBT)' },
  { id: 'TN_CHE_004', name: 'Kallikuppam Velachery Bus Stand' },
  { id: 'TN_CHE_005', name: 'Tambaram Sanatorium MTC Bus Stand' },
  { id: 'TN_CHE_006', name: 'Broadway Bus Terminus' },
  { id: 'TN_CHE_007', name: 'T Nagar Bus Terminus' },
  { id: 'TN_CHE_008', name: 'Avadi Bus Terminus' },
  { id: 'TN_CHE_009', name: 'Poonamallee Bus Terminus' },
  { id: 'TN_CHE_010', name: 'Redhills Bus Stand' },
  { id: 'TN_MDU_001', name: 'Mattuthavani Integrated Bus Terminus (MIBT)' },
  { id: 'TN_MDU_002', name: 'Arappalayam Bus Stand' },
  { id: 'TN_MDU_003', name: 'Periyar Central Bus Stand' },
  { id: 'TN_MDU_004', name: 'Anuppanadi Bus Stand' },
  { id: 'TN_MDU_005', name: 'Usilampatti Bus Stand' },
  { id: 'TN_MDU_006', name: 'Melur New Bus Stand' },
  { id: 'TN_MDU_007', name: 'Thirumangalam Bus Stand' },
  { id: 'TN_CBE_001', name: 'Gandhipuram Central Bus Terminus' },
  { id: 'TN_CBE_002', name: 'Singanallur Bus Terminus' },
  { id: 'TN_CBE_003', name: 'Ukkadam Bus Terminus' },
  { id: 'TN_CBE_004', name: 'Mettupalayam Road Bus Terminus' },
  { id: 'TN_CBE_005', name: 'Sulur Bus Stand' },
  { id: 'TN_CBE_006', name: 'Pollachi Central Bus Stand' },
  { id: 'TN_CBE_007', name: 'Valparai Bus Stand' },
  { id: 'TN_TRY_001', name: 'Trichy Central Bus Station' },
  { id: 'TN_TRY_002', name: 'Chatram Bus Stand' },
  { id: 'TN_TRY_003', name: 'Srirangam Bus Stand' },
  { id: 'TN_TRY_004', name: 'Thiruverumbur Bus Stand' },
  { id: 'TN_TRY_005', name: 'Manapparai New Bus Stand' },
  { id: 'TN_TRY_006', name: 'Thuraiyur Bus Stand' },
  { id: 'TN_SLM_001', name: 'MGR Central Bus Terminus, Salem' },
  { id: 'TN_SLM_002', name: 'Old Bus Stand, Salem' },
  { id: 'TN_SLM_003', name: 'Attur New Bus Stand' },
  { id: 'TN_SLM_004', name: 'Omalur Bus Stand' },
  { id: 'TN_SLM_005', name: 'Mettur Bus Terminus' },
  { id: 'TN_ERD_001', name: 'Erode Central Bus Terminus' },
  { id: 'TN_ERD_002', name: 'Perundurai Bus Stand' },
  { id: 'TN_ERD_003', name: 'Bhavani Bus Terminus' },
  { id: 'TN_ERD_004', name: 'Gobichettipalayam Bus Stand' },
  { id: 'TN_ERD_005', name: 'Sathyamangalam Bus Stand' },
  { id: 'TN_TNM_001', name: 'Tiruvannamalai Central Bus Station' },
  { id: 'TN_TNM_002', name: 'Arani New Bus Stand' },
  { id: 'TN_TNM_003', name: 'Polur Bus Stand' },
  { id: 'TN_TNM_004', name: 'Chengam Bus Stand' },
  { id: 'TN_TNM_005', name: 'Cheyyar Bus Stand' },
  { id: 'TN_VLR_001', name: 'Vellore New Bus Terminus' },
  { id: 'TN_VLR_002', name: 'Gudiyatham New Bus Stand' },
  { id: 'TN_VLR_003', name: 'Ambur Bus Stand' },
  { id: 'TN_VLR_004', name: 'Vaniyambadi Bus Stand' },
  { id: 'TN_VLR_005', name: 'Tirupattur Central Bus Stand' },
  { id: 'TN_VLR_006', name: 'Arakkonam New Bus Stand' },
  { id: 'TN_VLR_007', name: 'Walajapet Bus Stand' },
  { id: 'TN_VLR_008', name: 'Arcot New Bus Stand' },
  { id: 'TN_VPM_001', name: 'Viluppuram Central Bus Station' },
  { id: 'TN_VPM_002', name: 'Kallakurichi New Bus Stand' },
  { id: 'TN_VPM_003', name: 'Tindivanam New Bus Stand' },
  { id: 'TN_VPM_004', name: 'Gingee Bus Stand' },
  { id: 'TN_VPM_005', name: 'Ulundurpet Bus Stand' },
  { id: 'TN_VPM_006', name: 'Sankarapuram Bus Stand' },
  { id: 'TN_TNL_001', name: 'Periyar New Bus Stand, Tirunelveli' },
  { id: 'TN_TNL_002', name: 'Palayamkottai Junction Bus Stand' },
  { id: 'TN_TNL_003', name: 'Tenkasi Central Bus Stand' },
  { id: 'TN_TNL_004', name: 'Sankarankovil New Bus Stand' },
  { id: 'TN_TNL_005', name: 'Ambasamudram Bus Stand' },
  { id: 'TN_TNL_006', name: 'Valliyur New Bus Stand' },
  { id: 'TN_NGC_001', name: 'Christopher Bus Stand, Nagercoil' },
  { id: 'TN_NGC_002', name: 'Vadasery Central Bus Stand' },
  { id: 'TN_NGC_003', name: 'Thuckalay Bus Stand' },
  { id: 'TN_NGC_004', name: 'Marthandam New Bus Stand' },
  { id: 'TN_NGC_005', name: 'Kanyakumari Pier Bus Stand' },
  { id: 'TN_TKI_001', name: 'Perarignar Anna Bus Terminus, Thoothukudi' },
  { id: 'TN_TKI_002', name: 'Kovilpatti New Bus Stand' },
  { id: 'TN_TKI_003', name: 'Tiruchendur Central Bus Stand' },
  { id: 'TN_TKI_004', name: 'Ettayapuram Bus Stand' },
  { id: 'TN_TKI_005', name: 'Srivaikuntam Bus Stand' },
  { id: 'TN_KOM_001', name: 'Kumbakonam Central Bus Station' },
  { id: 'TN_KOM_002', name: 'Thanjavur New Bus Stand' },
  { id: 'TN_KOM_003', name: 'Thanjavur Old Bus Stand' },
  { id: 'TN_KOM_004', name: 'Pattukkottai Bus Stand' },
  { id: 'TN_KOM_005', name: 'Mayiladuthurai New Bus Station' },
  { id: 'TN_KOM_006', name: 'Sirkazhi Bus Station' },
  { id: 'TN_KOM_007', name: 'Nagapattinam Central Bus Stand' },
  { id: 'TN_KOM_008', name: 'Velankanni Bus Stand' },
  { id: 'TN_KOM_009', name: 'Vedaranyam Bus Stand' },
  { id: 'TN_KOM_010', name: 'Thiruvarur New Bus Stand (Festival Node)' },
  { id: 'TN_KOM_011', name: 'Mannargudi New Bus Stand' },
  { id: 'TN_DGL_001', name: 'Dindigul Central Bus Stand' },
  { id: 'TN_DGL_002', name: 'Palani New Bus Stand' },
  { id: 'TN_DGL_003', name: 'Kodaikanal Bus Stand' },
  { id: 'TN_DGL_004', name: 'Oddanchatram Bus Stand' },
  { id: 'TN_THN_001', name: 'Theni New Bus Terminus' },
  { id: 'TN_THN_002', name: 'Bodinayakanur Bus Stand' },
  { id: 'TN_THN_003', name: 'Periyakulam Bus Stand' },
  { id: 'TN_THN_004', name: 'Cumbum Bus Stand' },
  { id: 'TN_RMD_001', name: 'Ramanathapuram New Bus Stand' },
  { id: 'TN_RMD_002', name: 'Rameswaram Temple Bus Stand' },
  { id: 'TN_RMD_003', name: 'Paramakudi New Bus Stand' }
];

export default function UserDashboard() {
  const navigate = useNavigate();
  const [fromStop, setFromStop] = useState('TN_KOM_010');
  const [toStop, setToStop] = useState('TN_CBE_001');

  const getStopData = () => {
    // If Thiruvarur New Bus Stand is selected, show crowded festival layout
    if (fromStop === 'TN_KOM_010') {
      return {
        status: 'Crowded (Festival Time)',
        color: '#dc2626',
        wait: '30 mins',
        crowd: '4,500',
        recommendation: 'Extra buses have been allocated by Kumbakonam Depot. Wait in Queue B for Express services.',
        regularBuses: [
          { route: 'Express to Central', eta: '5 min', no: 'TN-49-N-1023', cap: 50, occ: 65 },
          { route: 'LSS to Mannargudi', eta: '12 min', no: 'TN-49-N-4055', cap: 40, occ: 42 }
        ],
        spareBuses: [
          { route: 'Express to Central (Extra)', eta: '15 min', no: 'SPARE-101', cap: 60, occ: 0 },
          { route: 'Madurai SPL (From MDU Div)', eta: '20 min', no: 'SPARE-MDU', cap: 50, occ: 0 }
        ]
      };
    }
    return {
      status: 'Normal',
      color: '#059669',
      wait: '5 mins',
      crowd: '15',
      recommendation: 'Board anytime. Service is running on schedule.',
      regularBuses: [
        { route: 'Local Route 5', eta: '5 min', no: 'TN-38-N-0012', cap: 40, occ: 15 },
        { route: 'Express to Salem', eta: '25 min', no: 'TN-38-N-1244', cap: 50, occ: 20 }
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
        {occ}/{cap} {isOver ? '(Standing)' : '(Seats Avail)'}
      </div>
    );
  };

  return (
    <div className="user-container">
      <nav className="user-nav glass-panel">
        <button className="icon-btn" onClick={() => navigate('/')}><ArrowLeft /></button>
        <img src="/logo.png" alt="Logo" style={{ height: '32px' }} onError={(e) => e.target.style.display = 'none'} />
        <div style={{ width: 40 }}></div>
      </nav>

      <div className="user-content mt-4">
        <div className="glass-panel p-6 flex-col gap-4">
          <div>
            <label className="text-secondary mb-2 block">From</label>
            <div className="select-wrapper">
              <MapPin className="select-icon" size={20} />
              <select 
                value={fromStop} 
                onChange={(e) => setFromStop(e.target.value)}
                className="stop-select"
              >
                {allStops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-secondary mb-2 block">To</label>
            <div className="select-wrapper">
              <Navigation className="select-icon" size={20} />
              <select 
                value={toStop} 
                onChange={(e) => setToStop(e.target.value)}
                className="stop-select"
              >
                {allStops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="status-grid mt-4">
          <div className="glass-panel p-6 flex-col items-center justify-center text-center">
            <Users size={32} color={data.color} className="mb-2" />
            <h3 style={{ color: data.color }}>{data.status}</h3>
            <p className="text-secondary mt-1">{data.crowd} people waiting</p>
          </div>
          <div className="glass-panel p-6 flex-col items-center justify-center text-center">
            <Clock size={32} className="mb-2 text-primary" />
            <h3>{data.wait}</h3>
            <p className="text-secondary mt-1">Avg. Wait Time</p>
          </div>
        </div>

        <div className="glass-panel p-6 mt-4 suggestion-box">
          <div className="flex items-center gap-2 mb-2">
            <Info size={20} className="text-accent" />
            <h3 className="text-accent">Live Suggestion</h3>
          </div>
          <p>{data.recommendation}</p>
        </div>

        <h3 className="mt-6 mb-4 flex items-center gap-2"><Bus /> Regular Departures</h3>
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
            <h3 className="mt-6 mb-4 flex items-center gap-2" style={{ color: '#4f46e5' }}>
              <Bus /> Special Spare Buses (Festival Layout)
            </h3>
            <div className="flex-col gap-2">
              {data.spareBuses.map((arr, i) => (
                <div key={i} className="arrival-card glass-panel" style={{ borderLeft: '4px solid #4f46e5', background: '#f8fafc' }}>
                  <div className="flex-col">
                    <span className="route-name" style={{ color: '#4f46e5' }}>{arr.route}</span>
                    <span className="text-secondary text-sm">{arr.no}</span>
                  </div>
                  <div className="flex-col items-end gap-1">
                    <span className="eta-badge" style={{ background: '#4f46e5' }}>{arr.eta}</span>
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
