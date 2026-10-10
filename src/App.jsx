import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LanguageProvider } from './LanguageContext';
import Home from './pages/Home';
import DepotLogin from './pages/DepotLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserDashboard from './pages/UserDashboard';

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<DepotLogin />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/user" element={<UserDashboard />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  );
}

export default App;
