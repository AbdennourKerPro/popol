import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource/public-sans/latin-400.css';
import '@fontsource/public-sans/latin-600.css';
import '@fontsource/public-sans/latin-700.css';
import '@fontsource/public-sans/latin-800.css';
import '@fontsource/public-sans/latin-900.css';
import '@fontsource/gowun-batang/latin-400.css';
import '@fontsource/gowun-batang/latin-ext-400.css';
import App from './App';
import './styles/base.css';
import './styles/game.css';
import './styles/militant.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
