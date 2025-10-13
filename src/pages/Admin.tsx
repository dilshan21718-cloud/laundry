import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart3, 
  Package, 
  Users, 
  Truck, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  UserCheck,
  Calendar
} from "lucide-react";
import { BarChart as RBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { api } from "@/lib/api";

const recentOrders = [
  {
    id: "LND001234",
    customer: "John Doe",
    service: "Wash & Iron",
    status: "in-progress",
    amount: 240,
    time: "2 hours ago"
  },
  {
    id: "LND001235",
    customer: "Jane Smith", 
    service: "Dry Clean",
    status: "ready",
    amount: 450,
    time: "3 hours ago"
  },
  {
    id: "LND001236",
    customer: "Mike Johnson",
    service: "Wash & Fold",
    status: "delivered",
    amount: 180,
    time: "4 hours ago"
  }
];

const staffMembers = [
  {
    name: "Rajesh Kumar",
    role: "Delivery Executive",
    ordersToday: 8,
    status: "active",
    phone: "+91 98765 43210",
    email: "rajesh@example.com"
  },
  {
    name: "Priya Sharma",
    role: "Wash Supervisor",
    ordersToday: 15,
    status: "active",
    phone: "+91 98765 43211",
    email: "priya@example.com"
  },
  {
    name: "Amit Patel",
    role: "Quality Controller",
    ordersToday: 12,
    status: "break",
    phone: "+91 98765 43212",
    email: "amit@example.com"
  }
];

const Admin = () => {
  const [selectedTab, setSelectedTab] = useState("dashboard");
  const navigate = useNavigate();
  const loggedType = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_loggedin_type') : null;
  const meName = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('laundrybuddy_users') || '[]').find((u: any) => u.userType === 'staff')?.username || '') : '';
  const mePhone = typeof window !== 'undefined' ? (JSON.parse(localStorage.getItem('laundrybuddy_users') || '[]').find((u: any) => u.userType === 'staff')?.phone || '') : '';
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subs, setSubs] = useState<any[]>([]);
  const isBookingUnassigned = (bookingId: string) => {
    try {
      const o = (orders || []).find((x: any) => x.id === bookingId);
      if (!o) return true;
      const as = o.assignedStaff || {};
      const isAssigned = (as.name && as.name) || (as.phone && as.phone);
      return !isAssigned;
    } catch { return true; }
  };
  const [viewOpen, setViewOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [newStaff, setNewStaff] = useState({ name: "", phone: "", email: "", role: "Delivery Executive" });
  const [assignOpenIndex, setAssignOpenIndex] = useState<number | null>(null);
  const [assignOrderId, setAssignOrderId] = useState<string>("");
  const [assignAction, setAssignAction] = useState<'pickup' | 'delivery'>('pickup');
  const [dailyRev, setDailyRev] = useState<{ label: string; value: number; count?: number }[]>([]);
  const [monthlyRev, setMonthlyRev] = useState<{ label: string; value: number; count?: number }[]>([]);
  const [yearlyRev, setYearlyRev] = useState<{ label: string; value: number; count?: number }[]>([]);
  const [reportService, setReportService] = useState<string>("");
  const [reportStatus, setReportStatus] = useState<string>("");
  const [contactStaff, setContactStaff] = useState<any>(null);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const submitAssign = async (staff: any) => {
    if (!assignOrderId) return alert('Please choose an Order ID');
    // Enforce one active order per staff
    const alreadyActive = (orders || []).some((o: any) => {
      const as = o.assignedStaff || {};
      const isAssignedToStaff = (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
      const isActive = o.status !== 'delivered';
      return isAssignedToStaff && isActive;
    });
    if (alreadyActive) {
      return alert('This delivery staff is already assigned to an active order. Complete it before assigning a new one.');
    }
    try {
      await api.bookings.updateStatus(assignOrderId, {
        assignedStaff: {
          name: staff.name,
          phone: staff.phone,
          email: staff.email,
          role: staff.role,
          status: staff.status,
          action: assignAction,
        }
      });
      alert(`Assigned ${staff.name} to order #${assignOrderId} for ${assignAction}`);
      setAssignOpenIndex(null);
      setAssignOrderId("");
      setAssignAction('pickup');
      await fetchOrders();
    } catch (e: any) {
      alert(e?.message || 'Failed to assign order');
    }
  };

  const isSameDay = (d: Date, e: Date) => d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth() && d.getDate() === e.getDate();
  const countOrdersTodayFor = (staff: any) => {
    const today = new Date();
    return (orders || []).filter((o: any) => {
      const as = o.assignedStaff || {};
      const matches = (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
      const created = o.createdAt ? new Date(o.createdAt) : null;
      return matches && created && isSameDay(created, today);
    }).length;
  };

  const hasAssignment = (staff: any) => {
    return (orders || []).some((o: any) => {
      const as = o.assignedStaff || {};
      const isAssignedToStaff = (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
      const isActive = o.status !== 'delivered';
      return isAssignedToStaff && isActive;
    });
  };

  const totalAssignedFor = (staff: any) => {
    return (orders || []).filter((o: any) => {
      const as = o.assignedStaff || {};
      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
    }).length;
  };

  const isMeaningfullyAssigned = (o: any) => {
    const as = o.assignedStaff || {};
    const hasPhone = typeof as.phone === 'string' && as.phone.trim().length > 0;
    const hasRealName = typeof as.name === 'string' && as.name.trim().length > 0 && as.name !== 'Laundry Staff';
    return hasPhone || hasRealName;
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const list = await api.bookings.adminAll();
      setOrders(list || []);
      try { const allSubs = await api.subscriptions.adminAll(); setSubs(allSubs || []); } catch (_) { setSubs([]); }
    } catch (_) {
      // keep empty; UI falls back to demo
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
    const type = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_loggedin_type') : null;
    if (token && type === 'admin') {
      fetchOrders();
      (async () => {
        try { const list = await api.users.list(); setUsers(list || []); } catch (_) {}
        try { const staff = await api.staff.list(); setStaffList(staff || []); } catch (_) {}
      })();
    }
  }, []);

  const openOrderView = async (id: string) => {
    if (!id) return;
    setViewLoading(true);
    setViewOpen(true);
    try {
      const data = await api.bookings.getById(id);
      setViewOrder(data);
    } catch (_) {
      setViewOrder(null);
    } finally {
      setViewLoading(false);
    }
  };

  // Fetch revenue datasets when Reports tab or filters change
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
    const type = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_loggedin_type') : null;
    if (selectedTab === 'reports' && token && type === 'admin') {
      (async () => {
        try { const r = await api.reports.revenue('daily', { service: reportService || undefined, status: reportStatus || undefined }); setDailyRev((r?.data || []) as any); } catch (_) { setDailyRev([]); }
        try { const r = await api.reports.revenue('monthly', { service: reportService || undefined, status: reportStatus || undefined }); setMonthlyRev((r?.data || []) as any); } catch (_) { setMonthlyRev([]); }
        try { const r = await api.reports.revenue('yearly', { service: reportService || undefined, status: reportStatus || undefined }); setYearlyRev((r?.data || []) as any); } catch (_) { setYearlyRev([]); }
      })();
    }
  }, [selectedTab, reportService, reportStatus]);

  const BarChart = ({ data }: { data: { label: string; value: number; count?: number }[] }) => (
    <div className="w-full h-64">
      <ResponsiveContainer width="100%" height="100%">
        <RBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} angle={-15} height={40} textAnchor="end" />
          <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
          <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
          <Tooltip formatter={(val: any, name: any) => name === 'Orders' ? [val, 'Orders'] : [`₹${val}`, 'Revenue']} />
          <Legend />
          <Bar yAxisId="left" dataKey="value" name="Revenue" fill="#6366F1" />
          <Bar yAxisId="right" dataKey="count" name="Orders" fill="#22C55E" />
        </RBarChart>
      </ResponsiveContainer>
    </div>
  );

  const recentOrdersLive = useMemo(() => {
    return (orders || []).slice(0, 3).map((o: any) => ({
      id: o.id,
      customer: o.userId ? String(o.userId).slice(-6) : 'Customer',
      service: o.service,
      status: o.status,
      amount: o.totalAmount || 0,
      time: ''
    }));
  }, [orders]);

  // Dashboard KPIs computed from live data
  const kpi = useMemo(() => {
    const today = new Date();
    const fmtInr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    const todaysOrders = (orders || []).filter((o: any) => {
      const created = o.createdAt ? new Date(o.createdAt) : null;
      return created ? isSameDay(created, today) : false;
    });
    const ordersCount = todaysOrders.length;
    const revenueSum = todaysOrders.reduce((s: number, o: any) => s + (Number(o.totalAmount) || 0), 0);
    const customersCount = (users || []).length;
    const staffCount = (staffList || []).length;
    // Staff-specific: compute my assignments
    let myAssigned = 0; let myCompleted = 0;
    if (loggedType === 'staff') {
      (orders || []).forEach((o: any) => {
        const as = o.assignedStaff || {};
        const isMine = (as.name && as.name === meName) || (as.phone && as.phone === mePhone);
        if (isMine) {
          myAssigned += 1;
          if (o.status === 'delivered') myCompleted += 1;
        }
      });
    }
    return {
      ordersCount,
      revenueToday: fmtInr.format(revenueSum),
      customersCount,
      staffCount,
      myAssigned,
      myCompleted,
      myActive: Math.max(myAssigned - myCompleted, 0),
    };
  }, [orders, users, staffList, loggedType, meName, mePhone]);

  const advanceStatus = (current: string) => {
    const flow = ["accepted","picked","washing","ready","delivery","delivered"];
    const idx = flow.indexOf(current);
    return flow[Math.min(idx + 1, flow.length - 1)] || current;
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    try {
      const next = advanceStatus(currentStatus);
      await api.bookings.updateStatus(id, { status: next });
      await fetchOrders();
    } catch (e: any) {
      alert(e?.message || 'Failed to update status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500";
      case "ready": return "bg-blue-500";
      case "in-progress": return "bg-yellow-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getStaffStatusColor = (status: string) => {
    switch (status) {
      case "active": return "bg-green-500";
      case "break": return "bg-yellow-500";
      case "offline": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getPaymentStatusColor = (paymentStatus: string) => {
    switch (paymentStatus?.toLowerCase()) {
      case "paid": return "bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-semibold";
      case "pending": return "bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full text-xs font-semibold";
      case "failed": return "bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-semibold";
      case "refunded": return "bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold";
      default: return "bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs";
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">
            {loggedType === 'staff' ? 'Delivery Staff Dashboard' : 'Admin Dashboard'}
          </h1>
          <p className="text-muted-foreground text-lg">
            {loggedType === 'staff' ? 'Track and complete your assigned deliveries' : 'Manage your laundry business operations and analytics'}
          </p>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            {loggedType !== 'staff' && <TabsTrigger value="customers">Customers</TabsTrigger>}
            {loggedType !== 'staff' && <TabsTrigger value="staff">Staff</TabsTrigger>}
            {loggedType !== 'staff' && <TabsTrigger value="reports">Reports</TabsTrigger>}
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="mt-6 space-y-6">
            {/* Stats Cards (live data) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-soft hover:shadow-medium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Today's Orders</p>
                      <p className="text-2xl font-bold">{kpi.ordersCount}</p>
                    </div>
                    <Package className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-soft hover:shadow-medium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Revenue Today</p>
                      <p className="text-2xl font-bold">{kpi.revenueToday}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-soft hover:shadow-medium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Customers</p>
                      <p className="text-2xl font-bold">{kpi.customersCount}</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-soft hover:shadow-medium transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Delivery Staff</p>
                      <p className="text-2xl font-bold">{kpi.staffCount}</p>
                    </div>
                    <Truck className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts and Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend (last 7 days) */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Revenue Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChart data={dailyRev} />
                </CardContent>
              </Card>

              {/* Recent Orders */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-primary" />
                    Recent Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(recentOrdersLive.length ? recentOrdersLive : recentOrders).map((order) => (
                      <div key={order.id} className="flex justify-between items-center p-3 bg-muted/10 rounded-lg">
                        <div>
                          <p className="font-semibold">{order.customer}</p>
                          <p className="text-sm text-muted-foreground">{order.service} • #{order.id}</p>
                        </div>
                        <div className="text-right">
                          <Badge variant="secondary" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                          <p className="text-sm text-muted-foreground">{order.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {loggedType === 'staff' ? 'My Deliveries' : 'Order Management'}
                </CardTitle>
                <CardDescription>
                  {loggedType === 'staff' ? 'Assigned, Completed, and Total orders summary' : 'View and manage all customer orders'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loggedType === 'staff' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <Card className="shadow-soft"><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Assigned</p><p className="text-2xl font-bold">{kpi.myActive}</p></CardContent></Card>
                    <Card className="shadow-soft"><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Completed</p><p className="text-2xl font-bold">{kpi.myCompleted}</p></CardContent></Card>
                    <Card className="shadow-soft"><CardContent className="p-6 text-center"><p className="text-sm text-muted-foreground">Total Assigned</p><p className="text-2xl font-bold">{kpi.myAssigned}</p></CardContent></Card>
                  </div>
                )}
                
                {/* Nested tabs for order types */}
                <Tabs defaultValue="normal-orders" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 mb-4">
                    <TabsTrigger value="normal-orders">Normal Orders</TabsTrigger>
                    <TabsTrigger value="weekly-orders">Weekly Orders</TabsTrigger>
                    <TabsTrigger value="daily-orders">Daily Regular Orders</TabsTrigger>
                  </TabsList>

                  {/* Normal Orders Tab */}
                  <TabsContent value="normal-orders" className="space-y-4">
                    {/* Payment Filter */}
                    <div className="flex items-center gap-2 mb-4">
                      <Label className="text-sm font-semibold">Filter by Payment:</Label>
                      <div className="flex gap-2">
                        <Button size="sm" variant={paymentFilter === "all" ? "default" : "outline"} onClick={() => setPaymentFilter("all")}>All</Button>
                        <Button size="sm" variant={paymentFilter === "paid" ? "default" : "outline"} onClick={() => setPaymentFilter("paid")}>Paid</Button>
                        <Button size="sm" variant={paymentFilter === "pending" ? "default" : "outline"} onClick={() => setPaymentFilter("pending")}>Pending</Button>
                        <Button size="sm" variant={paymentFilter === "failed" ? "default" : "outline"} onClick={() => setPaymentFilter("failed")}>Failed</Button>
                      </div>
                    </div>

                    {(orders.length ? (loggedType === 'staff' ? orders.filter((o: any) => { const as = o.assignedStaff || {}; return (as.name && as.name === meName) || (as.phone && as.phone === mePhone); }) : orders) : recentOrders).filter((order: any) => paymentFilter === "all" || order.paymentStatus?.toLowerCase() === paymentFilter).map((order: any) => (
                      <div key={order.id} className="border rounded-lg p-4 hover:shadow-soft transition-shadow">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <p className="font-semibold">Order #{order.id}</p>
                            <p className="text-muted-foreground">{order.customer || ''}</p>
                          </div>
                          <Badge variant="secondary" className={getStatusColor(order.status)}>
                            {order.status}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="space-y-1">
                            <p className="text-sm"><strong>Service:</strong> {order.service}</p>
                            <p className="text-sm"><strong>Amount:</strong> ₹{order.totalAmount ?? order.amount}</p>
                            {order.paymentStatus && (
                              <p className="text-sm"><strong>Payment:</strong> <span className={getPaymentStatusColor(order.paymentStatus)}>{order.paymentStatus}</span></p>
                            )}
                            {order.time && <p className="text-sm text-muted-foreground">{order.time}</p>}
                          </div>
                          <div className="space-x-2">
                            <Button size="sm" variant="outline" onClick={() => openOrderView(order.id)}>View</Button>
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id, order.status)}>Update Status</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(orders.length ? (loggedType === 'staff' ? orders.filter((o: any) => { const as = o.assignedStaff || {}; return (as.name && as.name === meName) || (as.phone && as.phone === mePhone); }) : orders) : recentOrders).filter((order: any) => paymentFilter === "all" || order.paymentStatus?.toLowerCase() === paymentFilter).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        {paymentFilter === "all" ? "No normal orders yet" : `No ${paymentFilter} orders found`}
                      </div>
                    )}
                  </TabsContent>

                  {/* Weekly Orders Tab */}
                  <TabsContent value="weekly-orders" className="space-y-4">
                    {subs.filter((s: any) => s.kind === 'weekly_pickup').map((s: any, idx: number) => (
                      <div key={idx} className="border border-primary/20 rounded-md p-3 bg-background/80">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">Weekly pickup • {s.monthKey}</p>
                            <p className="text-xs text-muted-foreground">Subscription ID: {s.code || s._id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">active</Badge>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(s.createdBookingId || s.code || s._id)}>Copy ID</Button>
                            <Button size="sm" onClick={() => openOrderView(s.createdBookingId)}>View</Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Start:</strong> {new Date(s.startDate || Date.now()).toISOString().slice(0,10)}</div>
                          {s.nextRun && (
                            <div><strong>Next pickup:</strong> {new Date(s.nextRun).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}{s.pickupTime ? `, ${s.pickupTime}` : ''}</div>
                          )}
                          {Array.isArray(s.runs) && s.runs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {s.runs.slice(0, 8).map((d: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded">{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {subs.filter((s: any) => s.kind === 'weekly_pickup').length === 0 && (
                      <div className="text-center text-muted-foreground py-8">No weekly orders yet</div>
                    )}
                  </TabsContent>

                  {/* Daily Regular Orders Tab */}
                  <TabsContent value="daily-orders" className="space-y-4">
                    {subs.filter((s: any) => s.kind !== 'weekly_pickup').map((s: any, idx: number) => (
                      <div key={idx} className="border border-primary/20 rounded-md p-3 bg-background/80">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">Daily pickup • {s.monthKey}</p>
                            <p className="text-xs text-muted-foreground">Subscription ID: {s.code || s._id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">active</Badge>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(s.createdBookingId || s.code || s._id)}>Copy ID</Button>
                            <Button size="sm" onClick={() => openOrderView(s.createdBookingId)}>View</Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Start:</strong> {new Date(s.startDate || Date.now()).toISOString().slice(0,10)}</div>
                          {s.nextRun && (
                            <div><strong>Next pickup:</strong> {new Date(s.nextRun).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}{s.pickupTime ? `, ${s.pickupTime}` : ''}</div>
                          )}
                          {Array.isArray(s.runs) && s.runs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {s.runs.slice(0, 8).map((d: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded">{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {subs.filter((s: any) => s.kind !== 'weekly_pickup').length === 0 && (
                      <div className="text-center text-muted-foreground py-8">No daily regular orders yet</div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Customer Management
                </CardTitle>
                <CardDescription>
                  View customer profiles and manage relationships
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {users.map(u => (
                    <div key={u.id} className="border rounded-lg p-4 flex justify-between items-start hover:shadow-soft">
                      <div className="space-y-1">
                        <p className="font-semibold">{u.username} {u.subscribed && <Badge className="ml-2">Subscribed</Badge>}</p>
                        <p className="text-sm text-muted-foreground">{u.email} • {u.phone}</p>
                        <div className="text-xs text-muted-foreground">
                          <span><strong>Orders:</strong> {u.activity?.totalOrders || 0}</span>
                          <span> • <strong>Spent:</strong> ₹{u.activity?.totalSpent || 0}</span>
                          {u.activity?.recentOrder && (
                            <span> • <strong>Recent:</strong> #{u.activity.recentOrder.id} ({u.activity.recentOrder.status})</span>
                          )}
                        </div>
                      </div>
                      <div className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => {
                          if (confirm(`Delete user ${u.username}? This will remove their bookings too.`)) {
                            api.users.delete(u.id).then(() => api.users.list().then(setUsers));
                          }
                        }}>Delete</Button>
                      </div>
                    </div>
                  ))}
                  {users.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No customers yet</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-primary" />
                  Delivery Staff
                </CardTitle>
                <CardDescription>
                  Manage delivery staff and track performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Add Delivery Staff */}
                <Card className="border-dashed mb-6">
                  <CardHeader>
                    <CardTitle className="text-base">Add Delivery Staff</CardTitle>
                    <CardDescription>Manually add delivery staff details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div>
                        <Label>Name</Label>
                        <Input value={newStaff.name} onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} placeholder="Full name" />
                      </div>
                      <div>
                        <Label>Mobile Number</Label>
                        <Input value={newStaff.phone} onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })} placeholder="+91 XXXXX XXXXX" />
                      </div>
                      <div>
                        <Label>Email</Label>
                        <Input type="email" value={newStaff.email} onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} placeholder="email@example.com" />
                      </div>
                      <div>
                        <Label>Role</Label>
                        <Input value={newStaff.role} onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })} placeholder="Delivery Executive" />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={async () => {
                          if (!newStaff.name || !newStaff.phone) return;
                          try {
                            const created = await api.staff.create({ ...newStaff, ordersToday: 0 });
                            setStaffList([created, ...staffList]);
                            setNewStaff({ name: "", phone: "", email: "", role: "Delivery Executive" });
                          } catch (e: any) {
                            alert(e?.message || 'Failed to add staff');
                          }
                        }}>Add Staff</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Nested tabs for staff by order type */}
                <Tabs defaultValue="all-staff" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 mb-4">
                    <TabsTrigger value="all-staff">All Staff</TabsTrigger>
                    <TabsTrigger value="normal-orders">Normal Orders</TabsTrigger>
                    <TabsTrigger value="weekly-orders">Weekly Orders</TabsTrigger>
                    <TabsTrigger value="daily-orders">Daily Regular Orders</TabsTrigger>
                  </TabsList>

                  {/* All Staff Tab */}
                  <TabsContent value="all-staff" className="space-y-6">
                  {[...staffList].sort((a, b) => {
                    // Sort staff: break status first, then active/subscription
                    const aAssigned = hasAssignment(a);
                    const bAssigned = hasAssignment(b);
                    if (!aAssigned && bAssigned) return -1; // a is on break, b is active - a comes first
                    if (aAssigned && !bAssigned) return 1;  // a is active, b is on break - b comes first
                    return 0; // same status, keep original order
                  }).map((staff, index) => {
                    // Check if staff is assigned to a subscription order
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (
                        (as.name && as.name === staff.name) ||
                        (as.phone && as.phone === staff.phone)
                      );
                    });
                    const isAssignedToSubscription = assignedOrder && (subs || []).some((s: any) => s.createdBookingId === assignedOrder.id);
                    const assigned = hasAssignment(staff);
                    
                    return (
                    <div key={index} className={`border rounded-lg p-4 hover:shadow-soft transition-shadow ${isAssignedToSubscription ? 'bg-purple-50 border-purple-200' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.role}</p>
                          <p className="text-sm text-muted-foreground">{staff.phone}</p>
                          {staff.email && <p className="text-sm text-muted-foreground">{staff.email}</p>}
                          {/* Assigned order summary */}
                          {(() => {
                            if (!assignedOrder) return null;
                            return (
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>Assigned:</strong> #{assignedOrder.id} {assignedOrder.assignedStaff?.action ? `• ${assignedOrder.assignedStaff.action}` : ''} {assignedOrder.status ? `• ${assignedOrder.status}` : ''}
                                {isAssignedToSubscription && <Badge className="ml-2 bg-purple-500">Subscription</Badge>}
                              </p>
                            );
                          })()}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {(() => {
                            const s = assigned ? 'active' : 'break';
                            return (
                              <Badge variant="secondary" className={isAssignedToSubscription ? 'bg-purple-500' : getStaffStatusColor(s)}>
                                {assigned ? (isAssignedToSubscription ? 'subscription' : 'active') : 'break'}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm">
                          <strong>Orders Today:</strong> {countOrdersTodayFor(staff)}
                          <span className="ml-3"><strong>Total Assigned:</strong> { (orders || []).filter((o: any) => { const as = o.assignedStaff || {}; return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone); }).length }</span>
                        </p>
                        <div className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setContactStaff(staff)}>View</Button>
                          <Button size="sm" disabled={(orders || []).some((o: any) => { const as = o.assignedStaff || {}; const isAssignedToStaff = (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone); const isActive = o.status !== 'delivered'; return isAssignedToStaff && isActive; })} onClick={() => {
                            if (assignOpenIndex === index) {
                              setAssignOpenIndex(null);
                            } else {
                              setAssignOpenIndex(index);
                            }
                          }}>Assign Order</Button>
                        </div>
                      </div>
                      {assignOpenIndex === index && (
                        <div className="mt-3 p-3 rounded-md bg-muted/10 border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>Order</Label>
                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={assignOrderId}
                                onChange={(e) => setAssignOrderId(e.target.value)}
                              >
                                <option value="">Select recent order</option>
                                {orders
                                  .filter((o: any) => !isMeaningfullyAssigned(o))
                                  .slice(0, 20)
                                  .map((o: any) => (
                                    <option key={o.id} value={o.id}>#{o.id}</option>
                                  ))}
                                {subs
                                  .filter((s: any) => s && s.createdBookingId && isBookingUnassigned(s.createdBookingId))
                                  .slice(0, 20)
                                  .map((s: any) => (
                                    <option key={s.createdBookingId} value={s.createdBookingId}>#{s.createdBookingId} • SUB</option>
                                  ))}
                              </select>
                              <div className="text-xs text-muted-foreground mt-1">Or paste Order ID below</div>
                              <Input className="mt-1" placeholder="Enter Order ID" value={assignOrderId} onChange={(e) => setAssignOrderId(e.target.value)} />
                            </div>
                            <div>
                              <Label>Action</Label>
                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={assignAction}
                                onChange={(e) => setAssignAction(e.target.value as any)}
                              >
                                <option value="pickup">Pickup</option>
                                <option value="delivery">Delivery</option>
                              </select>
                            </div>
                            <div className="flex items-end gap-2">
                              <Button onClick={() => submitAssign(staff)}>Assign</Button>
                              <Button variant="outline" onClick={() => { setAssignOpenIndex(null); setAssignOrderId(""); }}>Cancel</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                  </TabsContent>

                  {/* Normal Orders Staff Tab */}
                  <TabsContent value="normal-orders" className="space-y-6">
                  {[...staffList].filter(staff => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    const isSubscription = assignedOrder && (subs || []).some((s: any) => s.createdBookingId === assignedOrder.id);
                    return assignedOrder && !isSubscription;
                  }).sort((a, b) => {
                    const aAssigned = hasAssignment(a);
                    const bAssigned = hasAssignment(b);
                    if (!aAssigned && bAssigned) return -1;
                    if (aAssigned && !bAssigned) return 1;
                    return 0;
                  }).map((staff, index) => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    const isAssignedToSubscription = assignedOrder && (subs || []).some((s: any) => s.createdBookingId === assignedOrder.id);
                    const assigned = hasAssignment(staff);
                    
                    return (
                    <div key={index} className={`border rounded-lg p-4 hover:shadow-soft transition-shadow ${isAssignedToSubscription ? 'bg-purple-50 border-purple-200' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.role}</p>
                          <p className="text-sm text-muted-foreground">{staff.phone}</p>
                          {staff.email && <p className="text-sm text-muted-foreground">{staff.email}</p>}
                          {(() => {
                            if (!assignedOrder) return null;
                            return (
                              <p className="text-xs text-muted-foreground mt-1">
                                <strong>Assigned:</strong> #{assignedOrder.id} {assignedOrder.assignedStaff?.action ? `• ${assignedOrder.assignedStaff.action}` : ''} {assignedOrder.status ? `• ${assignedOrder.status}` : ''}
                                {isAssignedToSubscription && <Badge className="ml-2 bg-purple-500">Subscription</Badge>}
                              </p>
                            );
                          })()}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {(() => {
                            const s = assigned ? 'active' : 'break';
                            return (
                              <Badge variant="secondary" className={isAssignedToSubscription ? 'bg-purple-500' : getStaffStatusColor(s)}>
                                {assigned ? (isAssignedToSubscription ? 'subscription' : 'active') : 'break'}
                              </Badge>
                            );
                          })()}
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm">
                          <strong>Orders Today:</strong> {countOrdersTodayFor(staff)}
                          <span className="ml-3"><strong>Total Assigned:</strong> { (orders || []).filter((o: any) => { const as = o.assignedStaff || {}; return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone); }).length }</span>
                        </p>
                        <div className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => setContactStaff(staff)}>View</Button>
                          <Button size="sm" disabled={(orders || []).some((o: any) => { const as = o.assignedStaff || {}; const isAssignedToStaff = (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone); const isActive = o.status !== 'delivered'; return isAssignedToStaff && isActive; })} onClick={() => {
                            if (assignOpenIndex === index) {
                              setAssignOpenIndex(null);
                            } else {
                              setAssignOpenIndex(index);
                            }
                          }}>Assign Order</Button>
                        </div>
                      </div>
                      {assignOpenIndex === index && (
                        <div className="mt-3 p-3 rounded-md bg-muted/10 border">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>Order</Label>
                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={assignOrderId}
                                onChange={(e) => setAssignOrderId(e.target.value)}
                              >
                                <option value="">Select recent order</option>
                                {orders
                                  .filter((o: any) => !isMeaningfullyAssigned(o))
                                  .slice(0, 20)
                                  .map((o: any) => (
                                    <option key={o.id} value={o.id}>#{o.id}</option>
                                  ))}
                                {subs
                                  .filter((s: any) => s && s.createdBookingId && isBookingUnassigned(s.createdBookingId))
                                  .slice(0, 20)
                                  .map((s: any) => (
                                    <option key={s.createdBookingId} value={s.createdBookingId}>#{s.createdBookingId} • SUB</option>
                                  ))}
                              </select>
                              <div className="text-xs text-muted-foreground mt-1">Or paste Order ID below</div>
                              <Input className="mt-1" placeholder="Enter Order ID" value={assignOrderId} onChange={(e) => setAssignOrderId(e.target.value)} />
                            </div>
                            <div>
                              <Label>Action</Label>
                              <select
                                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                                value={assignAction}
                                onChange={(e) => setAssignAction(e.target.value as any)}
                              >
                                <option value="pickup">Pickup</option>
                                <option value="delivery">Delivery</option>
                              </select>
                            </div>
                            <div className="flex items-end gap-2">
                              <Button onClick={() => submitAssign(staff)}>Assign</Button>
                              <Button variant="outline" onClick={() => { setAssignOpenIndex(null); setAssignOrderId(""); }}>Cancel</Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                  {[...staffList].filter(staff => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    const isSubscription = assignedOrder && (subs || []).some((s: any) => s.createdBookingId === assignedOrder.id);
                    return assignedOrder && !isSubscription;
                  }).length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No staff assigned to normal orders</div>
                  )}
                  </TabsContent>

                  {/* Weekly Orders Staff Tab */}
                  <TabsContent value="weekly-orders" className="space-y-6">
                  {[...staffList].filter(staff => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    if (!assignedOrder) return false;
                    const matchingSub = (subs || []).find((s: any) => s.createdBookingId === assignedOrder.id);
                    return matchingSub && matchingSub.kind === 'weekly_pickup';
                  }).map((staff, index) => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    const isAssignedToSubscription = true;
                    const assigned = hasAssignment(staff);
                    
                    return (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-soft transition-shadow bg-purple-50 border-purple-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.role}</p>
                          <p className="text-sm text-muted-foreground">{staff.phone}</p>
                          {staff.email && <p className="text-sm text-muted-foreground">{staff.email}</p>}
                          {assignedOrder && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Assigned:</strong> #{assignedOrder.id} {assignedOrder.assignedStaff?.action ? `• ${assignedOrder.assignedStaff.action}` : ''} {assignedOrder.status ? `• ${assignedOrder.status}` : ''}
                              <Badge className="ml-2 bg-purple-500">Weekly Subscription</Badge>
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-purple-500">subscription</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm">
                          <strong>Orders Today:</strong> {countOrdersTodayFor(staff)}
                          <span className="ml-3"><strong>Total Assigned:</strong> { (orders || []).filter((o: any) => { const as = o.assignedStaff || {}; return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone); }).length }</span>
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setContactStaff(staff)}>View</Button>
                      </div>
                    </div>
                    );
                  })}
                  {[...staffList].filter(staff => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    if (!assignedOrder) return false;
                    const matchingSub = (subs || []).find((s: any) => s.createdBookingId === assignedOrder.id);
                    return matchingSub && matchingSub.kind === 'weekly_pickup';
                  }).length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No staff assigned to weekly orders</div>
                  )}
                  </TabsContent>

                  {/* Daily Regular Orders Staff Tab */}
                  <TabsContent value="daily-orders" className="space-y-6">
                  {[...staffList].filter(staff => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    if (!assignedOrder) return false;
                    const matchingSub = (subs || []).find((s: any) => s.createdBookingId === assignedOrder.id);
                    return matchingSub && matchingSub.kind !== 'weekly_pickup';
                  }).map((staff, index) => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    const isAssignedToSubscription = true;
                    const assigned = hasAssignment(staff);
                    
                    return (
                    <div key={index} className="border rounded-lg p-4 hover:shadow-soft transition-shadow bg-purple-50 border-purple-200">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">{staff.name}</p>
                          <p className="text-sm text-muted-foreground">{staff.role}</p>
                          <p className="text-sm text-muted-foreground">{staff.phone}</p>
                          {staff.email && <p className="text-sm text-muted-foreground">{staff.email}</p>}
                          {assignedOrder && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <strong>Assigned:</strong> #{assignedOrder.id} {assignedOrder.assignedStaff?.action ? `• ${assignedOrder.assignedStaff.action}` : ''} {assignedOrder.status ? `• ${assignedOrder.status}` : ''}
                              <Badge className="ml-2 bg-purple-500">Daily Subscription</Badge>
                            </p>
                          )}
                        </div>
                        <Badge variant="secondary" className="bg-purple-500">subscription</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-sm">
                          <strong>Orders Today:</strong> {countOrdersTodayFor(staff)}
                          <span className="ml-3"><strong>Total Assigned:</strong> { (orders || []).filter((o: any) => { const as = o.assignedStaff || {}; return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone); }).length }</span>
                        </p>
                        <Button size="sm" variant="outline" onClick={() => setContactStaff(staff)}>View</Button>
                      </div>
                    </div>
                    );
                  })}
                  {[...staffList].filter(staff => {
                    const assignedOrder = (orders || []).find((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === staff.name) || (as.phone && as.phone === staff.phone);
                    });
                    if (!assignedOrder) return false;
                    const matchingSub = (subs || []).find((s: any) => s.createdBookingId === assignedOrder.id);
                    return matchingSub && matchingSub.kind !== 'weekly_pickup';
                  }).length === 0 && (
                    <div className="text-center text-muted-foreground py-8">No staff assigned to daily regular orders</div>
                  )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Reports & Analytics
                </CardTitle>
                <CardDescription>
                  Revenue based on total customer spend (bookings totalAmount)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Label>Service</Label>
                    <select className="h-9 rounded-md border px-2 text-sm" value={reportService} onChange={(e) => setReportService(e.target.value)}>
                      <option value="">All</option>
                      <option value="wash-fold">Wash & Fold</option>
                      <option value="wash-iron">Wash & Iron</option>
                      <option value="dry-clean">Dry Clean</option>
                      <option value="eco-wash">Eco Wash</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Status</Label>
                    <select className="h-9 rounded-md border px-2 text-sm" value={reportStatus} onChange={(e) => setReportStatus(e.target.value)}>
                      <option value="">All</option>
                      <option value="accepted">accepted</option>
                      <option value="picked">picked</option>
                      <option value="washing">washing</option>
                      <option value="ready">ready</option>
                      <option value="delivery">delivery</option>
                      <option value="delivered">delivered</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Daily Report (last 7 days)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarChart data={dailyRev} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Monthly Report (last 12 months)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarChart data={monthlyRev} />
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Yearly Report (last 5 years)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <BarChart data={yearlyRev} />
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      {viewOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order details</h3>
              <Button variant="outline" onClick={() => { setViewOpen(false); setViewOrder(null); }}>Close</Button>
            </div>
            {viewLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : viewOrder ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <div><strong>Order ID:</strong> {viewOrder.id}</div>
                  <Badge>{viewOrder.status}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><strong>Service:</strong> {viewOrder.service}</div>
                  <div><strong>Amount:</strong> ₹{viewOrder.totalAmount ?? 0}</div>
                  <div><strong>Payment:</strong> {viewOrder.paymentStatus || 'pending'}</div>
                  <div><strong>Created:</strong> {new Date(viewOrder.createdAt || Date.now()).toLocaleString()}</div>
                </div>
                {viewOrder.items && viewOrder.items.length > 0 && (
                  <div>
                    <div className="font-semibold mb-1">Items</div>
                    <div className="space-y-1">
                      {viewOrder.items.map((it: any, i: number) => (
                        <div key={i}>• {it.quantity} {it.name}{it.unitPrice ? ` @ ₹${it.unitPrice}` : ''}{it.amount ? ` = ₹${it.amount}` : ''}</div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><strong>Pickup:</strong> {viewOrder.pickupAddress}</div>
                  <div><strong>Delivery:</strong> {viewOrder.deliveryAddress}</div>
                </div>
                {(() => {
                  const u = (users || []).find((x: any) => String(x.id) === String(viewOrder.userId));
                  if (!u) return null;
                  return (
                    <div className="mt-2">
                      <div className="font-semibold mb-1">Customer</div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><strong>Name:</strong> {u.username}</div>
                        <div><strong>Email:</strong> {u.email}</div>
                        <div><strong>Phone:</strong> {u.phone}</div>
                        <div><strong>Type:</strong> {u.userType}</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Order not found.</div>
            )}
          </div>
        </div>
      )}
      {contactStaff && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl p-6 my-8">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Delivery Staff Contact</h3>
              <Button variant="outline" onClick={() => setContactStaff(null)}>Close</Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base border-b pb-2">Contact Information</h4>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Name</p>
                  <p className="text-base font-semibold">{contactStaff.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Role</p>
                  <p className="text-base">{contactStaff.role}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Phone Number</p>
                  <div className="flex items-center gap-2">
                    <p className="text-base">{contactStaff.phone}</p>
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard?.writeText(contactStaff.phone);
                      alert('Phone number copied!');
                    }}>Copy</Button>
                    <Button size="sm" onClick={() => window.open(`tel:${contactStaff.phone}`)}>Call</Button>
                  </div>
                </div>
                {contactStaff.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="text-base">{contactStaff.email}</p>
                      <Button size="sm" variant="outline" onClick={() => {
                        navigator.clipboard?.writeText(contactStaff.email);
                        alert('Email copied!');
                      }}>Copy</Button>
                      <Button size="sm" onClick={() => window.open(`mailto:${contactStaff.email}`)}>Email</Button>
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Orders Today</p>
                  <p className="text-base font-semibold">{countOrdersTodayFor(contactStaff)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Total Assigned Orders</p>
                  <p className="text-base font-semibold">{totalAssignedFor(contactStaff)}</p>
                </div>
              </div>

              {/* Assigned Orders */}
              <div className="space-y-4">
                <h4 className="font-semibold text-base border-b pb-2">Assigned Orders</h4>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {(() => {
                    const assignedOrders = (orders || []).filter((o: any) => {
                      const as = o.assignedStaff || {};
                      return (as.name && as.name === contactStaff.name) || (as.phone && as.phone === contactStaff.phone);
                    });
                    
                    if (assignedOrders.length === 0) {
                      return <p className="text-sm text-muted-foreground">No assigned orders</p>;
                    }
                    
                    return assignedOrders.map((order: any) => {
                      const isSubscription = (subs || []).some((s: any) => s.createdBookingId === order.id);
                      return (
                        <div key={order.id} className={`border rounded-md p-3 ${isSubscription ? 'bg-purple-50 border-purple-200' : 'bg-muted/10'}`}>
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold">Order #{order.id}</p>
                              <p className="text-xs text-muted-foreground">{order.service}</p>
                              <p className="text-xs text-muted-foreground">Status: {order.status}</p>
                              {isSubscription && <Badge className="mt-1 bg-purple-500 text-xs">Subscription</Badge>}
                            </div>
                            <Badge variant="secondary" className={getStatusColor(order.status)}>
                              {order.status}
                            </Badge>
                          </div>
                          <div className="flex gap-2 mt-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              setContactStaff(null);
                              openOrderView(order.id);
                            }}>View</Button>
                            {order.status !== 'delivered' && (
                              <Button size="sm" variant="destructive" onClick={async () => {
                                if (!confirm(`Cancel assignment for order #${order.id}?`)) return;
                                try {
                                  await api.bookings.updateStatus(order.id, { assignedStaff: {} });
                                  await fetchOrders();
                                  setContactStaff(null);
                                  alert('Order assignment cancelled');
                                } catch (e: any) {
                                  alert(e?.message || 'Failed to cancel assignment');
                                }
                              }}>Cancel Assignment</Button>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;