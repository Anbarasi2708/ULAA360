import { useNavigate } from 'react-router-dom';
import { Users, ShieldAlert } from 'lucide-react';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page-container flex-col items-center justify-center min-h-screen">
      <div className="text-center animate-fade-in" style={{ marginBottom: '4rem' }}>
        <img src="/logo.png" alt="Ulaa360 Logo" style={{ height: '80px', marginBottom: '1rem' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 className="title-gradient">Ulaa360</h1>
        <p className="subtitle">Festival Crowd and Transport Demand Prediction</p>
      </div>

      <div className="flex gap-6 cards-container animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <div className="glass-panel role-card p-8 flex-col items-center gap-4" onClick={() => navigate('/login')}>
          <div className="icon-wrapper admin-icon">
            <ShieldAlert size={48} />
          </div>
          <h2>Depot Manager</h2>
          <p className="text-secondary text-center">
            Monitor real-time demand, view predictions, and re-allocate buses to avoid crowding at festival nodes.
          </p>
          <button className="btn-primary mt-4 w-full">Enter Dashboard</button>
        </div>

        <div className="glass-panel role-card p-8 flex-col items-center gap-4" onClick={() => navigate('/user')}>
          <div className="icon-wrapper user-icon">
            <Users size={48} />
          </div>
          <h2>Passenger</h2>
          <p className="text-secondary text-center">
            Check bus availability, live occupancy, and plan your safe journey home.
          </p>
          <button className="btn-primary mt-4 w-full" style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
            Enter App
          </button>
        </div>
      </div>
    </div>
  );
}
