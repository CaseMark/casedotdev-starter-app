import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NewCaseForm } from '@/components/cases/new-case-form';

// Mock fetch
global.fetch = vi.fn();

describe('NewCaseForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the form with all required fields', () => {
    render(<NewCaseForm />);

    expect(screen.getByLabelText(/Full Name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Phone/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/SSN Last 4 Digits/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Household Size/i)).toBeInTheDocument();
  });

  it('displays Chapter 7 as default selection', () => {
    render(<NewCaseForm />);

    const chapter7Radio = screen.getByLabelText(/Chapter 7/i);
    expect(chapter7Radio).toBeChecked();
  });

  it('shows Chapter 13 as coming soon (disabled)', () => {
    render(<NewCaseForm />);

    const chapter13Radio = screen.getByLabelText(/Chapter 13/i);
    expect(chapter13Radio).toBeDisabled();
    expect(screen.getByText(/Coming Soon/i)).toBeInTheDocument();
  });

  it('validates required fields on submit', async () => {
    render(<NewCaseForm />);

    const submitButton = screen.getByRole('button', { name: /Create Case/i });
    fireEvent.click(submitButton);

    // Form should not submit without required fields
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  it('submits form with valid data', async () => {
    const mockResponse = {
      success: true,
      caseId: 'test-case-id',
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const user = userEvent.setup();
    render(<NewCaseForm />);

    // Fill in required fields
    await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');
    await user.type(screen.getByLabelText(/Email/i), 'john@example.com');
    await user.type(screen.getByLabelText(/Phone/i), '5551234567');
    await user.type(screen.getByLabelText(/SSN Last 4 Digits/i), '1234');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create Case/i });
    await user.click(submitButton);

    // Wait for API call
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/cases',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('John Doe'),
        })
      );
    });
  });

  it('displays error message on failed submission', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Failed to create case' }),
    });

    const user = userEvent.setup();
    render(<NewCaseForm />);

    // Fill in required field
    await user.type(screen.getByLabelText(/Full Name/i), 'John Doe');

    // Submit form
    const submitButton = screen.getByRole('button', { name: /Create Case/i });
    await user.click(submitButton);

    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Failed to create case/i)).toBeInTheDocument();
    });
  });

  it('limits SSN input to 4 digits', async () => {
    const user = userEvent.setup();
    render(<NewCaseForm />);

    const ssnInput = screen.getByLabelText(/SSN Last 4 Digits/i) as HTMLInputElement;
    await user.type(ssnInput, '123456789');

    // Should only keep first 4 digits
    expect(ssnInput.value).toBe('1234');
  });

  it('allows toggling between individual and joint filing', async () => {
    const user = userEvent.setup();
    render(<NewCaseForm />);

    const individualRadio = screen.getByLabelText(/Individual/i);
    const jointRadio = screen.getByLabelText(/Joint/i);

    expect(individualRadio).toBeChecked();
    expect(jointRadio).not.toBeChecked();

    await user.click(jointRadio);

    expect(jointRadio).toBeChecked();
    expect(individualRadio).not.toBeChecked();
  });

  it('includes all US states in state dropdown', () => {
    render(<NewCaseForm />);

    const stateSelect = screen.getByLabelText(/State/i) as HTMLSelectElement;
    const options = Array.from(stateSelect.options).map(opt => opt.value);

    // Should have empty option plus all 50 states
    expect(options.length).toBe(51);
    expect(options).toContain('CA');
    expect(options).toContain('NY');
    expect(options).toContain('TX');
  });
});
