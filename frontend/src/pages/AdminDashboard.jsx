import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  LayoutDashboard, LogOut, Users, ChefHat, Truck, Building2,
  Plus, MapPin, Phone, Utensils, TrendingUp, Calendar
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [kitchens, setKitchens] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddKitchen, setShowAddKitchen] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  const [newKitchen, setNewKitchen] = useState({
    name: "",
    city: "",
    address: "",
    contact_phone: "",
    location: { lat: 0, lng: 0 }
  });

  const [newUser, setNewUser] = useState({
    name: "",
    phone: "",
    email: "",
    role: "kitchen_staff",
    kitchen_id: "",
    password: "welcome123"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, kitchensRes, usersRes] = await Promise.all([
        fetch(`${API}/analytics/admin`, { credentials: "include" }),
        fetch(`${API}/kitchens`, { credentials: "include" }),
        fetch(`${API}/users`, { credentials: "include" })
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (kitchensRes.ok) setKitchens(await kitchensRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
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

  const handleAddKitchen = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/kitchens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newKitchen),
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Kitchen added successfully!");
        setShowAddKitchen(false);
        fetchData();
        setNewKitchen({
          name: "",
          city: "",
          address: "",
          contact_phone: "",
          location: { lat: 0, lng: 0 }
        });
      } else {
        const error = await response.json();
        throw new Error(error.detail);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
        credentials: "include"
      });

      if (response.ok) {
        toast.success("User added successfully!");
        setShowAddUser(false);
        fetchData();
        setNewUser({
          name: "",
          phone: "",
          email: "",
          role: "kitchen_staff",
          kitchen_id: "",
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

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setNewKitchen({
            ...newKitchen,
            location: {
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

  const getRoleColor = (role) => {
    const colors = {
      admin: "bg-purple-100 text-purple-700",
      sales_manager: "bg-blue-100 text-blue-700",
      kitchen_staff: "bg-orange-100 text-orange-700",
      delivery_boy: "bg-green-100 text-green-700",
      customer: "bg-gray-100 text-gray-700"
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="admin-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">Admin Dashboard</h1>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <Building2 className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{analytics?.total_kitchens || 0}</p>
              <p className="text-sm opacity-80">Kitchens</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <Users className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{analytics?.total_customers || 0}</p>
              <p className="text-sm opacity-80">Customers</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <Truck className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{analytics?.total_delivery_boys || 0}</p>
              <p className="text-sm opacity-80">Delivery Boys</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <TrendingUp className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{analytics?.active_subscriptions || 0}</p>
              <p className="text-sm opacity-80">Active Subs</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary to-primary/80 text-white">
            <CardContent className="p-4">
              <Calendar className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{analytics?.today_deliveries || 0}</p>
              <p className="text-sm opacity-80">Today</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="kitchens">Kitchens</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Recent Kitchens */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-['Outfit']">Kitchens</CardTitle>
                  <Dialog open={showAddKitchen} onOpenChange={setShowAddKitchen}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="add-kitchen-btn">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Kitchen</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddKitchen} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Kitchen Name *</Label>
                          <Input
                            value={newKitchen.name}
                            onChange={(e) => setNewKitchen({ ...newKitchen, name: e.target.value })}
                            required
                            data-testid="kitchen-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>City *</Label>
                          <Input
                            value={newKitchen.city}
                            onChange={(e) => setNewKitchen({ ...newKitchen, city: e.target.value })}
                            required
                            data-testid="kitchen-city-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Address *</Label>
                          <Input
                            value={newKitchen.address}
                            onChange={(e) => setNewKitchen({ ...newKitchen, address: e.target.value })}
                            required
                            data-testid="kitchen-address-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Contact Phone *</Label>
                          <Input
                            value={newKitchen.contact_phone}
                            onChange={(e) => setNewKitchen({ ...newKitchen, contact_phone: e.target.value })}
                            required
                            data-testid="kitchen-phone-input"
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={handleGetLocation}
                        >
                          <MapPin className="w-4 h-4 mr-2" />
                          {newKitchen.location.lat ? "Location Captured ✓" : "Get Location"}
                        </Button>
                        <Button type="submit" className="w-full" data-testid="submit-kitchen-btn">
                          Add Kitchen
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {kitchens.map((kitchen) => (
                        <div
                          key={kitchen.kitchen_id}
                          className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium">{kitchen.name}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {kitchen.city}
                            </p>
                          </div>
                          <Badge variant={kitchen.is_active ? "default" : "secondary"}>
                            {kitchen.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Recent Staff */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="font-['Outfit']">Staff</CardTitle>
                  <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                    <DialogTrigger asChild>
                      <Button size="sm" data-testid="add-user-btn">
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Staff Member</DialogTitle>
                      </DialogHeader>
                      <form onSubmit={handleAddUser} className="space-y-4 mt-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            value={newUser.name}
                            onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                            required
                            data-testid="user-name-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Phone *</Label>
                          <Input
                            value={newUser.phone}
                            onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                            required
                            data-testid="user-phone-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Email</Label>
                          <Input
                            type="email"
                            value={newUser.email}
                            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                            data-testid="user-email-input"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Role *</Label>
                          <Select
                            value={newUser.role}
                            onValueChange={(value) => setNewUser({ ...newUser, role: value })}
                          >
                            <SelectTrigger data-testid="user-role-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="sales_manager">Sales Manager</SelectItem>
                              <SelectItem value="kitchen_staff">Kitchen Staff</SelectItem>
                              <SelectItem value="delivery_boy">Delivery Boy</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {["kitchen_staff", "delivery_boy"].includes(newUser.role) && (
                          <div className="space-y-2">
                            <Label>Assign Kitchen</Label>
                            <Select
                              value={newUser.kitchen_id}
                              onValueChange={(value) => setNewUser({ ...newUser, kitchen_id: value })}
                            >
                              <SelectTrigger data-testid="user-kitchen-select">
                                <SelectValue placeholder="Select kitchen" />
                              </SelectTrigger>
                              <SelectContent>
                                {kitchens.map((kitchen) => (
                                  <SelectItem key={kitchen.kitchen_id} value={kitchen.kitchen_id}>
                                    {kitchen.name} ({kitchen.city})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                        <Button type="submit" className="w-full" data-testid="submit-user-btn">
                          Add Staff
                        </Button>
                      </form>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    <div className="space-y-3">
                      {users
                        .filter(u => u.role !== "customer")
                        .slice(0, 10)
                        .map((u) => (
                          <div
                            key={u.user_id}
                            className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-sm text-muted-foreground">{u.phone || u.email}</p>
                            </div>
                            <Badge className={getRoleColor(u.role)}>
                              {u.role.replace("_", " ")}
                            </Badge>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="kitchens">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Kitchens</CardTitle>
                <Button onClick={() => setShowAddKitchen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Kitchen
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kitchens.map((kitchen) => (
                    <Card key={kitchen.kitchen_id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <ChefHat className="w-5 h-5 text-orange-600" />
                          </div>
                          <Badge variant={kitchen.is_active ? "default" : "secondary"}>
                            {kitchen.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mb-1">{kitchen.name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-1 mb-1">
                          <MapPin className="w-3 h-3" />
                          {kitchen.city}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {kitchen.contact_phone}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>All Users</CardTitle>
                <Button onClick={() => setShowAddUser(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {users.map((u) => (
                      <div
                        key={u.user_id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              {u.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {u.phone}
                                </span>
                              )}
                              {u.email && <span>{u.email}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {u.city && <Badge variant="outline">{u.city}</Badge>}
                          <Badge className={getRoleColor(u.role)}>
                            {u.role.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
