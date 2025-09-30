import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Search, 
  Package, 
  Shirt, 
  Droplets, 
  CheckCircle, 
  Truck, 
  MapPin,
  Clock,
  Phone
} from "lucide-react";
import { api } from "@/lib/api";

const orderStatuses = [
  { id: "accepted", label: "Order Accepted", icon: Package, completed: true },
  { id: "picked", label: "Picked Up", icon: Truck, completed: true },
  { id: "washing", label: "In Wash", icon: Droplets, completed: true },
  { id: "ready", label: "Ready", icon: Shirt, completed: false },
  { id: "delivery", label: "Out for Delivery", icon: Truck, completed: false },
  { id: "delivered", label: "Delivered", icon: CheckCircle, completed: false },
];

const mockOrders = [
  {
    id: "LND001234",
    service: "Wash & Iron",
    quantity: "3 kg",
    status: "washing",
    estimatedDelivery: "Tomorrow, 2:00 PM - 5:00 PM",
    pickupAddress: "123 Main Street, Apartment 4B",
    deliveryAddress: "123 Main Street, Apartment 4B",
    items: ["2 Shirts", "1 Jeans", "3 T-shirts", "2 Kurtas"],
    totalAmount: 240,
    paymentStatus: "paid",
    assignedStaff: {
      name: "Rajesh Kumar",
      phone: "+91 98765 43210",
      vehicle: "Bike - MH12AB1234"
    }
  }
];

