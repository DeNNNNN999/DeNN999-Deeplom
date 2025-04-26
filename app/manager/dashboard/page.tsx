'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { graphqlClient } from '@/lib/auth'
import { Icon } from '@iconify/react' 
import { toast } from 'sonner'

// Определяем типы для GraphQL запроса
type AnalyticsResponse = {
  analyticsSummary: AnalyticsSummary
  suppliersByCountry: SupplierCountry[]
}

const GET_ANALYTICS = `
  query GetAnalytics {
    analyticsSummary {
      totalSuppliers
      pendingSuppliers
      approvedSuppliers
      totalContracts
      activeContracts
      expiringContracts
      totalPaymentsAmount
      pendingPaymentsAmount
    }
    suppliersByCountry {
      country
      count
    }
  }
`

type AnalyticsSummary = {
  totalSuppliers: number
  pendingSuppliers: number
  approvedSuppliers: number
  totalContracts: number
  activeContracts: number
  expiringContracts: number
  totalPaymentsAmount: number
  pendingPaymentsAmount: number
}

type SupplierCountry = {
  country: string
  count: number
}

export default function ManagerDashboard() {
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)
  const [suppliersByCountry, setSuppliersByCountry] = useState<SupplierCountry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Добавляем типизацию для ответа GraphQL запроса
        const data = await graphqlClient.request<AnalyticsResponse>(GET_ANALYTICS)
        setAnalytics(data.analyticsSummary)
        setSuppliersByCountry(data.suppliersByCountry)
      } catch (error) {
        console.error('Error fetching analytics:', error)
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
        <h1 className="text-2xl font-bold text-gray-800">Procurement Manager Dashboard</h1>
        <p className="text-gray-500">Manage suppliers, contracts, and procurement processes</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Icon icon="mdi:loading" className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Icon icon="mdi:clock-outline" className="w-8 h-8 text-yellow-500 mr-2" />
                <div className="text-2xl font-bold">{analytics?.pendingSuppliers || 0}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">Suppliers waiting for review</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Active Contracts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Icon icon="mdi:file-document-outline" className="w-8 h-8 text-blue-600 mr-2" />
                <div className="text-2xl font-bold">{analytics?.activeContracts || 0}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                <span className="text-yellow-500 font-medium">{analytics?.expiringContracts || 0}</span> expiring soon
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">Pending Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Icon icon="mdi:cash-clock" className="w-8 h-8 text-yellow-500 mr-2" />
                <div className="text-2xl font-bold">${analytics?.pendingPaymentsAmount?.toLocaleString() || 0}</div>
              </div>
              <div className="text-xs text-gray-500 mt-2">Waiting for approval</div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && (
        <div className="grid gap-4 mt-6 md:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Suppliers by Country</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {suppliersByCountry.slice(0, 5).map(item => (
                  <div key={item.country} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Icon icon="mdi:earth" className="w-4 h-4 text-gray-500 mr-2" />
                      <span className="text-sm">{item.country}</span>
                    </div>
                    <span className="text-sm font-medium">{item.count}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-2 rounded-full bg-yellow-100 p-1">
                    <Icon icon="mdi:clipboard-check-outline" className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm">Review supplier applications ({analytics?.pendingSuppliers})</p>
                    <p className="text-xs text-gray-500">High priority</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-2 rounded-full bg-yellow-100 p-1">
                    <Icon icon="mdi:file-check-outline" className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm">Review contracts ({3})</p>
                    <p className="text-xs text-gray-500">Medium priority</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="mr-2 rounded-full bg-yellow-100 p-1">
                    <Icon icon="mdi:cash-check" className="w-4 h-4 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-sm">Approve payments ({5})</p>
                    <p className="text-xs text-gray-500">Medium priority</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  )
}
