import { useState } from 'react';
import './Login.css';

interface LoginProps {
  onLogin: (token: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!token.trim()) {
      setError('Please enter your Qase API token');
      setLoading(false);
      return;
    }

    // Test the token by making a simple API call
    try {
      const response = await fetch('https://api.qase.io/v1/project/PAS', {
        headers: {
          'Token': token.trim(),
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Invalid API token. Please check your token and try again.');
        }
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      // Token is valid, save it and proceed
      localStorage.setItem('qase_api_token', token.trim());
      onLogin(token.trim());
    } catch (err) {
      if (err instanceof Error && err.message.includes('CORS')) {
        setError('CORS error: The Qase API may not allow direct browser access. Please check your browser console for details.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to validate token');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>🔐 Qase Dashboard</h1>
        <p className="login-subtitle">Enter your Qase API token to get started</p>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-input-group">
            <label htmlFor="token">Qase API Token</label>
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter your Qase API token"
              disabled={loading}
              autoFocus
            />
            <small>
              Your token is stored locally in your browser and never sent to any server except Qase API.
            </small>
          </div>

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button 
            type="submit" 
            className="login-button"
            disabled={loading || !token.trim()}
          >
            {loading ? 'Validating...' : 'Login'}
          </button>
        </form>

        <div className="login-help">
          <p><strong>How to get your API token:</strong></p>
          <ol>
            <li>Go to <a href="https://app.qase.io/user/api/token" target="_blank" rel="noopener noreferrer">Qase API Settings</a></li>
            <li>Copy your API token</li>
            <li>Paste it above and click Login</li>
          </ol>
        </div>
      </div>
    </div>
  );
}










