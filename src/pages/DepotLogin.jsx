import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Key, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../LanguageContext';

export default function DepotLogin() {
  const navigate = useNavigate();
  const { t, lang, toggleLang } = useLanguage();
  const [depot, setDepot] = useState('TNSTC_KUM');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const depots = [
    { id: 'TNSTC_CBE', name: 'Coimbatore Division' },
    { id: 'TNSTC_MDU', name: 'Madurai Division' },
    { id: 'TNSTC_KUM', name: 'Kumbakonam Division' },
    { id: 'TNSTC_SLM', name: 'Salem Division' },
    { id: 'TNSTC_VPM', name: 'Villupuram Division' },
    { id: 'TNSTC_TNV', name: 'Tirunelveli Division' }
  ];

  const handleLogin = (e) => {
    e.preventDefault();
    const depotPrefix = depot.split('_')[1];
    if (password === `${depotPrefix}@360`) {
      localStorage.setItem('activeDepot', depot);
      navigate('/admin');
    } else {
      setError(lang === 'ta' ? 'தவறான கடவுச்சொல்.' : 'Invalid password. Check credentials.');
    }
  };

  return (
    <div className="page-container flex-col items-center justify-center min-h-screen relative">
      <button 
        onClick={toggleLang} 
        className="icon-btn absolute top-4 right-4 font-semibold text-sm"
        style={{ width: '40px' }}
      >
        {lang === 'en' ? 'TA' : 'EN'}
      </button>

      <div className="glass-panel p-8 w-full" style={{ maxWidth: '400px' }}>
        <button className="icon-btn mb-6" onClick={() => navigate('/')}><ArrowLeft size={20} /></button>
        <div className="text-center mb-6">
          <ShieldCheck size={48} className="mx-auto text-accent-primary mb-2" />
          <h2>{t('depotManager')}</h2>
        </div>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <div>
            <label className="text-secondary block mb-2">{t('selectDivision')}</label>
            <select 
              className="stop-select" 
              value={depot} 
              onChange={(e) => setDepot(e.target.value)}
            >
              {depots.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div>
            <label className="text-secondary block mb-2">{t('passcode')}</label>
            <div className="select-wrapper">
              <Key className="select-icon" size={20} />
              <input 
                type="password" 
                className="stop-select w-full" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="..."
              />
            </div>
          </div>

          {error && <p className="text-danger" style={{ fontSize: '0.875rem' }}>{error}</p>}
          
          <button type="submit" className="btn-primary w-full mt-2">{t('login')}</button>
        </form>
      </div>
    </div>
  );
}
