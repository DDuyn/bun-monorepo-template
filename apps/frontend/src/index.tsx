/* @refresh reload */
import { render } from 'solid-js/web';
import { Route, Router } from '@solidjs/router';
import './index.css';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

render(
  () => (
    <Router root={Layout}>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
    </Router>
  ),
  root,
);
