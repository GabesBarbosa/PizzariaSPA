export interface DashboardStats {
  totalOrders: number;
  pendingOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalRevenue: number;
  recentOrders: RecentOrder[];
  topProducts: TopProduct[];
}

export interface RecentOrder {
  id: number;
  customerName: string;
  total: number;
  status: string;
  createdAt: string;
}

export interface TopProduct {
  name: string;
  totalSold: number;
  totalRevenue: number;
}
