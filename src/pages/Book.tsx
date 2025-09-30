import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Shirt, Sparkles, Recycle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const services = [
  {
    id: "wash-fold",
    name: "Wash & Fold",
    description: "Basic washing and folding service",
    icon: Shirt,
    pricePerKg: 50,
    pricePerPiece: 15,
  },
  {
    id: "wash-iron",
    name: "Wash & Iron",
    description: "Complete washing and ironing service",
    icon: Sparkles,
    pricePerKg: 80,
    pricePerPiece: 25,
  },
  {
    id: "dry-clean",
    name: "Dry Clean",
    description: "Professional dry cleaning service",
    icon: Sparkles,
    pricePerKg: 150,
    pricePerPiece: 100,
  },
  {
    id: "eco-wash",
    name: "Eco Wash",
    description: "Environmentally friendly washing",
    icon: Recycle,
    pricePerKg: 70,
    pricePerPiece: 20,
  },
];

// Per-piece pricing table per service
const perPiecePricing: Record<string, { name: string; key: keyof PieceItems; prices: Record<string, number> }[]> = {
  'wash-fold': [
    { name: 'Shirt', key: 'shirt', prices: { 'wash-fold': 20, 'wash-iron': 30, 'dry-clean': 120, 'eco-wash': 18 } },
    { name: 'Pant', key: 'pant', prices: { 'wash-fold': 20, 'wash-iron': 30, 'dry-clean': 130, 'eco-wash': 18 } },
    { name: 'T-Shirt', key: 'tshirt', prices: { 'wash-fold': 15, 'wash-iron': 25, 'dry-clean': 110, 'eco-wash': 14 } },
    { name: 'Lower', key: 'lower', prices: { 'wash-fold': 18, 'wash-iron': 28, 'dry-clean': 120, 'eco-wash': 16 } },
    { name: 'Innerwear', key: 'innerwear', prices: { 'wash-fold': 8, 'wash-iron': 12, 'dry-clean': 50, 'eco-wash': 7 } },
    { name: 'Others', key: 'others', prices: { 'wash-fold': 20, 'wash-iron': 30, 'dry-clean': 120, 'eco-wash': 18 } },
  ],
  'wash-iron': [], // will fallback to using keys above with service id
  'dry-clean': [],
  'eco-wash': [],
};

type PieceItems = {
  shirt: number;
  pant: number;
  tshirt: number;
  lower: number;
  innerwear: number;
  others: number;
};

// Per-kg pricing table per service (can differ from per-piece)
const perKgPricing: Record<string, { name: string; key: keyof PieceItems; prices: Record<string, number> }[]> = {
  'wash-fold': [
    { name: 'Shirt', key: 'shirt', prices: { 'wash-fold': 60, 'wash-iron': 90, 'dry-clean': 0, 'eco-wash': 55 } },
    { name: 'Pant', key: 'pant', prices: { 'wash-fold': 60, 'wash-iron': 90, 'dry-clean': 0, 'eco-wash': 55 } },
    { name: 'T-Shirt', key: 'tshirt', prices: { 'wash-fold': 50, 'wash-iron': 80, 'dry-clean': 0, 'eco-wash': 45 } },
    { name: 'Lower', key: 'lower', prices: { 'wash-fold': 55, 'wash-iron': 85, 'dry-clean': 0, 'eco-wash': 50 } },
    { name: 'Innerwear', key: 'innerwear', prices: { 'wash-fold': 40, 'wash-iron': 60, 'dry-clean': 0, 'eco-wash': 38 } },
    { name: 'Others', key: 'others', prices: { 'wash-fold': 60, 'wash-iron': 90, 'dry-clean': 0, 'eco-wash': 55 } },
  ],
  'wash-iron': [],
  'dry-clean': [],
  'eco-wash': [],
};

const timeSlots = [
  "9:00 AM - 12:00 PM",
  "12:00 PM - 3:00 PM",
  "3:00 PM - 6:00 PM",
  "6:00 PM - 9:00 PM",
];

