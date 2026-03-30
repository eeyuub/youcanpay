import { useState, useEffect } from 'react';
import { PaymentForm } from './components/PaymentForm';
import { AuthForm } from './components/AuthForm';
import { PaymentCallback } from './components/PaymentCallback';
import { setAuthToken } from './api/payments';

function App() {
  const [user, setUser] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<'home' | 'callback'>('home');

  useEffect(() => {
    // Check if this is a payment callback
    const path = window.location.pathname;
    if (path.includes('/payments/success') || path.includes('/payments/error')) {
      setCurrentPage('callback');
    }
  }, []);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
  };

  if (currentPage === 'callback') {
    return (
      <div className="app">
        <header>
          <h1>YouCanPay SDK Demo</h1>
        </header>
        <main>
          <PaymentCallback />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header>
        <h1>YouCanPay SDK Demo</h1>
        {user && (
          <div className="user-info">
            <span>{user}</span>
            <button onClick={handleLogout} className="logout-btn">Logout</button>
          </div>
        )}
      </header>
      <main>
        {user ? <PaymentForm /> : <AuthForm onAuth={setUser} />}
      </main>
    </div>
  );
}

export default App;
