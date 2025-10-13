import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  User, 
  Package, 
  Heart, 
  Settings, 
  MapPin, 
  Phone, 
  Mail,
  Calendar,
  Star,
  Gift
} from "lucide-react";
import { api } from "@/lib/api";

const fallbackOrders = [] as any[]; // keep empty so stats reflect real data when logged in

const digitalWardrobe = [
  { item: "Blue Formal Shirt", status: "at-home", lastWashed: "2024-01-15" },
  { item: "Black Jeans", status: "at-home", lastWashed: "2024-01-10" },
  { item: "Red Kurta", status: "in-laundry", pickupDate: "2024-01-20" },
  { item: "White T-shirt", status: "in-laundry", pickupDate: "2024-01-20" },
];

const Account = () => {
  const navigate = useNavigate();
  // Get logged-in user details (backend preferred, fallback to local)
  const [userInfo, setUserInfo] = useState<any>({ username: "", email: "", phone: "", userType: "" });
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
    if (!token) {
      // fallback to local mock
      const loggedInType = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_loggedin_type") : null;
      const usersStr = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_users") : null;
      if (usersStr && loggedInType) {
        try {
          const users = JSON.parse(usersStr);
          const user = users.find((u: any) => u.userType === loggedInType);
          if (user) setUserInfo(user);
        } catch {}
      }
      return;
    }
    (async () => {
      try {
        const me = await api.auth.me();
        setUserInfo(me);
      } catch (_) {
        // ignore, leave defaults
      }
    })();
  }, []);

  const [orders, setOrders] = useState<any[]>(fallbackOrders);
  const [subOrders, setSubOrders] = useState<any[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  useEffect(() => {
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
        if (!token) return;
        const list = await api.bookings.mine();
        // normalize minimal fields for UI
        const mapped = (list || []).map((o: any) => ({
          id: o.id,
          service: o.service,
          date: new Date(o.createdAt || Date.now()).toISOString().slice(0,10),
          status: o.status,
          amount: o.totalAmount || 0,
          rating: 0,
          quantity: o.quantity,
          estimatedDelivery: o.estimatedDelivery,
          pickupAddress: o.pickupAddress,
          deliveryAddress: o.deliveryAddress,
          paymentStatus: o.paymentStatus,
          loyaltyPointsUsed: o.loyaltyPointsUsed || 0,
          items: Array.isArray(o.items)
            ? (typeof o.items[0] === 'object'
                ? o.items.filter((it: any) => (it?.quantity ?? 0) > 0).map((it: any) => `${it.quantity} ${it.name}`)
                : o.items)
            : [],
        }));
        setOrders(mapped); // set even if empty so stats show 0
      } catch (_) {
        setOrders([]); // on error, show zero to avoid misleading fallback
      }
    })();
  }, []);

  // Load subscription orders history separately to ensure it shows even if bookings request fails
  useEffect(() => {
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
        if (!token) return;
        const subsHistory = await api.subscriptions.history();
        const mappedSubs = (subsHistory || []).map((s: any) => ({
          id: s.code || s._id,
          kind: s.kind,
          startDate: new Date(s.startDate || Date.now()).toISOString().slice(0,10),
          nextRun: s.nextRun,
          pickupTime: s.pickupTime,
          runs: s.runs || [],
          monthKey: s.monthKey,
          createdBookingId: s.createdBookingId,
        }));
        setSubOrders(mappedSubs);
      } catch (_) {
        setSubOrders([]);
      }
    })();
  }, []);

  const totalOrders = orders.length;
  const totalSpent = orders.reduce((sum, order) => sum + (order.amount || 0), 0);
  // Calculate loyalty points: 1 point per ₹10 spent
  const earnedPoints = Math.floor(totalSpent / 10);
  // Calculate total used loyalty points
  const usedPoints = orders.reduce((sum, order) => sum + (order.loyaltyPointsUsed || 0), 0);
  // Available points = earned - used
  const loyaltyPoints = Math.max(0, earnedPoints - usedPoints);

  // Weekly pickup subscription modal state
  const [showWeeklyModal, setShowWeeklyModal] = useState(false);
  const [weeklyDow, setWeeklyDow] = useState<number>(0); // 0=Sun
  const [weeklyStart, setWeeklyStart] = useState<string>(new Date().toISOString().slice(0,10));
  const [subs, setSubs] = useState<any[]>([]);
  const [weeklyTime, setWeeklyTime] = useState<string>('09:00 AM - 12:00 PM');
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [dailyStart, setDailyStart] = useState<string>(new Date().toISOString().slice(0,10));
  const [dailyTime, setDailyTime] = useState<string>('09:00 AM - 12:00 PM');
  useEffect(() => {
    (async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('laundrybuddy_token') : null;
        if (!token) return;
        const mine = await api.subscriptions.mine();
        setSubs(mine || []);
      } catch (_) { setSubs([]); }
    })();
  }, []);
  const hasWeeklyThisMonth = subs.some(s => s.kind === 'weekly_pickup');
  const hasDailyThisMonth = subs.some(s => s.kind === 'daily_pickup');

  const getStatusColor = (status: string) => {
    switch (status) {
      case "delivered": return "bg-green-500";
      case "in-progress": return "bg-blue-500";
      case "cancelled": return "bg-red-500";
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

  const getWardrobiStatus = (status: string) => {
    return status === "at-home" 
      ? { label: "At Home", color: "bg-green-500" }
      : { label: "In Laundry", color: "bg-blue-500" };
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">
            My Account
          </h1>
          <p className="text-muted-foreground text-lg">
            Manage your profile, orders, and preferences
          </p>
        </div>

        {/* Account Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-slide-up">
          <Card className="shadow-soft">
            <CardContent className="p-6 text-center">
              <Package className="h-8 w-8 text-primary mx-auto mb-2" />
              <p className="text-2xl font-bold">{totalOrders}</p>
              <p className="text-muted-foreground">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-6 text-center">
              <Gift className="h-8 w-8 text-secondary mx-auto mb-2" />
              <p className="text-2xl font-bold text-primary">{loyaltyPoints}</p>
              <p className="text-muted-foreground mb-2">Available Loyalty Points</p>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Earned: {earnedPoints} pts</p>
                {usedPoints > 0 && <p>Used: {usedPoints} pts</p>}
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-soft">
            <CardContent className="p-6 text-center">
              <Star className="h-8 w-8 text-warning mx-auto mb-2" />
              <p className="text-2xl font-bold">₹{totalSpent}</p>
              <p className="text-muted-foreground">Total Spent</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="profile" className="animate-slide-up">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="wardrobe">Wardrobe</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Personal Information
                </CardTitle>
                <CardDescription>
                  Update your personal details and contact information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>User Name</Label>
                    <Input value={userInfo.username} readOnly className="mt-1 bg-gray-100" />
                  </div>
                  <div>
                    <Label>Phone Number</Label>
                    <Input value={userInfo.phone} readOnly className="mt-1 bg-gray-100" />
                  </div>
                </div>
                <div>
                  <Label>Email Address</Label>
                  <Input value={userInfo.email} readOnly className="mt-1 bg-gray-100" />
                </div>
                <div>
                  <Label>Account Type</Label>
                  <Input value={userInfo.userType} readOnly className="mt-1 bg-gray-100" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  Order History
                </CardTitle>
                <CardDescription>
                  View your past orders and their status
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                    
                    {orders.filter(order => paymentFilter === "all" || order.paymentStatus?.toLowerCase() === paymentFilter).map((order) => (
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
                            {order.time && <p className="text-sm text-muted-foreground">{order.time}</p>}
                            {order.items && order.items.length > 0 && (
                              <p className="text-xs text-muted-foreground"><strong>Items:</strong> {order.items.join(', ')}</p>
                            )}
                          </div>
                          <div className="space-x-2">
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(order.id)}>Copy ID</Button>
                            <Button size="sm" onClick={() => { sessionStorage.setItem('laundrybuddy_last_track_code', order.id); navigate('/track'); }}>View</Button>
                          </div>
                        </div>
                        {(order.pickupAddress || order.deliveryAddress || order.paymentStatus) && (
                          <div className="mt-2 text-xs text-muted-foreground">
                            {order.pickupAddress && <span><strong>Pickup:</strong> {order.pickupAddress} </span>}
                            {order.deliveryAddress && <span> • <strong>Delivery:</strong> {order.deliveryAddress} </span>}
                            {order.paymentStatus && <span> • <strong>Payment:</strong> <span className={getPaymentStatusColor(order.paymentStatus)}>{order.paymentStatus}</span></span>}
                          </div>
                        )}
                      </div>
                    ))}
                    {orders.filter(order => paymentFilter === "all" || order.paymentStatus?.toLowerCase() === paymentFilter).length === 0 && (
                      <div className="text-center text-muted-foreground py-8">
                        {paymentFilter === "all" ? "No normal orders yet" : `No ${paymentFilter} orders found`}
                      </div>
                    )}
                  </TabsContent>

                  {/* Weekly Orders Tab */}
                  <TabsContent value="weekly-orders" className="space-y-4">
                    {subOrders.filter(so => so.kind === 'weekly_pickup').map((so, idx) => (
                      <div key={idx} className="border border-primary/20 rounded-md p-3 bg-background/80">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">Weekly pickup • {so.monthKey}</p>
                            <p className="text-xs text-muted-foreground">Subscription ID: {so.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">active</Badge>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(so.createdBookingId || so.id)}>Copy ID</Button>
                            <Button size="sm" onClick={() => { if (so.createdBookingId) { sessionStorage.setItem('laundrybuddy_last_track_code', so.createdBookingId); navigate('/track'); } }}>View</Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Start:</strong> {so.startDate}</div>
                          {so.nextRun && (
                            <div><strong>Next pickup:</strong> {new Date(so.nextRun).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}{so.pickupTime ? `, ${so.pickupTime}` : ''}</div>
                          )}
                          {Array.isArray(so.runs) && so.runs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {so.runs.slice(0, 8).map((d: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded">{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {subOrders.filter(so => so.kind === 'weekly_pickup').length === 0 && (
                      <div className="text-center text-muted-foreground py-8">No weekly orders yet</div>
                    )}
                  </TabsContent>

                  {/* Daily Regular Orders Tab */}
                  <TabsContent value="daily-orders" className="space-y-4">
                    {subOrders.filter(so => so.kind !== 'weekly_pickup').map((so, idx) => (
                      <div key={idx} className="border border-primary/20 rounded-md p-3 bg-background/80">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-semibold">Daily pickup • {so.monthKey}</p>
                            <p className="text-xs text-muted-foreground">Subscription ID: {so.id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">active</Badge>
                            <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(so.createdBookingId || so.id)}>Copy ID</Button>
                            <Button size="sm" onClick={() => { if (so.createdBookingId) { sessionStorage.setItem('laundrybuddy_last_track_code', so.createdBookingId); navigate('/track'); } }}>View</Button>
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <div><strong>Start:</strong> {so.startDate}</div>
                          {so.nextRun && (
                            <div><strong>Next pickup:</strong> {new Date(so.nextRun).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' })}{so.pickupTime ? `, ${so.pickupTime}` : ''}</div>
                          )}
                          {Array.isArray(so.runs) && so.runs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {so.runs.slice(0, 8).map((d: string, i: number) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded">{new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {subOrders.filter(so => so.kind !== 'weekly_pickup').length === 0 && (
                      <div className="text-center text-muted-foreground py-8">No daily regular orders yet</div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Wardrobe Tab */}
          <TabsContent value="wardrobe" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5 text-primary" />
                  Digital Wardrobe
                </CardTitle>
                <CardDescription>
                  Track your clothes - what's at home vs. in laundry
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {digitalWardrobe.map((item, index) => {
                    const statusInfo = getWardrobiStatus(item.status);
                    return (
                      <div key={index} className="border rounded-lg p-4 hover:shadow-soft transition-shadow">
                        <div className="flex justify-between items-start mb-2">
                          <p className="font-semibold">{item.item}</p>
                          <Badge variant="secondary" className={statusInfo.color}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {item.status === "at-home" 
                            ? `Last washed: ${item.lastWashed}`
                            : `Picked up: ${item.pickupDate}`
                          }
                        </p>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="mt-6">
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Account Settings
                </CardTitle>
                <CardDescription>
                  Manage your preferences and subscription settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Notifications</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span>Order status updates</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Promotional offers</span>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span>SMS notifications</span>
                      <input type="checkbox" className="rounded" />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Recurring Orders</h3>
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 items-center">
                      <span className="justify-self-start">Weekly pickup (Sundays)</span>
                      <div className="justify-self-center">
                        {hasWeeklyThisMonth ? (<Badge>Active this month</Badge>) : null}
                      </div>
                      <div className="justify-self-end flex items-center space-x-2">
                        {hasWeeklyThisMonth && (() => {
                          const sub = subs.find(s => s.kind === 'weekly_pickup');
                          if (!sub) return null;
                          return (
                            <Button variant="destructive" size="sm" onClick={async () => {
                              if (!confirm('Cancel weekly pickup for this month?')) return;
                              try {
                                await api.subscriptions.delete(sub._id || sub.id);
                                const mine = await api.subscriptions.mine();
                                setSubs(mine || []);
                              } catch (e: any) {
                                alert(e?.message || 'Failed to cancel subscription');
                              }
                            }}>Cancel</Button>
                          );
                        })()}
                        <Button variant="outline" size="sm" onClick={() => setShowWeeklyModal(true)}>{hasWeeklyThisMonth ? 'Update' : 'Setup'}</Button>
                      </div>
                    </div>
                    {hasWeeklyThisMonth && (() => {
                      const sub = subs.find(s => s.kind === 'weekly_pickup');
                      if (!sub) return null;
                      const runs: string[] = (sub.runs || []).map((d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
                      const nextDate = sub.nextRun ? new Date(sub.nextRun).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
                      const next = [nextDate, (sub.pickupTime || '').trim()].filter(Boolean).join(', ');
                      return (
                      <div className="text-xs text-muted-foreground -mt-2 mb-2">
                        {sub.code && (
                          <div className="mb-1"><strong>Subscription ID:</strong> {sub.code}</div>
                        )}
                        <div><strong>Next pickup:</strong> {next || '—'}</div>
                          {runs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {runs.map((r, i) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded">{r}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="grid grid-cols-3 items-center">
                      <span className="justify-self-start">Regular clean (daily) [Monthly Subscription]</span>
                      <div className="justify-self-center">
                        {hasDailyThisMonth ? (<Badge>Active this month</Badge>) : null}
                      </div>
                      <div className="justify-self-end flex items-center space-x-2">
                        {hasDailyThisMonth && (() => {
                          const sub = subs.find(s => s.kind === 'daily_pickup');
                          if (!sub) return null;
                          return (
                            <Button variant="destructive" size="sm" onClick={async () => {
                              if (!confirm('Cancel daily subscription for this month?')) return;
                              try {
                                await api.subscriptions.delete(sub._id || sub.id);
                                const mine = await api.subscriptions.mine();
                                setSubs(mine || []);
                              } catch (e: any) {
                                alert(e?.message || 'Failed to cancel subscription');
                              }
                            }}>Cancel</Button>
                          );
                        })()}
                        <Button variant="outline" size="sm" onClick={() => setShowDailyModal(true)}>{hasDailyThisMonth ? 'Update' : 'Setup'}</Button>
                      </div>
                    </div>
                    {hasDailyThisMonth && (() => {
                      const sub = subs.find(s => s.kind === 'daily_pickup');
                      if (!sub) return null;
                      const runs: string[] = (sub.runs || []).map((d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }));
                      const nextDate = sub.nextRun ? new Date(sub.nextRun).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short' }) : '';
                      const next = [nextDate, (sub.pickupTime || '').trim()].filter(Boolean).join(', ');
                      return (
                        <div className="text-xs text-muted-foreground -mt-2 mb-2">
                          {sub.code && (
                            <div className="mb-1"><strong>Subscription ID:</strong> {sub.code}</div>
                          )}
                          <div><strong>Next pickup:</strong> {next || '—'}</div>
                          {runs.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {runs.slice(0, 5).map((r, i) => (
                                <span key={i} className="px-2 py-0.5 bg-muted rounded">{r}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button variant="destructive" className="w-full md:w-auto">
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {showWeeklyModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Weekly pickup subscription</h3>
              <div className="space-y-3">
                <div>
                  <Label>Pickup day</Label>
                  <select className="w-full h-10 rounded-md border px-3 text-sm" value={weeklyDow} onChange={(e) => setWeeklyDow(Number(e.target.value))}>
                    <option value={0}>Sunday</option>
                    <option value={1}>Monday</option>
                    <option value={2}>Tuesday</option>
                    <option value={3}>Wednesday</option>
                    <option value={4}>Thursday</option>
                    <option value={5}>Friday</option>
                    <option value={6}>Saturday</option>
                  </select>
                </div>
                <div>
                  <Label>Pickup time</Label>
                  <select className="w-full h-10 rounded-md border px-3 text-sm" value={weeklyTime} onChange={(e) => setWeeklyTime(e.target.value)}>
                    <option>09:00 AM - 12:00 PM</option>
                    <option>12:00 PM - 03:00 PM</option>
                    <option>03:00 PM - 06:00 PM</option>
                    <option>06:00 PM - 09:00 PM</option>
                  </select>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={weeklyStart} onChange={(e) => setWeeklyStart(e.target.value)} />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowWeeklyModal(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    await api.subscriptions.weeklyPickup({ dayOfWeek: weeklyDow, startDate: weeklyStart, pickupTime: weeklyTime });
                    const mine = await api.subscriptions.mine();
                    setSubs(mine || []);
                    setShowWeeklyModal(false);
                    alert('Subscription saved/updated for this month.');
                  } catch (e: any) {
                    alert(e?.message || 'Failed to save subscription');
                  }
                }}>Save</Button>
              </div>
            </div>
          </div>
        )}

        {showDailyModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md p-6">
              <h3 className="text-lg font-semibold mb-4">Daily pickup subscription</h3>
              <div className="space-y-3">
                <div>
                  <Label>Pickup time</Label>
                  <select className="w-full h-10 rounded-md border px-3 text-sm" value={dailyTime} onChange={(e) => setDailyTime(e.target.value)}>
                    <option>09:00 AM - 12:00 PM</option>
                    <option>12:00 PM - 03:00 PM</option>
                    <option>03:00 PM - 06:00 PM</option>
                    <option>06:00 PM - 09:00 PM</option>
                  </select>
                </div>
                <div>
                  <Label>Start date</Label>
                  <Input type="date" value={dailyStart} onChange={(e) => setDailyStart(e.target.value)} />
                </div>
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowDailyModal(false)}>Cancel</Button>
                <Button onClick={async () => {
                  try {
                    await api.subscriptions.dailyPickup({ startDate: dailyStart, pickupTime: dailyTime });
                    const mine = await api.subscriptions.mine();
                    setSubs(mine || []);
                    setShowDailyModal(false);
                    alert('Daily subscription saved/updated for this month.');
                  } catch (e: any) {
                    alert(e?.message || 'Failed to save subscription');
                  }
                }}>Save</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Account;