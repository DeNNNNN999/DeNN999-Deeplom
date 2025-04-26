import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { DataTable } from '@/components/ui/data-table';

describe('DataTable Component', () => {
  const mockColumns = [
    { header: 'Name', accessorKey: 'name' },
    { header: 'Email', accessorKey: 'email' },
    { 
      header: 'Status', 
      accessorKey: 'status',
      cell: (item: any) => item.status.toUpperCase()
    }
  ];
  
  const mockData = [
    { id: '1', name: 'John Doe', email: 'john@example.com', status: 'active' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com', status: 'inactive' }
  ];

  it('should render the table with headers and data', () => {
    render(<DataTable columns={mockColumns} data={mockData} />);
    
    // Check headers
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    
    // Check data
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('INACTIVE')).toBeInTheDocument();
  });
  
  it('should show loading indicator when loading is true', () => {
    render(<DataTable columns={mockColumns} data={[]} loading={true} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should show "No data available" message when data is empty', () => {
    render(<DataTable columns={mockColumns} data={[]} />);
    
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('should call onRowClick when a row is clicked', () => {
    const handleRowClick = vi.fn();
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData} 
        onRowClick={handleRowClick} 
      />
    );
    
    fireEvent.click(screen.getByText('John Doe'));
    expect(handleRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should render pagination controls when pagination is provided', () => {
    const handlePageChange = vi.fn();
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData}
        pagination={{
          currentPage: 1,
          totalPages: 3,
          onPageChange: handlePageChange
        }}
      />
    );
    
    expect(screen.getByText('Page 1 of 3')).toBeInTheDocument();
    
    // Click next page button
    const nextButton = screen.getByRole('button', { name: /chevron-right/i });
    fireEvent.click(nextButton);
    expect(handlePageChange).toHaveBeenCalledWith(2);
    
    // Previous button should be disabled on first page
    const prevButton = screen.getByRole('button', { name: /chevron-left/i });
    expect(prevButton).toBeDisabled();
  });

  it('should disable pagination buttons appropriately', () => {
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData}
        pagination={{
          currentPage: 3,
          totalPages: 3,
          onPageChange: vi.fn()
        }}
      />
    );
    
    // Next button should be disabled on last page
    const nextButton = screen.getByRole('button', { name: /chevron-right/i });
    expect(nextButton).toBeDisabled();
    
    // Previous button should be enabled
    const prevButton = screen.getByRole('button', { name: /chevron-left/i });
    expect(prevButton).not.toBeDisabled();
  });

  it('should not render pagination controls when totalPages is 1', () => {
    render(
      <DataTable 
        columns={mockColumns} 
        data={mockData}
        pagination={{
          currentPage: 1,
          totalPages: 1,
          onPageChange: vi.fn()
        }}
      />
    );
    
    // Pagination controls should not be rendered
    expect(screen.queryByText('Page 1 of 1')).not.toBeInTheDocument();
  });
});