const Track = () => {
  // Show last generated code if redirected from booking
  const lastTrackCode = typeof window !== 'undefined' ? sessionStorage.getItem("laundrybuddy_last_track_code") : null;
  const [showCode, setShowCode] = useState(!!lastTrackCode);
  const [copied, setCopied] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Helper to search for order in localStorage
  const searchOrder = async (id: string) => {
    setIsSearching(true);
    try {
      const order = await api.bookings.getById(id);
      // normalize items to display strings
      let itemsDisplay: string[] = [];
      if (Array.isArray(order.items)) {
        if (order.items.length && typeof order.items[0] === 'object') {
          itemsDisplay = order.items
            .filter((it: any) => (it?.quantity ?? 0) > 0)
            .map((it: any) => `${it.quantity} ${it.name}${Number(it.quantity) > 1 ? 's' : ''}`);
        } else {
          itemsDisplay = order.items as string[];
        }
      }
      const normalized = {
        ...order,
        items: itemsDisplay,
        paymentStatus: order.paymentStatus || 'pending',
        assignedStaff: order.assignedStaff || null,
      };
      setSearchedOrder(normalized);
    } catch (_) {
      // Fallback to demo order
      const fallback = mockOrders.find(o => o.id === id) || null;
      setSearchedOrder(fallback);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async () => {
    searchOrder(orderId);
  };

  // Auto-search last booking code when arriving from Book page
  useEffect(() => {
    if (lastTrackCode && !searchedOrder && !orderId) {
      setOrderId(lastTrackCode);
      searchOrder(lastTrackCode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProgressValue = (currentStatus: string) => {
    const currentIndex = orderStatuses.findIndex(s => s.id === currentStatus);
    return ((currentIndex + 1) / orderStatuses.length) * 100;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted": return "bg-blue-500";
      case "picked": return "bg-yellow-500";
      case "washing": return "bg-blue-600";
      case "ready": return "bg-green-500";
      case "delivery": return "bg-orange-500";
      case "delivered": return "bg-green-600";
      default: return "bg-gray-400";
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">
            Track Your Order
          </h1>
          <p className="text-muted-foreground text-lg">
            Enter your order ID to track the status of your laundry
          </p>
          {/* Tracking code display removed as requested */}
        </div>

        {/* Search Section */}
        <Card className="shadow-soft animate-slide-up mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-primary" />
              Search Order
            </CardTitle>
            <CardDescription>
              Enter your order ID to track your laundry status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  placeholder="e.g., LND001234"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={!orderId || isSearching}
                  className="h-10"
                >
                  {isSearching ? "Searching..." : "Track Order"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Details */}
        {isSearching && (
          <Card className="shadow-soft animate-slide-up">
            <CardContent className="text-center py-8">
              <div className="flex flex-col items-center gap-2">
                <span className="text-lg font-semibold text-primary">Searching for order...</span>
                <span className="text-muted-foreground text-sm">Please wait while we fetch your order status.</span>
              </div>
            </CardContent>
          </Card>
        )}
        {searchedOrder && !isSearching ? (
          <div className="space-y-6 animate-slide-up">
            {/* Order Status Progress */}
            <Card className="shadow-soft">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Order #{searchedOrder.id}</span>
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    {searchedOrder.service}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Quantity: {searchedOrder.quantity} • Amount: ₹{searchedOrder.totalAmount}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Order Progress</span>
                    <span className="text-sm text-muted-foreground">
                      {Math.round(getProgressValue(searchedOrder.status))}% Complete
                    </span>
                  </div>
                  <Progress value={getProgressValue(searchedOrder.status)} className="h-2" />
                </div>

                {/* Status Steps */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {orderStatuses.map((status, index) => {
                    const currentIndex = orderStatuses.findIndex(s => s.id === searchedOrder.status);
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;
                    
                    return (
                      <div key={status.id} className="flex flex-col items-center text-center">
                        <div
                          className={`p-3 rounded-full mb-2 transition-colors ${
                            isCompleted
                              ? getStatusColor(status.id)
                              : "bg-muted"
                          } ${isCurrent ? "ring-2 ring-primary ring-offset-2" : ""}`}
                        >
                          <status.icon
                            className={`h-5 w-5 ${
                              isCompleted ? "text-white" : "text-muted-foreground"
                            }`}
                          />
                        </div>
                        <span className={`text-xs font-medium ${
                          isCompleted ? "text-foreground" : "text-muted-foreground"
                        }`}>
                          {status.label}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Estimated Delivery */}
                <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="font-semibold text-primary">Estimated Delivery</span>
                  </div>
                  <p className="text-foreground">{searchedOrder.estimatedDelivery}</p>
                </div>
              </CardContent>
            </Card>

            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Items & Address */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Order Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">Items</h4>
                    <div className="space-y-1">
                      {searchedOrder.items.map((item: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Shirt className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Pickup Address</h4>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{searchedOrder.pickupAddress}</span>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Delivery Address</h4>
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="text-sm">{searchedOrder.deliveryAddress}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Staff & Contact */}
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>Assigned Staff</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {searchedOrder.assignedStaff && searchedOrder.assignedStaff.name ? (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-full">
                          <Truck className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {searchedOrder.assignedStaff.name}
                            {searchedOrder.assignedStaff.action && (
                              <Badge variant="secondary" className="uppercase">
                                {searchedOrder.assignedStaff.action}
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {searchedOrder.assignedStaff.vehicle}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full">
                        <Phone className="h-4 w-4 mr-2" />
                        Call {searchedOrder.assignedStaff.phone}
                      </Button>
                    </>
                  ) : (
                    <div className="text-sm text-muted-foreground">No staff assigned yet</div>
                  )}

                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold">Total Amount</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{searchedOrder.totalAmount}
                      </span>
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-sm text-muted-foreground">Payment Status</span>
                      <Badge variant={searchedOrder.paymentStatus === "paid" ? "default" : "secondary"}>
                        {searchedOrder.paymentStatus && searchedOrder.paymentStatus.toLowerCase() === "paid" ? "Paid" : "Pending"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : orderId && !isSearching ? (
          <Card className="shadow-soft animate-slide-up">
            <CardContent className="text-center py-8">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Order Not Found</p>
              <p className="text-muted-foreground">
                Please check your order ID and try again.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {/* Demo Button removed */}
      </div>
    </div>
  );
};

export default Track;