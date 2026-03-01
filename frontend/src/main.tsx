import { render } from 'solid-js/web';
import App from './App';
import './styles/index.css';
import './i18n';

const root = document.getElementById('root');

if (root) {
  render(() => <App />, root);
}
