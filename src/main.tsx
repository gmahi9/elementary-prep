import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@fontsource/syne/latin-600.css';
import '@fontsource/syne/latin-700.css';
import '@fontsource/syne/latin-800.css';
import '@fontsource-variable/outfit/wght.css';
import './styles.css';

const root = document.getElementById('root');
if (root) createRoot(root).render(<StrictMode><App /></StrictMode>);
