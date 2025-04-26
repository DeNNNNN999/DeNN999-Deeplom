'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { graphqlClient } from '@/lib/auth'
import { Icon } from '@iconify/react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { StatusBadge } from '@/components/ui/status-badge'

// Типизируем ответы от GraphQL запросов
type DashboardResponse = {
  contractExpirationSummary: ContractExpirationSummary
}

type SuppliersQueryResponse = {
  suppliers: SuppliersResponse
}

const GET_DASHBOARD_DATA = `
  query GetSpecialistDashboard {
    contractExpirationSummary {
      expiringSoon
      expiringLater
      expired
      highValueContract {
        id
        title
        value
        currency
        endDate
        supplier {
          name
        }
        daysRemaining
      }
    }
  }
`

const GET_SUPPLIERS = `
  query GetSuppliers($pagination: PaginationInput) {
    suppliers(pagination: $pagination) {
      items {
        id
        name
        country
        status
        createdAt
      }
      total
      page
      limit
    }
  }
`

type ContractExpirationSummary = {
  expiringSoon: number
  expiringLater: number
  expired: number
  highValueContract: {
    id: string
    title: string
    value: number
    currency: string
    endDate: string
    daysRemaining: number
    supplier: {
      name: string
    }
  } | null
}

type Supplier = {
  id: string
  name: string
  country: string
  status: string
  createdAt: string
}

type SuppliersResponse = {
  items: Supplier[]
  total: number
  page: number
  limit: number
}

export default function SpecialistDashboard() {
  const [contractSummary, setContractSummary] = useState<ContractExpirationSummary | null>(null)
  const [suppliers, setSuppliers] = useState<SuppliersResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Добавляем типизацию для ответов GraphQL запросов
        const [contractData, suppliersData] = await Promise.all([
          graphqlClient.request<DashboardResponse>(GET_DASHBOARD_DATA),
          graphqlClient.request<SuppliersQueryResponse>(GET_SUPPLIERS, { pagination: { page: 1, limit: 5 } }),
        ])

        setContractSummary(contractData.contractExpirationSummary)
        setSuppliers(suppliersData.suppliers)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
        toast.error('Failed to load dashboard data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  return (
    // Убираем проп role, который не ожидается компонентом DashboardLayout
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Procurement Specialist Dashboard</h1>
        <p className="text-gray-500">Manage suppliers and procurement activities</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Contracts Expiring Soon</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Icon icon="mdi:alert-circle-outline" className="w-8 h-8 text-yellow-500 mr-2" />
                  <div className="text-2xl font-bold">{contractSummary?.expiringSoon || 0}</div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Within the next 30 days</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Contracts Expiring Later</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Icon icon="mdi:calendar-clock" className="w-8 h-8 text-blue-600 mr-2" />
                  <div className="text-2xl font-bold">{contractSummary?.expiringLater || 0}</div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Within 30-90 days</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-500">Expired Contracts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center">
                  <Icon icon="mdi:alert" className="w-8 h-8 text-red-500 mr-2" />
                  <div className="text-2xl font-bold">{contractSummary?.expired || 0}</div>
                </div>
                <div className="text-xs text-gray-500 mt-2">Requires immediate attention</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 mt-6 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex justify-between">
                  <span className="text-sm font-medium">Recent Suppliers</span>
                  {/* Используем правильные props для Button */}
                  <Button
                    size="sm"
                    className="h-8 px-2 text-xs"
                    onClick={() => (window.location.href = '/specialist/suppliers')}>
                    View all
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suppliers?.items.map(supplier => (
                    <div key={supplier.id} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Icon icon="mdi:factory" className="w-5 h-5 text-gray-500 mr-2" />
                        <div>
                          <p className="text-sm font-medium">{supplier.name}</p>
                          <p className="text-xs text-gray-500">{supplier.country}</p>
                        </div>
                      </div>
                      <StatusBadge status={supplier.status} />
                    </div>
                  ))}

                  {suppliers?.items.length === 0 && (
                    <div className="text-center text-gray-500 my-6">No suppliers yet</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {contractSummary?.highValueContract ? (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">High Value Contract Expiring</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-lg">{contractSummary.highValueContract.title}</h3>
                      <p className="text-sm text-gray-500">{contractSummary.highValueContract.supplier.name}</p>
                    </div>

                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Value</p>
                        <p className="font-medium">
                          {contractSummary.highValueContract.currency}{' '}
                          {contractSummary.highValueContract.value.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Expires</p>
                        <p className="font-medium">
                          {format(new Date(contractSummary.highValueContract.endDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Days Left</p>
                        <p
                          className={`font-medium ${
                            contractSummary.highValueContract.daysRemaining < 7
                              ? 'text-red-500'
                              : contractSummary.highValueContract.daysRemaining < 30
                              ? 'text-yellow-500'
                              : 'text-gray-900'
                          }`}>
                          {contractSummary.highValueContract.daysRemaining}
                        </p>
                      </div>
                    </div>

                    <Button
                      className="w-full bg-blue-600 hover:bg-blue-700"
                      onClick={() =>
                        (window.location.href = `/specialist/contracts/${contractSummary.highValueContract?.id}`)
                      }>
                      View Contract
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2">
                    {/* Исправляем Button, используя className вместо variant для стилей */}
                    <Button
                      className="flex items-center justify-start h-12 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      onClick={() => (window.location.href = '/specialist/suppliers/create')}>
                      <Icon icon="mdi:factory-add" className="w-4 h-4 mr-2" />
                      <span>Add Supplier</span>
                    </Button>
                    <Button
                      className="flex items-center justify-start h-12 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      onClick={() => (window.location.href = '/specialist/contracts/create')}>
                      <Icon icon="mdi:file-document-plus" className="w-4 h-4 mr-2" />
                      <span>New Contract</span>
                    </Button>
                    <Button
                      className="flex items-center justify-start h-12 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      onClick={() => (window.location.href = '/specialist/payments/create')}>
                      <Icon icon="mdi:cash-plus" className="w-4 h-4 mr-2" />
                      <span>New Payment</span>
                    </Button>
                    <Button
                      className="flex items-center justify-start h-12 border border-input bg-background hover:bg-accent hover:text-accent-foreground"
                      onClick={() => (window.location.href = '/specialist/documents/upload')}>
                      <Icon icon="mdi:file-upload-outline" className="w-4 h-4 mr-2" />
                      <span>Upload Document</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </DashboardLayout>
  )
}
