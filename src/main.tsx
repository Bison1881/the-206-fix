import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';
import './styles/tokens.css';
import './styles/global.css';

// vite-react-ssg drives the router in dev and prerenders every static route
// to HTML at build time.
export const createRoot = ViteReactSSG({ routes });
