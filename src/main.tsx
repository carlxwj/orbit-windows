import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { initialize } from './services/store.ts';
import './styles/app.css';
const root=createRoot(document.getElementById('root')!);
root.render(<App/>);
void initialize();
