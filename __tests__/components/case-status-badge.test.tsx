import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CaseStatusBadge } from '@/components/cases/case-status-badge';

describe('CaseStatusBadge', () => {
  it('renders intake status correctly', () => {
    render(<CaseStatusBadge status="intake" />);
    expect(screen.getByText('Intake')).toBeInTheDocument();
  });

  it('renders documents_pending status correctly', () => {
    render(<CaseStatusBadge status="documents_pending" />);
    expect(screen.getByText('Documents Pending')).toBeInTheDocument();
  });

  it('renders review status correctly', () => {
    render(<CaseStatusBadge status="review" />);
    expect(screen.getByText('Review')).toBeInTheDocument();
  });

  it('renders ready_to_file status correctly', () => {
    render(<CaseStatusBadge status="ready_to_file" />);
    expect(screen.getByText('Ready to File')).toBeInTheDocument();
  });

  it('renders filed status correctly', () => {
    render(<CaseStatusBadge status="filed" />);
    expect(screen.getByText('Filed')).toBeInTheDocument();
  });

  it('renders discharged status correctly', () => {
    render(<CaseStatusBadge status="discharged" />);
    expect(screen.getByText('Discharged')).toBeInTheDocument();
  });

  it('renders dismissed status correctly', () => {
    render(<CaseStatusBadge status="dismissed" />);
    expect(screen.getByText('Dismissed')).toBeInTheDocument();
  });

  it('applies correct color classes for different statuses', () => {
    const { rerender } = render(<CaseStatusBadge status="intake" />);
    expect(screen.getByText('Intake').className).toContain('bg-blue-100');

    rerender(<CaseStatusBadge status="discharged" />);
    expect(screen.getByText('Discharged').className).toContain('bg-emerald-100');

    rerender(<CaseStatusBadge status="dismissed" />);
    expect(screen.getByText('Dismissed').className).toContain('bg-red-100');
  });
});
