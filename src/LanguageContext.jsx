import { createContext, useState, useContext, useEffect } from 'react';

const translations = {
  en: {
    appTitle: 'Ulaa360',
    appSubtitle: 'Festival Crowd and Transport Demand Prediction',
    depotManager: 'Depot Manager',
    depotDesc: 'Monitor real-time demand, view predictions, and re-allocate buses to avoid crowding at festival nodes.',
    passenger: 'Passenger',
    passengerDesc: 'Check bus availability, live occupancy, and plan your safe journey home.',
    enterApp: 'Enter App',
    enterDash: 'Enter Dashboard',
    selectDivision: 'Select Division',
    passcode: 'Passcode',
    login: 'Login to Dashboard',
    from: 'From (Origin)',
    to: 'To (Destination)',
    liveSuggestion: 'Live AI Suggestion',
    regularDepartures: 'Regular Departures',
    specialBuses: 'Special Spare Buses (Festival)',
    peopleWaiting: 'people waiting',
    waitTime: 'Avg. Wait Time',
    crowded: 'Crowded (Festival Time)',
    normal: 'Normal',
    boardAnytime: 'Board anytime. Service is running on schedule.',
    seatsAvail: 'Seats Avail',
    standing: 'Standing',
    yesterdayStatus: "Yesterday's Fleet Status",
    departed: 'Departed',
    reached: 'Reached Safely',
    transit: 'Yet to Arrive / Transit',
    incomingRequests: 'Incoming Requests',
    aiPrediction: 'AI Prediction',
    crossDepot: 'Cross-Depot Request'
  },
  ta: {
    appTitle: 'உலா360 (Ulaa360)',
    appSubtitle: 'திருவிழா கூட்ட நெரிசல் மற்றும் போக்குவரத்து கணிப்பு',
    depotManager: 'பணிமனை மேலாளர்',
    depotDesc: 'நிகழ்நேர தேவையை கண்காணிக்கவும் மற்றும் பேருந்துகளை தேவைக்கு ஏற்ப மாற்றவும்.',
    passenger: 'பயணிகள்',
    passengerDesc: 'பேருந்து இருப்பு, கூட்ட நெரிசல் ஆகியவற்றை அறிந்து பயணத்தை திட்டமிடுங்கள்.',
    enterApp: 'பயன்பாட்டைத் தொடங்கு',
    enterDash: 'டேஷ்போர்டை திற',
    selectDivision: 'கோட்டத்தை தேர்ந்தெடுக்கவும்',
    passcode: 'கடவுச்சொல்',
    login: 'உள்நுழைய',
    from: 'புறப்படும் இடம் (From)',
    to: 'சேரும் இடம் (To)',
    liveSuggestion: 'நேரடி பரிந்துரை',
    regularDepartures: 'வழக்கமான பேருந்துகள்',
    specialBuses: 'சிறப்பு பேருந்துகள் (திருவிழா)',
    peopleWaiting: 'பயணிகள் காத்திருப்பு',
    waitTime: 'காத்திருப்பு நேரம்',
    crowded: 'கூட்ட நெரிசல் (திருவிழா)',
    normal: 'சாதாரணம்',
    boardAnytime: 'சேவை சீராக இயங்குகிறது. பயணிக்கலாம்.',
    seatsAvail: 'இருக்கைகள் உள்ளன',
    standing: 'நின்று பயணிக்க',
    yesterdayStatus: 'நேற்றைய பேருந்து நிலவரம்',
    departed: 'புறப்பட்டவை',
    reached: 'சென்றடைந்தவை',
    transit: 'பயணத்தில் உள்ளவை',
    incomingRequests: 'உள்வரும் கோரிக்கைகள்',
    aiPrediction: 'AI கணிப்பு',
    crossDepot: 'கோட்டங்களுக்கு இடையிலான கோரிக்கை'
  }
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(localStorage.getItem('ulaa_lang') || 'en');

  useEffect(() => {
    localStorage.setItem('ulaa_lang', lang);
  }, [lang]);

  const t = (key) => translations[lang][key] || key;

  const toggleLang = () => {
    setLang(lang === 'en' ? 'ta' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ lang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
