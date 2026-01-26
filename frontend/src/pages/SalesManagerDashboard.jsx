import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  Users, LogOut, Plus, Search, Phone, Mail, MapPin,
  Calendar, Utensils, Leaf, Flame, Navigation
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SalesManagerDashboard({ user }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    google_location: null,
    password: "welcome123"
  });

  const [newSubscription, setNewSubscription] = useState({
    kitchen_id: "",
    plan_type: "monthly",
    diet_type: "pure_veg",
    meals: ["breakfast", "lunch", "dinner"],
    delivery_days: ["daily"],
    custom_days: [],
    start_date: format(new Date(), "yyyy-MM-dd")
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, kitchensRes] = await Promise.all([
        fetch(`${API}/users?role=customer`, { credentials: "include" }),
        fetch(`${API}/kitchens`, { credentials: "include" })
      ]);

      if (customersRes.ok) setCustomers(await customersRes.json());
      if (kitchensRes.ok) setKitchens(await kitchensRes.json());
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(`${API}/auth/logout`, { method: "POST", credentials: "include" });
    navigate("/login");
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewCustomer({
            ...newCustomer,
            google_location: {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            }
          });
          toast.success("Location captured!");
        },
        () => toast.error("Failed to get location")
      );
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newCustomer, role: "customer" }),
        credentials: "include"
      });

      if (response.ok) {
        const customer = await response.json();
        toast.success("Customer added successfully!");
        setShowAddCustomer(false);
        setSelectedCustomer(customer);
        setShowAddSubscription(true);
        fetchData();
        setNewCustomer({
          name: "",
          phone: "",
          email: "",
          address: "",
          city: "",
          google_location: null,
          password: "welcome123"
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const response = await fetch(`${API}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSubscription,
          user_id: selectedCustomer.user_id,
          start_date: new Date(newSubscription.start_date).toISOString()
        }),
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Subscription created successfully!");
        setShowAddSubscription(false);
        setSelectedCustomer(null);
        setNewSubscription({
          kitchen_id: "",
          plan_type: "monthly",
          diet_type: "pure_veg",
          meals: ["breakfast", "lunch", "dinner"],
          delivery_days: ["daily"],
          custom_days: [],
          start_date: format(new Date(), "yyyy-MM-dd")
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleMeal = (meal) => {
    const meals = newSubscription.meals.includes(meal)
      ? newSubscription.meals.filter(m => m !== meal)
      : [...newSubscription.meals, meal];
    setNewSubscription({ ...newSubscription, meals });
  };

  const toggleDay = (day) => {
    const days = newSubscription.custom_days.includes(day)
      ? newSubscription.custom_days.filter(d => d !== day)
      : [...newSubscription.custom_days, day];
    setNewSubscription({ ...newSubscription, custom_days: days, delivery_days: ["custom"] });
  };

  const filteredCustomers = customers.filter(c =>
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getDietIcon = (dietType) => {
    if (dietType === "pure_veg") return <Leaf className="w-4 h-4 text-green-600" />;
    if (dietType === "non_veg") return <Flame className="w-4 h-4 text-red-600" />;
    return <Utensils className="w-4 h-4 text-orange-600" />;
  };

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="sales-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Users className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">Sales Manager</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{customers.length}</p>
              <p className="text-sm text-muted-foreground">Total Customers</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">
                {customers.filter(c => c.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-600">{kitchens.length}</p>
              <p className="text-sm text-muted-foreground">Kitchens</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-accent">
                {new Set(kitchens.map(k => k.city)).size}
              </p>
              <p className="text-sm text-muted-foreground">Cities</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Add */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="search-input"
            />
          </div>
          
          <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
            <DialogTrigger asChild>
              <Button className="rounded-full" data-testid="add-customer-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-['Outfit']">Add New Customer</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleAddCustomer} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    value={newCustomer.name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    required
                    data-testid="customer-name-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    required
                    data-testid="customer-phone-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                    data-testid="customer-email-input"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Select
                    value={newCustomer.city}
                    onValueChange={(value) => setNewCustomer({ ...newCustomer, city: value })}
                  >
                    <SelectTrigger data-testid="customer-city-select">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...new Set(kitchens.map(k => k.city))].map((city) => (
                        <SelectItem key={city} value={city}>{city}</SelectItem>
                      ))}
                      <SelectItem value="Mumbai">Mumbai</SelectItem>
                      <SelectItem value="Delhi">Delhi</SelectItem>
                      <SelectItem value="Bangalore">Bangalore</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    value={newCustomer.address}
                    onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                    required
                    data-testid="customer-address-input"
                  />
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGetLocation}
                  data-testid="get-location-btn"
                >
                  <Navigation className="w-4 h-4 mr-2" />
                  {newCustomer.google_location ? "Location Captured ✓" : "Get GPS Location"}
                </Button>
                
                <Button type="submit" className="w-full" data-testid="submit-customer-btn">
                  Add Customer & Create Subscription
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subscription Dialog */}
        <Dialog open={showAddSubscription} onOpenChange={setShowAddSubscription}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-['Outfit']">
                Create Subscription for {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddSubscription} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Kitchen *</Label>
                <Select
                  value={newSubscription.kitchen_id}
                  onValueChange={(value) => setNewSubscription({ ...newSubscription, kitchen_id: value })}
                >
                  <SelectTrigger data-testid="subscription-kitchen-select">
                    <SelectValue placeholder="Select kitchen" />
                  </SelectTrigger>
                  <SelectContent>
                    {kitchens
                      .filter(k => !selectedCustomer?.city || k.city === selectedCustomer?.city)
                      .map((kitchen) => (
                        <SelectItem key={kitchen.kitchen_id} value={kitchen.kitchen_id}>
                          {kitchen.name} ({kitchen.city})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Plan Type *</Label>
                <Select
                  value={newSubscription.plan_type}
                  onValueChange={(value) => setNewSubscription({ ...newSubscription, plan_type: value })}
                >
                  <SelectTrigger data-testid="subscription-plan-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly (24 deliveries / 30 days)</SelectItem>
                    <SelectItem value="weekly">Weekly (6 deliveries / 7 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Diet Type *</Label>
                <div className="flex gap-2">
                  {[
                    { value: "pure_veg", label: "Pure Veg", icon: Leaf, color: "text-green-600" },
                    { value: "mixed", label: "Mixed", icon: Utensils, color: "text-orange-600" },
                    { value: "non_veg", label: "Non-Veg", icon: Flame, color: "text-red-600" }
                  ].map((diet) => (
                    <Button
                      key={diet.value}
                      type="button"
                      variant={newSubscription.diet_type === diet.value ? "default" : "outline"}
                      className="flex-1"
                      onClick={() => setNewSubscription({ ...newSubscription, diet_type: diet.value })}
                      data-testid={`diet-${diet.value}`}
                    >
                      <diet.icon className={`w-4 h-4 mr-1 ${newSubscription.diet_type === diet.value ? "" : diet.color}`} />
                      {diet.label}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Meals *</Label>
                <div className="flex gap-2">
                  {["breakfast", "lunch", "dinner"].map((meal) => (
                    <Button
                      key={meal}
                      type="button"
                      variant={newSubscription.meals.includes(meal) ? "default" : "outline"}
                      className="flex-1 capitalize"
                      onClick={() => toggleMeal(meal)}
                      data-testid={`meal-${meal}`}
                    >
                      {meal}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Delivery Schedule *</Label>
                <Select
                  value={newSubscription.delivery_days[0]}
                  onValueChange={(value) => {
                    if (value === "custom") {
                      setNewSubscription({ ...newSubscription, delivery_days: ["custom"] });
                    } else {
                      setNewSubscription({ ...newSubscription, delivery_days: [value], custom_days: [] });
                    }
                  }}
                >
                  <SelectTrigger data-testid="delivery-schedule-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (Mon-Sat)</SelectItem>
                    <SelectItem value="alternate">Alternate Days</SelectItem>
                    <SelectItem value="custom">Custom Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newSubscription.delivery_days[0] === "custom" && (
                <div className="space-y-2">
                  <Label>Select Days</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {weekDays.map((day) => (
                      <Button
                        key={day}
                        type="button"
                        variant={newSubscription.custom_days.includes(day) ? "default" : "outline"}
                        size="sm"
                        className="capitalize"
                        onClick={() => toggleDay(day)}
                        data-testid={`day-${day}`}
                      >
                        {day.slice(0, 3)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label>Start Date *</Label>
                <Input
                  type="date"
                  value={newSubscription.start_date}
                  onChange={(e) => setNewSubscription({ ...newSubscription, start_date: e.target.value })}
                  min={format(new Date(), "yyyy-MM-dd")}
                  data-testid="start-date-input"
                />
              </div>
              
              <Button type="submit" className="w-full" data-testid="submit-subscription-btn">
                Create Subscription
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Customer List */}
        <Card>
          <CardHeader>
            <CardTitle className="font-['Outfit']">Customers ({filteredCustomers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-3">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.user_id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => {
                      setSelectedCustomer(customer);
                      setShowAddSubscription(true);
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-semibold">{customer.name}</p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {customer.phone && (
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {customer.phone}
                              </span>
                            )}
                            {customer.email && (
                              <span className="flex items-center gap-1">
                                <Mail className="w-3 h-3" />
                                {customer.email}
                              </span>
                            )}
                          </div>
                          {customer.address && (
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {customer.address}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant={customer.is_active ? "default" : "secondary"}>
                            {customer.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {customer.city && (
                            <Badge variant="outline">{customer.city}</Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                
                {filteredCustomers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No customers found</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
