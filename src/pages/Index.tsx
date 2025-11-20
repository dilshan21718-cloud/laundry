import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shirt,
  Sparkles,
  Recycle,
  Clock,
  Star,
  CheckCircle,
  Truck,
  Shield,
  Zap,
  Leaf,
  Users,
  MapPin,
  Phone
} from "lucide-react";
import heroImage from "@/assets/hero-laundry.jpg";
import { api } from "@/lib/api";

const services = [
  {
    id: "wash-fold",
    name: "Wash & Fold",
    description: "Basic washing and folding service for everyday clothes",
    icon: Shirt,
    priceFrom: "₹15/piece",
    features: ["Same day service", "Eco-friendly detergent", "Careful handling"],
    popular: false
  },
  {
    id: "wash-iron",
    name: "Wash & Iron",
    description: "Complete washing and professional ironing service",
    icon: Sparkles,
    priceFrom: "₹25/piece",
    features: ["Professional ironing", "Steam finish", "Stain removal"],
    popular: true
  },
  {
    id: "dry-clean",
    name: "Dry Clean",
    description: "Professional dry cleaning for delicate fabrics",
    icon: Sparkles,
    priceFrom: "₹100/piece",
    features: ["Delicate fabric care", "Expert handling", "Quality guarantee"],
    popular: false
  },
  {
    id: "eco-wash",
    name: "Eco Wash",
    description: "Environmentally friendly washing with organic products",
    icon: Recycle,
    priceFrom: "₹20/piece",
    features: ["Organic detergents", "Water conservation", "Eco packaging"],
    popular: false
  }
];

const features = [
  {
    icon: Clock,
    title: "Fast Pickup & Delivery",
    description: "Schedule convenient pickup and delivery times that work for you"
  },
  {
    icon: Shield,
    title: "Quality Guarantee",
    description: "100% satisfaction guarantee with professional care for all garments"
  },
  {
    icon: Zap,
    title: "Real-time Tracking",
    description: "Track your order status from pickup to delivery in real-time"
  },
  {
    icon: Leaf,
    title: "Eco-Friendly Process",
    description: "Environmentally conscious cleaning with biodegradable products"
  }
];

const testimonials = [
  {
    name: "Sarah Johnson",
    rating: 5,
    comment: "Excellent service! My clothes came back perfectly clean and pressed.",
    service: "Wash & Iron"
  },
  {
    name: "Mike Chen",
    rating: 5,
    comment: "Very convenient pickup and delivery. Great quality and fair prices.",
    service: "Dry Clean"
  },
  {
    name: "Priya Sharma",
    rating: 5,
    comment: "Love the eco-friendly options. Professional service every time.",
    service: "Eco Wash"
  }
];