const Book = () => {
  // Get logged-in username from localStorage
  let username = "";
  const loggedInType = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_loggedin_type") : null;
  const usersStr = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_users") : null;
  if (usersStr && loggedInType) {
    try {
      const users = JSON.parse(usersStr);
      const user = users.find(u => u.userType === loggedInType);
      if (user) username = user.username;
    } catch {}
  }
  const [selectedService, setSelectedService] = useState("");
  const [pricingType, setPricingType] = useState("kg");
  const [quantity, setQuantity] = useState(1);
  const [kgCounts, setKgCounts] = useState<PieceItems>({ shirt: 0, pant: 0, tshirt: 0, lower: 0, innerwear: 0, others: 0 });
  const [totalKg, setTotalKg] = useState<number>(1);
  const [pieces, setPieces] = useState<PieceItems>({ shirt: 0, pant: 0, tshirt: 0, lower: 0, innerwear: 0, others: 0 });
  const [pickupDate, setPickupDate] = useState<Date>();
  const [deliveryDate, setDeliveryDate] = useState<Date>();
  const [pickupTime, setPickupTime] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [address, setAddress] = useState("");
  const [instructions, setInstructions] = useState("");
  const [donationPickup, setDonationPickup] = useState(false);
  const [trackCode, setTrackCode] = useState("");
  // Generate a new code on every page load
  function generateRandomCode(length = 12) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'LB';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  useEffect(() => {
    setTrackCode(generateRandomCode(12));
  }, []);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  const itemDefs = perPiecePricing['wash-fold'];
  const getUnitPrice = (key: keyof PieceItems) => {
    const def = itemDefs.find(d => d.key === key);
    if (!def) return 0;
    return def.prices[selectedService] ?? def.prices['wash-fold'] ?? 0;
  };
  const kgDefs = perKgPricing['wash-fold']; // retained for future use if needed
  const getKgUnitPrice = (_key: keyof PieceItems) => {
    // Not used now since Option A uses a single total kg price; keep for potential future
    const service = services.find(s => s.id === selectedService);
    return service?.pricePerKg ?? 0;
  };

  const sumPieces = () => Object.values(pieces).reduce((a, b) => a + (Number(b) || 0), 0);
  const sumKg = () => totalKg;

  const calculatePrice = () => {
    const service = services.find(s => s.id === selectedService);
    if (!service) return 0;
    if (pricingType === "kg") {
      // Pricing by weight: totalKg * service.pricePerKg
      return (service.pricePerKg || 0) * totalKg;
    }
    // pcs pricing: sum of per-item
    return (
      (pieces.shirt || 0) * getUnitPrice('shirt') +
      (pieces.pant || 0) * getUnitPrice('pant') +
      (pieces.tshirt || 0) * getUnitPrice('tshirt') +
      (pieces.lower || 0) * getUnitPrice('lower') +
      (pieces.innerwear || 0) * getUnitPrice('innerwear') +
      (pieces.others || 0) * getUnitPrice('others')
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCopied(false);
    sessionStorage.setItem("laundrybuddy_last_track_code", trackCode);
    const booking = {
      id: trackCode,
      service: services.find(s => s.id === selectedService)?.name || "",
      quantity: `${pricingType === "kg" ? sumKg() + ' kg' : sumPieces() + ' pcs'}`,
      pricingType: pricingType === 'kg' ? 'kg' : 'pcs',
      status: "accepted",
      estimatedDelivery: deliveryDate ? `${format(deliveryDate, "PPP")}, ${deliveryTime}` : "",
      pickupTime,
      deliveryTime,
      pickupAddress: address,
      deliveryAddress: address,
      items: (
        pricingType === 'kg'
          ? [
              { name: 'Shirt', quantity: kgCounts.shirt, unitPrice: 0, amount: 0 },
              { name: 'Pant', quantity: kgCounts.pant, unitPrice: 0, amount: 0 },
              { name: 'T-Shirt', quantity: kgCounts.tshirt, unitPrice: 0, amount: 0 },
              { name: 'Lower', quantity: kgCounts.lower, unitPrice: 0, amount: 0 },
              { name: 'Innerwear', quantity: kgCounts.innerwear, unitPrice: 0, amount: 0 },
              { name: 'Others', quantity: kgCounts.others, unitPrice: 0, amount: 0 },
            ].filter(i => i.quantity > 0)
          : [
              { name: 'Shirt', quantity: pieces.shirt, unitPrice: getUnitPrice('shirt'), amount: (pieces.shirt || 0) * getUnitPrice('shirt') },
              { name: 'Pant', quantity: pieces.pant, unitPrice: getUnitPrice('pant'), amount: (pieces.pant || 0) * getUnitPrice('pant') },
              { name: 'T-Shirt', quantity: pieces.tshirt, unitPrice: getUnitPrice('tshirt'), amount: (pieces.tshirt || 0) * getUnitPrice('tshirt') },
              { name: 'Lower', quantity: pieces.lower, unitPrice: getUnitPrice('lower'), amount: (pieces.lower || 0) * getUnitPrice('lower') },
              { name: 'Innerwear', quantity: pieces.innerwear, unitPrice: getUnitPrice('innerwear'), amount: (pieces.innerwear || 0) * getUnitPrice('innerwear') },
              { name: 'Others', quantity: pieces.others, unitPrice: getUnitPrice('others'), amount: (pieces.others || 0) * getUnitPrice('others') },
            ].filter(i => i.quantity > 0)
      ),
      totalAmount: calculatePrice(),
      paymentStatus: "pending",
      instructions,
      donationPickup,
      assignedStaff: {
        name: "Laundry Staff",
        phone: "",
        vehicle: ""
      }
    } as any;
    try {
      await api.bookings.create(booking);
      navigate("/track");
    } catch (err: any) {
      const message = String(err?.message || "Failed to create booking");
      if (message.toLowerCase().includes('unauthorized') || message.toLowerCase().includes('token')) {
        alert('Please login to book a service.');
        navigate('/login');
        return;
      }
      alert(message);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl font-bold text-gradient-primary mb-4">
            Book Your Laundry Service
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose your service, schedule pickup, and we'll take care of the rest
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* ...removed tracking code display as per user request... */}
          {/* Greeting Note */}
          <div className="mb-4 text-2xl font-extrabold text-primary">
            Hello!! {username}
          </div>
          {/* Service Selection */}
          <Card className="shadow-soft animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shirt className="h-5 w-5 text-primary" />
                Select Service
              </CardTitle>
              <CardDescription>
                Choose the laundry service that best fits your needs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((service) => (
                  <Card
                    key={service.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:shadow-medium",
                      selectedService === service.id
                        ? "border-primary bg-primary/5 shadow-medium"
                        : "hover:border-primary/50"
                    )}
                    onClick={() => setSelectedService(service.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <service.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold">{service.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            {service.description}
                          </p>
                          <div className="text-sm">
                            <p>₹{service.pricePerKg}/kg • ₹{service.pricePerPiece}/piece</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quantity and Pricing */}
          {selectedService && (
            <Card className="shadow-soft animate-slide-up">
              <CardHeader>
                <CardTitle>Quantity & Pricing</CardTitle>
                <CardDescription>
                  Choose how you'd like to price your order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={pricingType === "kg" ? "default" : "outline"}
                    onClick={() => setPricingType("kg")}
                  >
                    Price by Weight (kg)
                  </Button>
                  <Button
                    type="button"
                    variant={pricingType === "pcs" ? "default" : "outline"}
                    onClick={() => setPricingType("pcs")}
                  >
                    Price by Pieces
                  </Button>
                </div>
                
                {pricingType === 'kg' ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(['shirt','pant','tshirt','lower','innerwear','others'] as (keyof PieceItems)[]).map((key) => (
                        <div key={key} className="space-y-1">
                          <Label className="flex justify-between">
                            <span className="capitalize">{key} (count)</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={Number(kgCounts[key])}
                            onChange={(e) => setKgCounts({ ...kgCounts, [key]: Number(e.target.value) })}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 items-end">
                      <div>
                        <Label>Total Kilograms</Label>
                        <Input type="number" min="0.1" step="0.1" value={totalKg} onChange={(e) => setTotalKg(Number(e.target.value))} />
                        <p className="text-xs text-muted-foreground mt-1">Billed at ₹{services.find(s=>s.id===selectedService)?.pricePerKg}/kg</p>
                      </div>
                      <div className="flex items-end justify-end">
                        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-sm text-muted-foreground">Estimated Price</p>
                          <p className="text-2xl font-bold text-primary">₹{calculatePrice()}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {(['shirt','pant','tshirt','lower','innerwear','others'] as (keyof PieceItems)[]).map((key) => (
                        <div key={key} className="space-y-1">
                          <Label className="flex justify-between">
                            <span className="capitalize">{key}</span>
                            <span className="text-xs text-muted-foreground">₹{getUnitPrice(key)}/pc</span>
                          </Label>
                          <Input
                            type="number"
                            min="0"
                            value={Number(pieces[key])}
                            onChange={(e) => setPieces({ ...pieces, [key]: Number(e.target.value) })}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-end justify-end">
                      <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                        <p className="text-sm text-muted-foreground">Estimated Price</p>
                        <p className="text-2xl font-bold text-primary">₹{calculatePrice()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Schedule Pickup & Delivery */}
          <Card className="shadow-soft animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Schedule Pickup & Delivery
              </CardTitle>
              <CardDescription>
                Choose convenient times for pickup and delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Pickup */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Pickup</h3>
                  <div>
                    <Label>Pickup Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !pickupDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pickupDate ? format(pickupDate, "PPP") : "Select pickup date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={setPickupDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Pickup Time</Label>
                    <Select value={pickupTime} onValueChange={setPickupTime}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select pickup time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Delivery */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Delivery</h3>
                  <div>
                    <Label>Delivery Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal mt-1",
                            !deliveryDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {deliveryDate ? format(deliveryDate, "PPP") : "Select delivery date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={deliveryDate}
                          onSelect={setDeliveryDate}
                          disabled={(date) => date < new Date() || (pickupDate && date <= pickupDate)}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div>
                    <Label>Delivery Time</Label>
                    <Select value={deliveryTime} onValueChange={setDeliveryTime}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select delivery time" />
                      </SelectTrigger>
                      <SelectContent>
                        {timeSlots.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address & Instructions */}
          <Card className="shadow-soft animate-slide-up">
            <CardHeader>
              <CardTitle>Address & Instructions</CardTitle>
              <CardDescription>
                Provide pickup/delivery address and any special instructions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="address">Pickup & Delivery Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter your complete address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="instructions">Special Instructions (Optional)</Label>
                <Textarea
                  id="instructions"
                  placeholder="Any special care instructions, fabric preferences, etc."
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="donation"
                  checked={donationPickup}
                  onChange={(e) => setDonationPickup(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="donation">
                  I have old clothes to donate (we'll pick them up for free)
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button
              type="submit"
              variant="hero"
              size="lg"
              className="px-8 animate-bounce-gentle"
              disabled={!selectedService || !pickupDate || !deliveryDate || !address}
            >
              Book Service - ₹{calculatePrice()}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Book;