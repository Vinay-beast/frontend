import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <HashRouter>
            <App />
            <Toaster
                position="bottom-right"
                toastOptions={{
                    duration: 3000,
                    style: {
                        background: '#1a1a2e',
                        color: '#e2d9c5',
                        border: '1px solid rgba(212,175,55,0.25)',
                        borderRadius: '8px',
                        fontSize: '14px',
                    },
                    success: { iconTheme: { primary: '#d4af37', secondary: '#1a1a2e' } },
                    error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
                }}
            />
        </HashRouter>
    </React.StrictMode>
);
