import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-700.css';
import '@fontsource/ibm-plex-mono/latin-400.css';
import { App } from './App';
import './styles.css';

registerSW();
createRoot(document.getElementById('root')!).render(<App />);
