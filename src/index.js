import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';

const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || '';

const Providers = ({ children }) => {
  if (!googleClientId) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('REACT_APP_GOOGLE_CLIENT_ID não definido. Login com Google ficará indisponível.');
    }
    return <AuthProvider>{children}</AuthProvider>;
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId} onScriptLoadError={(error) => console.error('Erro ao carregar SDK do Google:', error)}>
      <AuthProvider>{children}</AuthProvider>
    </GoogleOAuthProvider>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Providers>
        <App />
      </Providers>
    </BrowserRouter>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
