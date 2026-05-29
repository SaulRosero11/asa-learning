/**
 * LoginPage tests — verifies form validation and submit behaviour.
 * Uses mocked apiClient so no real HTTP requests are made.
 */
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Mock axios instance
jest.mock("@/lib/axios", () => ({
  apiClient: {
    post: jest.fn(),
    get: jest.fn(),
    interceptors: { response: { use: jest.fn() } },
  },
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Lazy import so mocks are set up first
const LoginPage = require("../page").default;

describe("LoginPage", () => {
  it("renders email and password fields", () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText(/correo/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/contraseña/i)).toBeInTheDocument();
  });

  it("shows validation error when submitting empty form", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    // Find submit button (type=submit) and click
    const submitBtn = screen.getByRole("button", { name: /iniciar sesión/i });
    await user.click(submitBtn);

    // RHF shows validation errors
    await waitFor(() => {
      expect(screen.queryByText(/requerido|required/i)).toBeTruthy();
    });
  });
});
