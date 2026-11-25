// Evidence for AC-1 (story SCAFFOLD-frontend-app): the app renders its initial
// shell and routes using only environment-based configuration.
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { App } from './App';
import { loadConfig } from './config';

describe('SCAFFOLD-frontend-app AC-1', () => {
  it('renders the home shell', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('app-shell')).toBeTruthy();
    expect(screen.getByText('The application is running.')).toBeTruthy();
  });

  it('renders the nested placeholder route', () => {
    render(
      <MemoryRouter initialEntries={['/section']}>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Placeholder view/)).toBeTruthy();
  });

  it('loads config from env only, with no hardcoded endpoint', () => {
    expect(loadConfig({}).apiBaseUrl).toBe('');
    expect(loadConfig({ VITE_API_BASE_URL: 'http://x.test' }).apiBaseUrl).toBe(
      'http://x.test',
    );
    expect(loadConfig({ VITE_APP_NAME: 'Foo' }).appName).toBe('Foo');
  });
});
