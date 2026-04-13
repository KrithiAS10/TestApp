import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { ShoppingCart, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GATEWAY_URL = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

export default function Store() {
  const [products, setProducts] = useState([]);
  const [loadingObj, setLoadingObj] = useState({});
  const [toasts, setToasts] = useState([]);
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${GATEWAY_URL}/products`);
      if (res.data && res.data.length > 0) {
        setProducts(res.data);
      } else {
        setProducts([
          { id: '1', name: 'Please Run Seed Script', description: 'Run `node seed.js` in your root folder to populate products and inventory for testing!', price: 0 }
        ]);
      }
    } catch (err) {
      console.warn("Could not fetch products from Gateway.");
    }
  };

  const addToast = (msg, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const handlePlaceOrder = async (product) => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    setLoadingObj(prev => ({ ...prev, [product.id]: true }));
    try {
      const orderPayload = {
        userId: user.id,
        productId: product.id,
        quantity: 1,
        totalAmount: product.price
      };

      const res = await axios.post(`${GATEWAY_URL}/orders/create`, orderPayload);
      addToast(`Order workflow completed successfully! Order ID: ${res.data.id}`, 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to place order. ' + (err.response?.data?.error || err.message), 'error');
    } finally {
      setLoadingObj(prev => ({ ...prev, [product.id]: false }));
    }
  };

  return (
    <div className="container">
      <h1 className="page-title">NextGen Offerings</h1>
      
      <main className="products-grid">
        {products.map(product => (
          <div key={product.id} className="product-card">
            <div className="product-image">
              <Package size={48} opacity={0.5} />
            </div>
            <div className="product-header">
              <div className="product-title">{product.name}</div>
              <div className="product-price">${product.price}</div>
            </div>
            <div className="product-desc">{product.description}</div>
            <button 
              className="btn btn-primary"
              onClick={() => handlePlaceOrder(product)}
              disabled={loadingObj[product.id] || product.price === 0}
            >
              <ShoppingCart size={18} />
              {loadingObj[product.id] ? 'Processing...' : 'Buy Now'}
            </button>
          </div>
        ))}
      </main>

      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast ${toast.type === 'error' ? 'msg-error' : 'msg-success'}`}>
            {toast.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
