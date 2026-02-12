import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "../i18n";

const DebugSignup = ({ setIsAuthenticated }) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [apiStatus, setApiStatus] = useState("Not tested");

  const testAPIConnection = async () => {
    setApiStatus("Testing...");
    try {
      const response = await fetch('http://127.0.0.1:8000/api/pharmacy-admin/test/');
      const data = await response.json();
      setApiStatus(`✅ Connected: ${data.test_id}`);
      setMessage("API connection successful!");
    } catch (error) {
      setApiStatus(`❌ Failed: ${error.message}`);
      setMessage(`API connection failed: ${error.message}`);
    }
  };

  const testPharmacySignup = async () => {
    setLoading(true);
    setMessage("Testing pharmacy signup...");
    
    try {
      const testData = {
        username: 'testpharmacy' + Date.now(),
        email: 'test' + Date.now() + '@example.com',
        password: 'TestPass123!',
        confirm_password: 'TestPass123!',
        country: 'RW',
        province: 'Kigali',
        district: 'Nyarugenge',
        facility_name: 'Test Pharmacy',
        facility_type: 'pharmacy',
        phone_number: '+250788123456',
        address: 'Test Address'
      };
      
      console.log('Sending data:', testData);
      
      const response = await fetch('http://127.0.0.1:8000/api/pharmacy-admin/signup/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData)
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (response.ok) {
        setMessage(`✅ Success! Pharmacy ID: ${data.pharmacy_id}`);
      } else {
        setMessage(`❌ Failed: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error('Signup error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Debug Pharmacy Admin Signup</h2>
      
      <div style={{ marginBottom: '20px', padding: '10px', background: '#f0f0f0' }}>
        <h3>API Status: {apiStatus}</h3>
        <button 
          onClick={testAPIConnection}
          style={{ padding: '10px 20px', marginRight: '10px' }}
        >
          Test API Connection
        </button>
        
        <button 
          onClick={testPharmacySignup}
          disabled={loading}
          style={{ padding: '10px 20px' }}
        >
          {loading ? 'Testing...' : 'Test Pharmacy Signup'}
        </button>
      </div>
      
      {message && (
        <div style={{ 
          padding: '10px', 
          background: message.includes('✅') ? '#d4edda' : '#f8d7da',
          marginBottom: '20px',
          borderRadius: '4px'
        }}>
          <pre>{message}</pre>
        </div>
      )}
      
      <div style={{ fontSize: '12px', color: '#666' }}>
        <h3>Debugging Steps:</h3>
        <ol>
          <li>Make sure Django server is running: <code>python manage.py runserver</code></li>
          <li>Click "Test API Connection" first</li>
          <li>If API connection works, try "Test Pharmacy Signup"</li>
          <li>Check browser console (F12) for detailed error messages</li>
          <li>Make sure CORS is properly configured in Django settings</li>
        </ol>
        
        <h3>Common Issues:</h3>
        <ul>
          <li><strong>Failed to fetch:</strong> Backend not running or wrong URL</li>
          <li><strong>CORS error:</strong> Backend not allowing requests from frontend</li>
          <li><strong>404 error:</strong> API endpoint doesn't exist</li>
          <li><strong>500 error:</strong> Backend code error</li>
        </ul>
      </div>
      
      <button onClick={() => navigate('/signup')} style={{ marginTop: '20px' }}>
        Back to Regular Signup
      </button>
    </div>
  );
};

export default DebugSignup;
