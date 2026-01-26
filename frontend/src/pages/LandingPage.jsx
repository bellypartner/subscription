import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useNavigate } from "react-router-dom";
import { Utensils, Truck, Calendar, MapPin, Clock, Leaf, ChefHat, Users } from "lucide-react";

export default function LandingPage() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Calendar,
      title: "Flexible Plans",
      description: "Weekly or monthly subscriptions with custom delivery days"
    },
    {
      icon: Leaf,
      title: "Diet Options",
      description: "Pure Veg, Mixed, or Non-Veg meals curated for your taste"
    },
    {
      icon: MapPin,
      title: "Live Tracking",
      description: "Track your meal delivery in real-time on the map"
    },
    {
      icon: Clock,
      title: "Pause Anytime",
      description: "Skip or pause deliveries for specific days easily"
    }
  ];

  const stats = [
    { value: "10K+", label: "Happy Customers" },
    { value: "50+", label: "Kitchens" },
    { value: "500+", label: "Daily Deliveries" },
    { value: "4.9", label: "Rating" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-4 z-50 mx-4 md:mx-8 rounded-2xl border border-white/20 bg-white/80 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold font-['Outfit'] text-foreground">FoodFleet</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/login")}
              className="rounded-full"
              data-testid="nav-login-btn"
            >
              Login
            </Button>
            <Button
              onClick={() => navigate("/signup")}
              className="rounded-full px-6 bg-primary hover:bg-primary/90"
              data-testid="nav-signup-btn"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-4 md:px-8 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-secondary/50 via-background to-background" />
        <div className="grain-overlay absolute inset-0" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Leaf className="w-4 h-4" />
                Fresh & Healthy Meals Daily
              </div>
              
              <h1 className="text-4xl md:text-6xl font-bold font-['Outfit'] tracking-tight text-foreground leading-tight">
                Your Personal
                <span className="text-primary block">Kitchen at Home</span>
              </h1>
              
              <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
                Subscribe to delicious, nutritious meals delivered fresh to your doorstep. 
                Choose your diet, set your schedule, track every delivery.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/signup")}
                  className="rounded-full px-8 py-6 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                  data-testid="hero-get-started-btn"
                >
                  Start Your Subscription
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/login")}
                  className="rounded-full px-8 py-6 hover:bg-accent/10 hover:text-accent transition-colors"
                  data-testid="hero-login-btn"
                >
                  View Menu
                </Button>
              </div>
            </div>
            
            <div className="relative animate-fade-in animate-delay-200">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.unsplash.com/photo-1747292718361-c838a9968ec7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwxfHxoZWFsdGh5JTIwZm9vZCUyMGJvd2wlMjBvdmVyaGVhZHxlbnwwfHx8fDE3Njk0NDI5Mzl8MA&ixlib=rb-4.1.0&q=85"
                  alt="Healthy food bowl"
                  className="w-full h-[500px] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
              
              {/* Floating cards */}
              <Card className="absolute -left-4 top-1/4 bg-white/95 backdrop-blur shadow-xl animate-fade-in animate-delay-300">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <ChefHat className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Chef Prepared</p>
                    <p className="text-sm text-muted-foreground">Fresh daily</p>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="absolute -right-4 bottom-1/4 bg-white/95 backdrop-blur shadow-xl animate-fade-in animate-delay-400">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Live Tracking</p>
                    <p className="text-sm text-muted-foreground">Real-time updates</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 px-4 md:px-8 bg-primary">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-4xl md:text-5xl font-bold font-['Outfit'] text-primary-foreground">
                  {stat.value}
                </p>
                <p className="text-primary-foreground/80 mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] text-foreground mb-4">
              Why Choose FoodFleet?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We make healthy eating simple, convenient, and delicious
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <Card
                key={i}
                className="bg-card rounded-2xl border border-border/40 shadow-sm p-6 hover:border-primary/20 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
              >
                <CardContent className="p-0 space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold font-['Outfit'] text-foreground">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 md:px-8 bg-secondary">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-['Outfit'] text-foreground mb-6">
            Ready to Eat Healthy?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of happy customers enjoying fresh, nutritious meals every day.
            Start your subscription today!
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/signup")}
            className="rounded-full px-10 py-6 bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            data-testid="cta-signup-btn"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 md:px-8 border-t">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Utensils className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold font-['Outfit'] text-foreground">FoodFleet</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2025 FoodFleet. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Users className="w-5 h-5 text-muted-foreground" />
            <span className="text-muted-foreground text-sm">Multi-city delivery network</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
