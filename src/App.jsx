import React, { useState, useEffect } from 'react';
import { database } from './firebaseConfig';
import { ref, onValue, set } from 'firebase/database';
import { Lock, User, Square, Copy } from 'lucide-react';
import './index.css';

function App() {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [role, setRole] = useState(null); // 'helper' | 'naeem'
  const [syncData, setSyncData] = useState({ option: null, text: '', color: 'black' });
  const [helperTextInput, setHelperTextInput] = useState('');

  useEffect(() => {
    // Listen to firebase sync data changes
    const syncRef = ref(database, 'sync');
    const unsubscribe = onValue(syncRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSyncData({
           option: data.option || null,
           text: data.text || '',
           color: data.color || 'black'
        });
        if (data.text) {
          setHelperTextInput(data.text);
        }
      }
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === '1234') { // hardcoded
      setIsAuthenticated(true);
    } else {
      alert('Incorrect password. Try: 1234');
    }
  };

  const handleOptionSelect = (opt) => {
    // Write selected option to Firebase RT Database
    set(ref(database, 'sync/option'), opt).catch((error) => {
      console.error("Firebase update failed. Did you configure firebaseConfig.js?", error);
      alert("Failed to sync option.");
    });
  };

  const handleColorChange = (color) => {
    // Write standard to Firebase RT Database
    set(ref(database, 'sync/color'), color).catch((error) => {
      console.error("Firebase update failed. Did you configure firebaseConfig.js?", error);
      alert("Failed to sync color.");
    });
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    // Write text to Firebase RT Database
    set(ref(database, 'sync/text'), helperTextInput).catch((error) => {
      console.error("Firebase update failed. Did you configure firebaseConfig.js?", error);
      alert("Failed to sync text.");
    });
  };

  const handleCopy = () => {
    if (syncData.text) {
      navigator.clipboard.writeText(syncData.text).then(() => {
        alert("Copied to clipboard!");
      });
    }
  };

  // 1. Password Screen
  if (!isAuthenticated) {
    return (
      <div className="container password-screen glass-panel">
        <div className="card">
          <div className="icon-wrapper">
             <Lock size={48} />
          </div>
          <h1>Access App</h1>
          <p>Please enter the secret password to continue.</p>
          <form onSubmit={handleLogin}>
            <input 
              type="password" 
              placeholder="Enter password..." 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              autoFocus
            />
            <button type="submit" className="btn btn-primary">Login</button>
          </form>
        </div>
      </div>
    );
  }

  // 2. Role Selection Screen
  if (!role) {
    return (
      <div className="container role-screen glass-panel">
        <div className="card role-card">
          <div className="icon-wrapper">
             <User size={48} />
          </div>
          <h1>Select Your Role</h1>
          <p>Who is using this screen?</p>
          <div className="role-buttons">
            <button onClick={() => setRole('helper')} className="btn btn-helper">
               <User size={32} className="btn-icon"/> 
               <span>Helper</span>
            </button>
            <button onClick={() => setRole('naeem')} className="btn btn-naeem">
               <Square size={32} className="btn-icon"/> 
               <span>Naeem</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Helper Screen
  if (role === 'helper') {
    return (
      <div className="container helper-screen glass-panel helper-scrollable">
        <div className="card helper-card">
          <h1>Helper Control</h1>
          <p>Select options to sync to Naeem's screen.</p>
          
          <div className="color-buttons">
            <button 
                onClick={() => handleColorChange('red')} 
                className="btn btn-color red">
              Red
            </button>
            <button 
                onClick={() => handleColorChange('green')} 
                className="btn btn-color green">
              Green
            </button>
          </div>

          <div className="options-grid">
            {['A', 'B', 'C', 'D', 'E', 'F'].map(opt => (
              <button 
                key={opt}
                onClick={() => handleOptionSelect(opt)} 
                className={`btn btn-option ${syncData.option === opt ? 'active' : ''}`}>
                {opt}
              </button>
            ))}
          </div>

          <form onSubmit={handleTextSubmit} className="text-submit-form">
            <textarea
              className="input-field textarea-field"
              placeholder="Enter text to sync..."
              value={helperTextInput}
              onChange={(e) => setHelperTextInput(e.target.value)}
              rows={4}
            />
            <button type="submit" className="btn btn-primary submit-text-btn">Send Text</button>
          </form>

          <button onClick={() => setRole(null)} className="btn btn-secondary back-btn">
             Change Role
          </button>
        </div>
      </div>
    );
  }

  // 4. Naeem Screen
  if (role === 'naeem') {
    return (
      <div className={`naeem-screen-container ${syncData.color}`}>
         <div className="naeem-top-half">
            {syncData.option ? (
               <div className="huge-option-text">{syncData.option}</div>
            ) : (
               <div className="waiting-text">Waiting for Option...</div>
            )}
         </div>
         <div className="naeem-bottom-half">
            {syncData.text ? (
               <div className="synced-text-container">
                 <p className="synced-text">{syncData.text}</p>
                 <button onClick={handleCopy} className="btn btn-primary copy-btn">
                   <Copy size={20} className="mr-2" /> Copy Text
                 </button>
               </div>
            ) : (
               <div className="waiting-text-small">Waiting for Text...</div>
            )}
         </div>
         <button onClick={() => setRole(null)} className="floating-back-btn glass-btn">
            &larr; Change Role
         </button>
      </div>
    );
  }

  return null;
}

export default App;
