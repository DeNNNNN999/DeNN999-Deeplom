'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label'; // Правильно импортируем Label
import { StatusBadge } from '@/components/ui/status-badge';
import { graphqlClient } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { gql } from 'graphql-request';
// Заменяем иконки из @iconify/react на lucide-react
import { Plus, Search } from 'lucide-react';

// GraphQL запрос
const GET_USERS = gql`
  query GetUsers($pagination: PaginationInput, $search: String) {
    users(pagination: $pagination, search: $search) {
      items {
        id
        email
        firstName
        lastName
        role
        department
        isActive
        lastLogin
        createdAt
      }
      total
      page
      limit
      hasMore
    }
  }
`;

// Тип для пользователя
type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
};

// Тип для ответа GraphQL запроса
type GetUsersResponse = {
  users: {
    items: User[];
    total: number;
    page: number;
    limit: number;
    hasMore: boolean;
  };
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  const fetchUsers = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const variables: { pagination: { page: number; limit: number }; search?: string } = {
        pagination: { page, limit: 10 }
      };
      
      if (search) variables.search = search;
      
      const response = await graphqlClient.request<GetUsersResponse>(GET_USERS, variables);
      
      if (response && response.users) {
        setUsers(response.users.items || []);
        setTotalPages(Math.ceil((response.users.total || 0) / (response.users.limit || 10)));
        setTotalItems(response.users.total || 0);
        setCurrentPage(response.users.page || 1);
      } else {
        setUsers([]);
        setTotalPages(1);
        setTotalItems(0);
        setCurrentPage(1);
        throw new Error('Invalid response structure');
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      const errorMessage = error.response?.errors?.[0]?.message || error.message || 'Failed to load users';
      toast.error(errorMessage);
      setUsers([]);
      setTotalPages(1);
      setTotalItems(0);
      setCurrentPage(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = () => {
    fetchUsers(1, searchTerm);
  };

  const handleKeyDownSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page, searchTerm);
  };

  // Получение строки с полным именем пользователя
  const getFullName = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    } else if (user.firstName) {
      return user.firstName;
    } else if (user.lastName) {
      return user.lastName;
    } else {
      return 'Unknown';
    }
  };

  // Перевод роли пользователя в читаемый формат
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'PROCUREMENT_MANAGER':
        return 'Procurement Manager';
      case 'PROCUREMENT_SPECIALIST':
        return 'Procurement Specialist';
      default:
        return role;
    }
  };

  // Определяем колонки для DataTable
  const columns = [
    {
      header: 'Name',
      accessorKey: 'id',
      cell: (user: User) => (
        <div>
          <div className="font-medium">{getFullName(user)}</div>
          <div className="text-sm text-muted-foreground">{user.email}</div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (user: User) => getRoleLabel(user.role),
    },
    {
      header: 'Department',
      accessorKey: 'department',
      cell: (user: User) => user.department || '-',
    },
    {
      header: 'Status',
      accessorKey: 'isActive',
      cell: (user: User) => (
        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
          user.isActive 
            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        }`}>
          {user.isActive ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      header: 'Last Login',
      accessorKey: 'lastLogin',
      cell: (user: User) => 
        user.lastLogin 
          ? format(new Date(user.lastLogin), 'MMM d, yyyy')
          : 'Never',
    },
    {
      header: 'Joined',
      accessorKey: 'createdAt',
      cell: (user: User) => format(new Date(user.createdAt), 'MMM d, yyyy'),
    },
    {
      header: 'Actions',
      accessorKey: 'id',
      cell: (user: User) => (
        <Button
          className="h-8 px-2"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/users/${user.id}`);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Users</h1>
          <p className="text-gray-500">Manage system users and permissions</p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700" 
          onClick={() => router.push('/admin/users/create')}
        >
          <Plus className="mr-2 h-5 w-5" />
          Add User
        </Button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1">
          <div className="relative">
            <Label htmlFor="search-users" className="sr-only">Search Users</Label>
            <Input
              id="search-users"
              placeholder="Search users by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              onKeyDown={handleKeyDownSearch}
            />
            <Search 
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 h-5 w-5" 
            />
          </div>
        </div>
        <Button onClick={handleSearch}>Search</Button>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: handlePageChange,
        }}
        onRowClick={(item) => router.push(`/admin/users/${item.id}`)}
      />

      {!loading && users.length > 0 && (
        <div className="mt-2 text-sm text-gray-500">
          Showing {users.length} of {totalItems} users
        </div>
      )}
    </DashboardLayout>
  );
}
