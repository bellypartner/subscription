import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { Utensils, User, Phone, Mail, MapPin, Lock, ArrowLeft, Navigation } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SignupPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cities, setCities] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
    address: "",
    city: "",
    google_location: null
  });

  useEffect(() => {
    fetchCities();
  }, []);

  useEffect(() => {
    if (formData.city) {
      fetchKitchens(formData.city);
    }
  }, [formData.city]);

  const fetchCities = async () => {
    try {
      const response = await fetch(`${API}/cities`);
      if (response.ok) {
        const data = await response.json();
        setCities(data);
      }
    } catch (err) {
      console.error("Failed to fetch cities");
    }
  };

  const fetchKitchens = async (city) => {
    try {
      const response = await fetch(`${API}/kitchens?city=${city}`);
      if (response.ok) {
        const data = await response.json();
        setKitchens(data);
      }
    } catch (err) {
      console.error("Failed to fetch kitchens");
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData({
            ...formData,
            google_location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
          toast.success("Location captured successfully!");
        },
        (error) => {
          toast.error("Failed to get location. Please enable location access.");
        }
      );
    } else {
      toast.error("Geolocation is not supported by this browser.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API}/auth/phone-signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          role: "customer"
        }),
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Signup failed");
      }

      const user = await response.json();
      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  const handleGoogleSignup = () => {
    const redirectUrl = window.location.origin + "/dashboard";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/90 to-primary" />
        <img
          src="https://images.unsplash.com/photo-1750943082012-efe6d2fd9e45?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDR8MHwxfHNlYXJjaHwzfHxjaGVmJTIwcGxhdGluZyUyMGZvb2R8ZW58MHx8fHwxNzY5NDQyOTQ0fDA&ixlib=rb-4.1.0&q=85"
          alt="Chef plating food"
          className="w-full h-full object-cover mix-blend-overlay"
        />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white">
            <h2 className="text-4xl font-bold font-['Outfit'] mb-4">Join FoodFleet</h2>
            <p className="text-xl opacity-90 max-w-md">
              Start your healthy eating journey today. Subscribe to fresh, chef-prepared meals.
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors"
            data-testid="back-to-home-link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          <Card className="border-0 shadow-none">
            <CardHeader className="px-0">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                  <Utensils className="w-6 h-6 text-primary-foreground" />
                </div>
                <span className="text-2xl font-bold font-['Outfit']">FoodFleet</span>
              </div>
              <CardTitle className="text-2xl font-['Outfit']">Create Account</CardTitle>
              <CardDescription>
                Sign up to start your meal subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0 space-y-6">
              {/* Google Signup */}
              <Button
                variant="outline"
                className="w-full py-6 rounded-xl hover:bg-muted transition-colors"
                onClick={handleGoogleSignup}
                data-testid="google-signup-btn"
              >
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-background text-muted-foreground">or sign up with phone</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <div className="relative">
                    <Input
                      id="name"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      className="rounded-xl py-5 pl-10"
                      required
                      data-testid="name-input"
                    />
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+91 9876543210"
                      value={formData.phone}
                      onChange={handleChange}
                      className="rounded-xl py-5 pl-10"
                      required
                      data-testid="phone-input"
                    />
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email (Optional)</Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      className="rounded-xl py-5 pl-10"
                      data-testid="email-input"
                    />
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Create a password"
                      value={formData.password}
                      onChange={handleChange}
                      className="rounded-xl py-5 pl-10"
                      required
                      data-testid="password-input"
                    />
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData({ ...formData, city: value })}
                  >
                    <SelectTrigger className="rounded-xl py-5" data-testid="city-select">
                      <SelectValue placeholder="Select your city" />
                    </SelectTrigger>
                    <SelectContent>
                      {cities.length > 0 ? (
                        cities.map((city) => (
                          <SelectItem key={city} value={city}>{city}</SelectItem>
                        ))
                      ) : (
                        <>
                          <SelectItem value="Mumbai">Mumbai</SelectItem>
                          <SelectItem value="Delhi">Delhi</SelectItem>
                          <SelectItem value="Bangalore">Bangalore</SelectItem>
                          <SelectItem value="Chennai">Chennai</SelectItem>
                          <SelectItem value="Hyderabad">Hyderabad</SelectItem>
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address</Label>
                  <div className="relative">
                    <Textarea
                      id="address"
                      name="address"
                      placeholder="Enter your full delivery address"
                      value={formData.address}
                      onChange={handleChange}
                      className="rounded-xl pl-10 min-h-[80px]"
                      required
                      data-testid="address-input"
                    />
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-5 rounded-xl"
                  onClick={handleGetLocation}
                  data-testid="get-location-btn"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {formData.google_location ? "Location Captured ✓" : "Get Current Location"}
                </Button>

                <Button
                  type="submit"
                  className="w-full py-6 rounded-xl bg-primary hover:bg-primary/90"
                  disabled={loading}
                  data-testid="signup-submit-btn"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </form>

              <p className="text-center text-muted-foreground">
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="text-primary hover:underline font-medium"
                  data-testid="login-link"
                >
                  Sign in
                </Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
