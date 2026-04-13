import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { UserPlus } from 'lucide-react';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post(`${GATEWAY_URL}/users/register`, { name, email, password });
      login({ id: res.data.id, name: res.data.name, email: res.data.email });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register. Please check details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container auth-wrapper">
      <div className="glass-panel">
        <h2>Create Account</h2>
        <p>Join the NextGen tech revolution</p>
        
        {error && <div className="message-bar msg-error">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input 
              type="text" 
              className="form-control" 
              required
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Email Address</label>
            <input 
              type="email" 
              className="form-control" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input 
              type="password" 
              className="form-control" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            <UserPlus size={18} /> {loading ? 'Creating...' : 'Register'}
          </button>
        </form>
        
        <p style={{ marginTop: '1.5rem', marginBottom: 0, fontSize: '0.875rem' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>Login here</Link>
        </p>
      </div>
    </div>
  );
}
