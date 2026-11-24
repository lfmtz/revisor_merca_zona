import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'leaflet/dist/leaflet.css';
import App from './App.tsx';
import { AccesoGate } from './components/AccesoGate';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AccesoGate>
      <App />
    </AccesoGate>
  </StrictMode>,
);
