import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Textarea } from "../components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  Users, LogOut, Plus, Search, Phone, Mail, MapPin,
  Calendar, Utensils, Leaf, Flame, Navigation, AlertCircle, Clock
} from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SalesManagerDashboard({ user }) {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [plans, setPlans] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");
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
    kitchen_id: "",
    google_location: null,
    password: "welcome123"
  });

  const [newSubscription, setNewSubscription] = useState({
    kitchen_id: "",
    plan_id: "",
    plan_type: "monthly",
    diet_type: "veg",
    meal_periods: ["lunch"],
    delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    start_date: format(new Date(), "yyyy-MM-dd"),
    total_deliveries: 24,
    remaining_deliveries: 24,
    amount_paid: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, subsRes, kitchensRes, plansRes] = await Promise.all([
        fetch(`${API}/users?role=customer`, { credentials: "include" }),
        fetch(`${API}/subscriptions`, { credentials: "include" }),
        fetch(`${API}/kitchens`, { credentials: "include" }),
        fetch(`${API}/plans`, { credentials: "include" })
      ]);

      if (customersRes.ok) setCustomers(await customersRes.json());
      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (kitchensRes.ok) setKitchens(await kitchensRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
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
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    toast.info("Getting location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setNewCustomer({
          ...newCustomer,
          google_location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        });
        toast.success("Location captured successfully!");
      },
      (error) => {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please enable location in browser settings.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable. Please enter coordinates manually.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out. Try again.");
            break;
          default:
            toast.error("Failed to get location. Please enter coordinates manually.");
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
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
        toast.success(`Customer added! Password: ${customer.generated_password || newCustomer.password}`);
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
          kitchen_id: "",
          google_location: null,
          password: "welcome123"
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to add customer");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddSubscription = async (e) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      // Find the selected plan to get pricing
      const selectedPlan = plans.find(p => p.plan_id === newSubscription.plan_id);
      
      const payload = {
        user_id: selectedCustomer.user_id,
        kitchen_id: newSubscription.kitchen_id || selectedCustomer.kitchen_id,
        plan_id: newSubscription.plan_id,
        plan_type: newSubscription.plan_type,
        diet_type: newSubscription.diet_type,
        meal_periods: newSubscription.meal_periods,
        delivery_days: newSubscription.delivery_days,
        start_date: newSubscription.start_date,
        total_deliveries: selectedPlan?.delivery_days || 24,
        remaining_deliveries: selectedPlan?.delivery_days || 24,
        amount_paid: newSubscription.amount_paid || selectedPlan?.price || 0
      };

      const response = await fetch(`${API}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Subscription created successfully!");
        setShowAddSubscription(false);
        setSelectedCustomer(null);
        fetchData();
        resetSubscriptionForm();
      } else {
        const error = await response.json();
        throw new Error(error.detail || "Failed to create subscription");
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const resetSubscriptionForm = () => {
    setNewSubscription({
      kitchen_id: "",
      plan_id: "",
      plan_type: "monthly",
      diet_type: "veg",
      meal_periods: ["lunch"],
      delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
      start_date: format(new Date(), "yyyy-MM-dd"),
      total_deliveries: 24,
      remaining_deliveries: 24,
      amount_paid: 0
    });
  };

  const toggleMeal = (meal) => {
    const meals = newSubscription.meal_periods.includes(meal)
      ? newSubscription.meal_periods.filter(m => m !== meal)
      : [...newSubscription.meal_periods, meal];
    setNewSubscription({ ...newSubscription, meal_periods: meals });
  };

  const toggleDay = (day) => {
    const days = newSubscription.delivery_days.includes(day)
      ? newSubscription.delivery_days.filter(d => d !== day)
      : [...newSubscription.delivery_days, day];
    setNewSubscription({ ...newSubscription, delivery_days: days });
  };

  // Get subscription status for a customer
  const getCustomerSubscription = (userId) => {
    return subscriptions.find(s => s.user_id === userId);
  };

  // Filter customers based on subscription status
  const getActiveCustomers = () => {
    return customers.filter(c => {
      const sub = getCustomerSubscription(c.user_id);
      return sub && sub.status === "active" && c.is_active !== false;
    });
  };

  const getInactiveCustomers = () => {
    return customers.filter(c => {
      const sub = getCustomerSubscription(c.user_id);
      return !sub || sub.status !== "active" || c.is_active === false;
    });
  };

  const getRecentlyFinishedCustomers = () => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    return customers.filter(c => {
      const sub = getCustomerSubscription(c.user_id);
      if (!sub) return false;
      if (sub.status === "active") return false;
      
      // Check if subscription ended within last 7 days
      const endDate = sub.end_date ? parseISO(sub.end_date) : null;
      if (!endDate) return false;
      
      return differenceInDays(new Date(), endDate) <= 7;
    });
  };

  const filteredCustomers = (() => {
    let list = [];
    switch (activeTab) {
      case "active":
        list = getActiveCustomers();
        break;
      case "inactive":
        list = getInactiveCustomers();
        break;
      case "recently_finished":
        list = getRecentlyFinishedCustomers();
        break;
      default:
        list = customers;
    }
    
    return list.filter(c =>
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  })();

  const getDietIcon = (dietType) => {
    if (dietType === "veg" || dietType === "pure_veg") return <Leaf className="w-4 h-4 text-green-600" />;
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
          
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("active")}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{getActiveCustomers().length}</p>
              <p className="text-sm text-muted-foreground">Active Subscriptions</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("inactive")}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-gray-500">{getInactiveCustomers().length}</p>
              <p className="text-sm text-muted-foreground">Inactive / No Plan</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setActiveTab("recently_finished")}>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-amber-600">{getRecentlyFinishedCustomers().length}</p>
              <p className="text-sm text-muted-foreground">Finished (7 days)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{customers.length}</p>
              <p className="text-sm text-muted-foreground">Total Customers</p>
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
                
                <div className="grid grid-cols-2 gap-4">
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
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="kitchen">Assign Kitchen *</Label>
                    <Select
                      value={newCustomer.kitchen_id}
                      onValueChange={(value) => setNewCustomer({ ...newCustomer, kitchen_id: value })}
                    >
                      <SelectTrigger data-testid="customer-kitchen-select">
                        <SelectValue placeholder="Select kitchen" />
                      </SelectTrigger>
                      <SelectContent>
                        {kitchens
                          .filter(k => !newCustomer.city || k.city === newCustomer.city)
                          .map((kitchen) => (
                            <SelectItem key={kitchen.kitchen_id} value={kitchen.kitchen_id}>
                              {kitchen.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                  {newCustomer.google_location 
                    ? `📍 Location: ${newCustomer.google_location.lat.toFixed(4)}, ${newCustomer.google_location.lng.toFixed(4)}`
                    : "Get GPS Location"}
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
                  value={newSubscription.kitchen_id || selectedCustomer?.kitchen_id || ""}
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
                <Label>Select Plan *</Label>
                <Select
                  value={newSubscription.plan_id}
                  onValueChange={(value) => {
                    const plan = plans.find(p => p.plan_id === value);
                    setNewSubscription({ 
                      ...newSubscription, 
                      plan_id: value,
                      plan_type: plan?.delivery_days === 6 ? "weekly" : plan?.delivery_days === 12 ? "15_days" : "monthly",
                      total_deliveries: plan?.delivery_days || 24,
                      remaining_deliveries: plan?.delivery_days || 24,
                      amount_paid: plan?.price || 0
                    });
                  }}
                >
                  <SelectTrigger data-testid="subscription-plan-select">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.filter(p => p.is_active).map((plan) => (
                      <SelectItem key={plan.plan_id} value={plan.plan_id}>
                        {plan.name} - ₹{plan.price} ({plan.delivery_days} deliveries)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Diet Type *</Label>
                <div className="flex gap-2">
                  {[
                    { value: "veg", label: "Veg", icon: Leaf, color: "text-green-600" },
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
                      variant={newSubscription.meal_periods.includes(meal) ? "default" : "outline"}
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
                <Label>Delivery Days (Sunday excluded)</Label>
                <div className="grid grid-cols-6 gap-2">
                  {weekDays.map((day) => (
                    <Button
                      key={day}
                      type="button"
                      variant={newSubscription.delivery_days.includes(day) ? "default" : "outline"}
                      size="sm"
                      className="capitalize text-xs"
                      onClick={() => toggleDay(day)}
                      data-testid={`day-${day}`}
                    >
                      {day.slice(0, 3)}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input
                    type="date"
                    value={newSubscription.start_date}
                    onChange={(e) => setNewSubscription({ ...newSubscription, start_date: e.target.value })}
                    data-testid="start-date-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount Paid (₹)</Label>
                  <Input
                    type="number"
                    value={newSubscription.amount_paid}
                    onChange={(e) => setNewSubscription({ ...newSubscription, amount_paid: parseFloat(e.target.value) || 0 })}
                    data-testid="amount-paid-input"
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" data-testid="submit-subscription-btn">
                Create Subscription
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Customer Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="active" className="gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              Active ({getActiveCustomers().length})
            </TabsTrigger>
            <TabsTrigger value="inactive" className="gap-2">
              <span className="w-2 h-2 rounded-full bg-gray-400" />
              Inactive ({getInactiveCustomers().length})
            </TabsTrigger>
            <TabsTrigger value="recently_finished" className="gap-2">
              <Clock className="w-4 h-4" />
              Recently Finished ({getRecentlyFinishedCustomers().length})
            </TabsTrigger>
          </TabsList>

          <Card>
            <CardHeader>
              <CardTitle className="font-['Outfit'] flex items-center justify-between">
                <span>
                  {activeTab === "active" && "Active Customers"}
                  {activeTab === "inactive" && "Inactive / No Plan Customers"}
                  {activeTab === "recently_finished" && "Recently Finished (Last 7 Days)"}
                </span>
                <Badge variant="outline">{filteredCustomers.length} customers</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {filteredCustomers.map((customer) => {
                    const subscription = getCustomerSubscription(customer.user_id);
                    
                    return (
                      <Card
                        key={customer.user_id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowAddSubscription(true);
                        }}
                        data-testid={`customer-${customer.user_id}`}
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
                              {/* Subscription Info */}
                              {subscription && (
                                <div className="flex items-center gap-2 mt-2">
                                  {getDietIcon(subscription.diet_type)}
                                  <span className="text-sm capitalize">{subscription.diet_type}</span>
                                  <span className="text-sm text-muted-foreground">•</span>
                                  <span className="text-sm">{subscription.remaining_deliveries} left</span>
                                  {subscription.end_date && (
                                    <>
                                      <span className="text-sm text-muted-foreground">•</span>
                                      <span className="text-sm text-muted-foreground">
                                        Ends: {format(parseISO(subscription.end_date), "MMM d")}
                                      </span>
                                    </>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <Badge variant={subscription?.status === "active" ? "default" : "secondary"}>
                                {subscription?.status || "No Plan"}
                              </Badge>
                              {customer.city && (
                                <Badge variant="outline">{customer.city}</Badge>
                              )}
                              {!customer.kitchen_id && (
                                <Badge variant="destructive" className="text-xs">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  No Kitchen
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  
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
        </Tabs>
      </main>
    </div>
  );
}
