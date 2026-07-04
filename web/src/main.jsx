import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: 'Inter, sans-serif', fontSize: '14px', borderRadius: '12px', fontWeight: 500 },
        success: { iconTheme: { primary: '#06B96F', secondary: '#fff' } },
        error:   { iconTheme: { primary: '#E53E3E', secondary: '#fff' } },
      }} />
    </BrowserRouter>
  </React.StrictMode>
);
