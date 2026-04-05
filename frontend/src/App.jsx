import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, LogOut, User as UserIcon } from 'lucide-react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import Store from './pages/Store';
import Login from './pages/Login';
import Register from './pages/Register';

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="logo">NextGen TechStore</Link>
        <div className="nav-links">
          {user ? (
            <>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <UserIcon size={18} /> {user.name || user.email}
              </span>
              <button onClick={handleLogout} className="btn btn-outline" style={{ display: 'inline-flex', padding: '0.4rem 1rem', width: 'auto', borderRadius: '8px' }}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline" style={{ display: 'inline-flex', padding: '0.4rem 1rem', width: 'auto', borderRadius: '8px' }}>Login</Link>
              <Link to="/register" className="btn btn-primary" style={{ display: 'inline-flex', padding: '0.4rem 1rem', width: 'auto', borderRadius: '8px' }}>Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="bg-gradient-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
        </div>
        <Navbar />
        <Routes>
          <Route path="/" element={<Store />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
