import { NextRequest, NextResponse } from 'next/server';
import { generateMockContracts, getMockContracts } from '@/lib/mock-data';

export async function GET(request: NextRequest) {
  // Get query parameters
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');
  const search = url.searchParams.get('search') || '';
  const status = url.searchParams.get('status') || undefined;
  
  // Get mock data
  const mockData = getMockContracts(page, limit);
  
  // If search parameter is provided, filter the results
  if (search) {
    mockData.items = mockData.items.filter(contract => 
      contract.title.toLowerCase().includes(search.toLowerCase()) ||
      contract.contractNumber.toLowerCase().includes(search.toLowerCase())
    );
    mockData.total = mockData.items.length;
  }
  
  // If status parameter is provided, filter the results
  if (status && status !== 'all') {
    mockData.items = mockData.items.filter(contract => 
      contract.status === status
    );
    mockData.total = mockData.items.length;
  }
  
  // Add a small delay to simulate network latency
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return NextResponse.json({
    data: {
      contracts: mockData
    }
  });
}
