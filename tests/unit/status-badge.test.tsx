import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { StatusBadge } from '@/components/ui/status-badge';

describe('StatusBadge Component', () => {
  it('should render with PENDING status correctly', () => {
    const { getByText } = render(<StatusBadge status="PENDING" />);
    const badge = getByText('Pending');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-yellow-100')).toBe(true);
    expect(badge.classList.contains('text-yellow-800')).toBe(true);
  });

  it('should render with APPROVED status correctly', () => {
    const { getByText } = render(<StatusBadge status="APPROVED" />);
    const badge = getByText('Approved');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-green-100')).toBe(true);
    expect(badge.classList.contains('text-green-800')).toBe(true);
  });

  it('should render with REJECTED status correctly', () => {
    const { getByText } = render(<StatusBadge status="REJECTED" />);
    const badge = getByText('Rejected');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-red-100')).toBe(true);
    expect(badge.classList.contains('text-red-800')).toBe(true);
  });

  it('should render with ACTIVE status correctly', () => {
    const { getByText } = render(<StatusBadge status="ACTIVE" />);
    const badge = getByText('Active');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-green-100')).toBe(true);
    expect(badge.classList.contains('text-green-800')).toBe(true);
  });

  it('should render with EXPIRED status correctly', () => {
    const { getByText } = render(<StatusBadge status="EXPIRED" />);
    const badge = getByText('Expired');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-red-100')).toBe(true);
    expect(badge.classList.contains('text-red-800')).toBe(true);
  });

  it('should render with unknown status using default styling', () => {
    const { getByText } = render(<StatusBadge status="UNKNOWN_STATUS" />);
    const badge = getByText('Unknown Status');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-gray-100')).toBe(true);
    expect(badge.classList.contains('text-gray-800')).toBe(true);
  });

  it('should format status with underscores correctly', () => {
    const { getByText } = render(<StatusBadge status="PENDING_APPROVAL" />);
    const badge = getByText('Pending Approval');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('bg-yellow-100')).toBe(true);
    expect(badge.classList.contains('text-yellow-800')).toBe(true);
  });

  it('should apply additional className if provided', () => {
    const { getByText } = render(<StatusBadge status="APPROVED" className="custom-class" />);
    const badge = getByText('Approved');
    
    expect(badge).toBeInTheDocument();
    expect(badge.classList.contains('custom-class')).toBe(true);
  });
});