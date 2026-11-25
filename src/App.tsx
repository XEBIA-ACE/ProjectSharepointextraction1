import { Link, Outlet, Route, Routes } from 'react-router-dom';
import { config } from './config';
import { Home } from './pages/Home';
import { Placeholder } from './pages/Placeholder';

function Layout() {
  return (
    <div data-testid="app-shell">
      <header>
        <h1>{config.appName}</h1>
        <nav>
          <Link to="/">Home</Link> | <Link to="/section">Section</Link>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="section" element={<Placeholder />} />
      </Route>
    </Routes>
  );
}