const Index = () => {
  const loggedInType = typeof window !== 'undefined' ? localStorage.getItem("laundrybuddy_loggedin_type") : null;
  const navigate = useNavigate();
  const [dynamicTestimonials, setDynamicTestimonials] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const feedback = await api.bookings.publicFeedback(6);
        if (Array.isArray(feedback)) {
          setDynamicTestimonials(
            feedback.map((f: any) => ({
              name: f.name || "Verified Customer",
              rating: f.rating || 5,
              comment: f.comment || "",
              service: f.service || "Laundry Service",
            }))
          );
        } else {
          setDynamicTestimonials([]);
        }
      } catch {
        setDynamicTestimonials([]);
      }
    })();
  }, []);

  const allTestimonials = [
    ...(dynamicTestimonials || []),
    ...testimonials,
  ];

  // Handler for protected actions
  const handleProtectedNav = (route) => {
    if (!loggedInType) {
      navigate("/login");
    } else {
      navigate(route);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 lg:py-32">
        <div className="absolute inset-0 hero-gradient opacity-95"></div>
        <div
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ backgroundImage: `url(${heroImage})` }}
        ></div>
        <div className="relative container mx-auto px-4 text-center text-white">
          <div className="animate-fade-in">
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              Smart Laundry
              <span className="block text-gradient-accent drop-shadow-lg">Made Simple</span>
            </h1>
            <p className="text-xl lg:text-2xl mb-8 text-white/90 max-w-3xl mx-auto">
              Professional laundry services with doorstep pickup and delivery.
              Track your clothes in real-time and enjoy hassle-free cleaning.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="hero"
                size="lg"
                className="text-lg px-8 py-4 shadow-accent"
                onClick={() => handleProtectedNav("/book")}
              >
                Book Service Now
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20 shadow-soft"
                onClick={() => handleProtectedNav("/track")}
              >
                Track Order
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-gradient-primary mb-4">
              Our Services
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Choose from our range of professional laundry services, each tailored to meet your specific needs
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-slide-up">
            {services.map((service) => (
              <Card
                key={service.id}
                className={`shadow-soft hover:shadow-medium transition-all duration-300 relative ${service.popular ? "border-primary shadow-medium" : ""
                  }`}
              >
                {service.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                    <service.icon className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{service.name}</CardTitle>
                  <CardDescription className="text-sm">
                    {service.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-2xl font-bold text-primary mb-4">
                    {service.priceFrom}
                  </p>
                  <ul className="space-y-2 mb-6">
                    {service.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant={service.popular ? "default" : "service"}
                    className="w-full"
                    onClick={() => handleProtectedNav("/book")}
                  >
                    Select Service
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-gradient-primary mb-4">
              Why Choose CleanWave?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              We combine modern technology with professional care to deliver exceptional laundry services
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-slide-up">
            {features.map((feature, index) => (
              <div key={index} className="text-center">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <feature.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-gradient-primary mb-4">
              How It Works
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Simple steps to get your laundry done professionally
            </p>
          </div>

          {/* Steps Row */}
          <div className="relative w-full flex flex-col gap-0 animate-slide-up">
            <div className="flex flex-row w-full justify-between items-center">
              {[
                { step: "1", title: "Book Online", description: "Schedule pickup through our app or website", icon: Shirt },
                { step: "2", title: "We Pickup", description: "Our team picks up your clothes at your doorstep", icon: Truck },
                { step: "3", title: "Professional Clean", description: "Expert cleaning with premium products", icon: Sparkles },
                { step: "4", title: "Doorstep Delivery", description: "Fresh, clean clothes delivered back to you", icon: CheckCircle }
              ].map((step, index, arr) => (
                <div key={index} className="flex flex-col items-center flex-1 min-w-[220px]">
                  <div className="p-4 rounded-full bg-primary w-16 h-16 flex items-center justify-center mb-4 text-white font-bold text-xl z-10">
                    {step.step}
                  </div>
                </div>
              ))}
            </div>
            {/* Single continuous line behind all circles */}
            <div className="hidden md:block absolute top-8 left-0 z-0 w-full h-0 pointer-events-none">
              <div className="absolute top-1/2 left-[8rem] right-[8rem] h-0.5 bg-primary/20 -translate-y-1/2"></div>
            </div>
            {/* Step Titles and Descriptions */}
            <div className="flex flex-row w-full justify-between items-start mt-2">
              {[
                { step: "1", title: "Book Online", description: "Schedule pickup through our app or website", icon: Shirt },
                { step: "2", title: "We Pickup", description: "Our team picks up your clothes at your doorstep", icon: Truck },
                { step: "3", title: "Professional Clean", description: "Expert cleaning with premium products", icon: Sparkles },
                { step: "4", title: "Doorstep Delivery", description: "Fresh, clean clothes delivered back to you", icon: CheckCircle }
              ].map((step, index) => (
                <div key={index} className="flex flex-col items-center flex-1 min-w-[220px]">
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-muted-foreground max-w-xs mx-auto">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl font-bold text-gradient-primary mb-4">
              What Our Customers Say
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Join thousands of satisfied customers who trust us with their laundry needs
            </p>
          </div>

          {/* Right-to-left scrolling testimonials */}
          <div className="relative overflow-hidden">
            <div className="testimonial-marquee animate-slide-up">
              {[...allTestimonials, ...allTestimonials].map((testimonial, index) => {
                const rating = Math.max(0, Math.min(5, Number(testimonial.rating) || 0));
                return (
                  <Card key={index} className="shadow-soft hover:shadow-medium transition-shadow min-w-[280px] md:min-w-[320px] mr-4">
                    <CardContent className="p-6">
                      <div className="flex items-center mb-4">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                      <p className="text-muted-foreground mb-4 italic">
                        "{testimonial.comment}"
                      </p>
                      <div>
                        <p className="font-semibold">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.service}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4 text-center text-white">
          <div className="animate-fade-in">
            <h2 className="text-4xl font-bold mb-4">
              Ready to Experience Professional Laundry Care?
            </h2>
            <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
              Book your first order today and discover the convenience of professional laundry services
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/book">
                <Button variant="hero" size="lg" className="text-lg px-8 py-4 bg-white text-primary hover:bg-white/90 shadow-accent">
                  <Shirt className="mr-2 h-5 w-5" />
                  Book Your Service
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="text-lg px-8 py-4 bg-white/10 border-white/30 text-white hover:bg-white/20">
                <Phone className="mr-2 h-5 w-5" />
                Call Us: +91 98765 43210
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="p-2 rounded-lg accent-gradient shadow-accent">
                  <Shirt className="h-6 w-6 text-white" />
                </div>
                <span className="text-xl font-bold text-gradient-accent">CleanWave</span>
              </div>
              <p className="text-muted-foreground mb-4">
                Professional laundry services with modern technology and exceptional care.
              </p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Mumbai, Delhi, Bangalore
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Services</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Wash & Fold</li>
                <li>Wash & Iron</li>
                <li>Dry Cleaning</li>
                <li>Eco Wash</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>About Us</li>
                <li>Contact</li>
                <li>Careers</li>
                <li>Privacy Policy</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Track Order</li>
                <li>Customer Support</li>
                <li>Terms of Service</li>
              </ul>
            </div>
          </div>

          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 CleanWave. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
