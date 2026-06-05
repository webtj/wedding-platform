export interface OverviewTrends {
  currentMonthLeads: number
  prevMonthLeads: number
  leadsChangePct: number
  currentMonthContracts: number
  prevMonthContracts: number
  contractsChangePct: number
}

export interface RecentContract {
  id: string
  contractNo: string
  title: string
  amountCents: number
  status: string
  brideName?: string | null
  groomName?: string | null
  createdAt: string
  project?: {
    id: string
    projectNo: string
    brideName?: string | null
    groomName?: string | null
  } | null
  lead?: { id: string; leadNo: string; name: string } | null
}
