import { useNavigate } from 'react-router-dom';
import { Users, ShieldAlert, Globe } from 'lucide-react';
import { useLanguage } from '../LanguageContext';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const { t, toggleLang, lang } = useLanguage();

  return (
    <div className="page-container flex-col items-center justify-center min-h-screen relative">
      <button 
        onClick={toggleLang} 
        className="icon-btn absolute top-4 right-4 flex items-center gap-2"
        style={{ width: 'auto', padding: '0 1rem', background: 'white' }}
      >
        <Globe size={18} />
        <span style={{ fontWeight: 600 }}>{lang === 'en' ? 'தமிழ்' : 'English'}</span>
      </button>

      <div className="text-center animate-fade-in" style={{ marginBottom: '4rem' }}>
        <img src="/logo.png" alt="Ulaa360 Logo" style={{ height: '80px', marginBottom: '1rem' }} onError={(e) => e.target.style.display = 'none'} />
        <h1 className="title-gradient">{t('appTitle')}</h1>
        <p className="subtitle">{t('appSubtitle')}</p>
      </div>

      <div className="flex gap-6 cards-container animate-fade-in" style={{ animationDelay: '0.2s', opacity: 0 }}>
        <div className="glass-panel role-card p-8 flex-col items-center gap-4" onClick={() => navigate('/login')}>
          <div className="icon-wrapper admin-icon">
            <ShieldAlert size={48} />
          </div>
          <h2>{t('depotManager')}</h2>
          <p className="text-secondary text-center">{t('depotDesc')}</p>
          <button className="btn-primary mt-4 w-full">{t('enterDash')}</button>
        </div>

        <div className="glass-panel role-card p-8 flex-col items-center gap-4" onClick={() => navigate('/user')}>
          <div className="icon-wrapper user-icon">
            <Users size={48} />
          </div>
          <h2>{t('passenger')}</h2>
          <p className="text-secondary text-center">{t('passengerDesc')}</p>
          <button className="btn-primary mt-4 w-full" style={{ background: 'linear-gradient(135deg, var(--success), #047857)', boxShadow: '0 4px 15px rgba(16, 185, 129, 0.4)' }}>
            {t('enterApp')}
          </button>
        </div>
      </div>
    </div>
  );
}
