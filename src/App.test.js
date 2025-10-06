import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    beginPath: jest.fn(),
    arc: jest.fn(),
    fill: jest.fn(),
    set fillStyle(value) {},
    set globalAlpha(value) {}
  }));

  global.requestAnimationFrame = (callback) => setTimeout(callback, 0);
  global.cancelAnimationFrame = (id) => clearTimeout(id);

  class IntersectionObserverMock {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  }

  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    configurable: true,
    value: IntersectionObserverMock
  });
});

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      json: () => Promise.resolve({ orders: [] })
    })
  );
});

afterEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  delete HTMLCanvasElement.prototype.getContext;
});

test('renderiza a página inicial com sessão de produtos', async () => {
  render(
    <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByRole('heading', { level: 2, name: /flores do jardim noturno/i })).toBeInTheDocument();
  expect(screen.getByText(/moda que floresce de novo/i)).toBeInTheDocument();
});

test('renderiza a página de checkout com formulário completo', async () => {
  render(
    <MemoryRouter
      initialEntries={["/checkout"]}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <App />
    </MemoryRouter>
  );

  expect(
    await screen.findByRole('heading', { level: 2, name: /dados para entrega e pagamento/i })
  ).toBeInTheDocument();
  expect(screen.getByText(/Finalize sua compra/i)).toBeInTheDocument();
});
