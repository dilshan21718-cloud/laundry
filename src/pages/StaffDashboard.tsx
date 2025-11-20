import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  CheckCircle,
  Clock,
  TrendingUp,
  User,
  Phone,
  Mail
} from "lucide-react";
import { api } from "@/lib/api";

const StaffDashboard = () => {
  const navigate = useNavigate();
  
  const [staffInfo, setStaffInfo] = useState<any>({ username: '', phone: '', email: '', name: '' });
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewOrder, setViewOrder] = useState<any>(null);
  const [viewLoading, setViewLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const list = await api.bookings.staffMine();
      setOrders(list || []);
    } catch (_) {
      // keep empty
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
    const type = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_loggedin_type') : null;
    if (token && type === 'staff') {
      // Fetch logged-in staff info
      api.auth.me().then((user: any) => {
        setStaffInfo({
          username: user.username || '',
          phone: user.phone || '',
          email: user.email || '',
          name: user.name || user.username || ''
        });
      }).catch(() => {
        // Fallback to localStorage if API fails
        const localStaff = JSON.parse(localStorage.getItem('laundrybuddy_users') || '[]').find((u: any) => u.userType === 'staff');
        if (localStaff) {
          setStaffInfo({
            username: localStaff.username || '',
            phone: localStaff.phone || '',
            email: localStaff.email || '',
            name: localStaff.name || localStaff.username || ''
          });
        }
      });
      fetchOrders();
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

  const isSameDay = (d: Date, e: Date) => d.getFullYear() === e.getFullYear() && d.getMonth() === e.getMonth() && d.getDate() === e.getDate();

  // Staff-specific KPIs
  const kpi = useMemo(() => {
    const today = new Date();
    const myOrders = (orders || []).filter((o: any) => {
      const as = o.assignedStaff || {};
      return (as.name && as.name === staffInfo.name) || (as.phone && as.phone === staffInfo.phone);
    });
    const myTodayOrders = myOrders.filter((o: any) => {
      const created = o.createdAt ? new Date(o.createdAt) : null;
      return created ? isSameDay(created, today) : false;
    });
    const myCompleted = myOrders.filter((o: any) => o.status === 'delivered').length;
    const myActive = myOrders.filter((o: any) => o.status !== 'delivered').length;
    
    return {
      totalAssigned: myOrders.length,
      todayOrders: myTodayOrders.length,
      completed: myCompleted,
      active: myActive,
    };
  }, [orders, staffInfo.name, staffInfo.phone]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500";
      case "ready": return "bg-blue-500";
      case "in-progress": return "bg-yellow-500";
      case "washing": return "bg-yellow-500";
      case "picked": return "bg-blue-400";
      case "accepted": return "bg-gray-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const advanceStatus = (current: string) => {
    const s = (current || "").toLowerCase();

    if (s === "accepted") return "picked";
    if (s === "delivery") return "delivered";

    // For any other status, do not change from the staff side
    return current;
  };

  const handleUpdateStatus = async (id: string, currentStatus: string) => {
    try {
      const next = advanceStatus(currentStatus);
      if (!next || next === currentStatus) return;
      await api.bookings.updateStatus(id, { status: next });
      await fetchOrders();
    } catch (e: any) {
      alert(e?.message || 'Failed to update status');
    }
  };

  const myAssignedOrders = useMemo(() => {
    return (orders || []).filter((o: any) => {
      const as = o.assignedStaff || {};
      return (as.name && as.name === staffInfo.name) || (as.phone && as.phone === staffInfo.phone);
    });
  }, [orders, staffInfo.name, staffInfo.phone]);

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">
            Delivery Staff Dashboard
          </h1>
          <p className="text-muted-foreground text-lg">
            Track and complete your assigned deliveries
          </p>
        </div>

        {/* Profile Card */}
        <Card className="shadow-soft mb-8">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{staffInfo.name || staffInfo.username || 'Staff Member'}</h2>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                  {staffInfo.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      <span>{staffInfo.phone}</span>
                    </div>
                  )}
                  {staffInfo.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      <span>{staffInfo.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Orders</p>
                  <p className="text-2xl font-bold">{kpi.todayOrders}</p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Orders</p>
                  <p className="text-2xl font-bold">{kpi.active}</p>
                </div>
                <Package className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold">{kpi.completed}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft hover:shadow-medium transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Assigned</p>
                  <p className="text-2xl font-bold">{kpi.totalAssigned}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* My Deliveries */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              My Assigned Orders
            </CardTitle>
            <CardDescription>
              Orders assigned to you for pickup or delivery
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {myAssignedOrders.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  No orders assigned yet
                </div>
              ) : (
                myAssignedOrders.map((order: any) => {
                  const isSubscription = typeof order.service === 'string' && order.service.toLowerCase().includes('subscription');
                  return (
                    <div key={order.id} className={`border rounded-lg p-4 hover:shadow-soft transition-shadow ${isSubscription ? 'bg-purple-50 border-purple-200' : ''}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-semibold">Order #{order.id}</p>
                          <p className="text-sm text-muted-foreground">{order.service}</p>
                          {isSubscription && <Badge className="mt-1 bg-purple-500">Subscription</Badge>}
                        </div>
                        <Badge variant="secondary" className={getStatusColor(order.status)}>
                          {order.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-sm"><strong>Amount:</strong> ₹{order.totalAmount || 0}</p>
                          <p className="text-sm"><strong>Action:</strong> {order.assignedStaff?.action === 'pickup' ? 'Pickup' : order.assignedStaff?.action === 'delivery' ? 'Delivery' : 'N/A'}</p>
                          {order.pickupAddress && (
                            <p className="text-xs text-muted-foreground"><strong>Address:</strong> {order.pickupAddress}</p>
                          )}
                        </div>
                        <div className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => openOrderView(order.id)}>View</Button>
                          {(order.status === 'accepted' || order.status === 'delivery') && (
                            <Button size="sm" onClick={() => handleUpdateStatus(order.id, order.status)}>
                              Accept
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Order View Modal */}
      {viewOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Order Details</h3>
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
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Order not found.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
