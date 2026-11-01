import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/public-sans/latin-400.css';
import '@fontsource/public-sans/latin-500.css';
import '@fontsource/public-sans/latin-600.css';
import '@fontsource/public-sans/latin-700.css';
import '@fontsource/public-sans/latin-900.css';
import '@fontsource/gowun-batang/latin-400.css';
import '@fontsource/gowun-batang/latin-700.css';
import '@fontsource/gowun-batang/latin-ext-400.css';
import '@fontsource/gowun-batang/latin-ext-700.css';
import App from './App';
import { captureInvite } from './lib/invite';
import './styles/app.css';
import './styles/frames.css';
import './styles/followups.css';

captureInvite();

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
