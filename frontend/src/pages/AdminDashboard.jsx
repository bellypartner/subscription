import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  LayoutDashboard, LogOut, Users, ChefHat, Truck, Building2,
  Plus, MapPin, Phone, Edit, Trash2, UserPlus, Navigation
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function AdminDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("kitchens");
  const [kitchens, setKitchens] = useState([]);
  const [users, setUsers] = useState([]);
  const [constants, setConstants] = useState({});
  const [loading, setLoading] = useState(true);

  // Kitchen Dialog State
  const [showKitchenDialog, setShowKitchenDialog] = useState(false);
  const [editingKitchen, setEditingKitchen] = useState(null);
  const [kitchenForm, setKitchenForm] = useState({
    name: "",
    city: "",
    address: "",
    contact_phone: "",
    location: { lat: "", lng: "" }
  });

  // User/Staff Dialog State
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userForm, setUserForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "delivery_boy",
    kitchen_id: "",
    city: "",
    address: "",
    password: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [kitchensRes, usersRes, constantsRes] = await Promise.all([
        fetch(`${API}/kitchens?include_inactive=true`, { credentials: "include" }),
        fetch(`${API}/users`, { credentials: "include" }),
        fetch(`${API}/constants`, { credentials: "include" })
      ]);

      if (kitchensRes.ok) setKitchens(await kitchensRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      if (constantsRes.ok) setConstants(await constantsRes.json());
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

  // ============ KITCHEN CRUD ============
  const resetKitchenForm = () => {
    setKitchenForm({
      name: "",
      city: "",
      address: "",
      contact_phone: "",
      location: { lat: "", lng: "" }
    });
  };

  const openKitchenDialog = (kitchen = null) => {
    if (kitchen) {
      setEditingKitchen(kitchen);
      setKitchenForm({
        name: kitchen.name,
        city: kitchen.city,
        address: kitchen.address,
        contact_phone: kitchen.contact_phone,
        location: kitchen.location || { lat: "", lng: "" }
      });
    } else {
      setEditingKitchen(null);
      resetKitchenForm();
    }
    setShowKitchenDialog(true);
  };

  const saveKitchen = async () => {
    try {
      const payload = {
        ...kitchenForm,
        location: {
          lat: parseFloat(kitchenForm.location.lat) || 0,
          lng: parseFloat(kitchenForm.location.lng) || 0
        }
      };

      const url = editingKitchen 
        ? `${API}/kitchens/${editingKitchen.kitchen_id}` 
        : `${API}/kitchens`;
      const method = editingKitchen ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(editingKitchen ? "Kitchen updated!" : "Kitchen created!");
        setShowKitchenDialog(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save kitchen");
      }
    } catch (err) {
      toast.error("Failed to save kitchen");
    }
  };

  const deleteKitchen = async (kitchenId) => {
    if (!confirm("Are you sure you want to delete this kitchen?")) return;
    
    try {
      const res = await fetch(`${API}/kitchens/${kitchenId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Kitchen deleted!");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to delete kitchen");
    }
  };

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setKitchenForm({
            ...kitchenForm,
            location: {
              lat: position.coords.latitude.toFixed(6),
              lng: position.coords.longitude.toFixed(6)
            }
          });
          toast.success("Location captured!");
        },
        () => toast.error("Failed to get location")
      );
    } else {
      toast.error("Geolocation not supported");
    }
  };

  // ============ USER CRUD ============
  const resetUserForm = () => {
    setUserForm({
      name: "",
      phone: "",
      email: "",
      role: "delivery_boy",
      kitchen_id: "",
      city: "",
      address: "",
      password: ""
    });
  };

  const openUserDialog = (userObj = null, defaultRole = "delivery_boy") => {
    if (userObj) {
      setEditingUser(userObj);
      setUserForm({
        name: userObj.name,
        phone: userObj.phone,
        email: userObj.email || "",
        role: userObj.role,
        kitchen_id: userObj.kitchen_id || "",
        city: userObj.city || "",
        address: userObj.address || "",
        password: ""
      });
    } else {
      setEditingUser(null);
      resetUserForm();
      setUserForm(prev => ({ ...prev, role: defaultRole }));
    }
    setShowUserDialog(true);
  };

  const saveUser = async () => {
    try {
      const payload = { ...userForm };
      
      // Remove empty fields
      if (!payload.email) delete payload.email;
      if (!payload.kitchen_id) delete payload.kitchen_id;
      if (!payload.city) delete payload.city;
      if (!payload.address) delete payload.address;
      if (!payload.password) delete payload.password;

      const url = editingUser 
        ? `${API}/users/${editingUser.user_id}` 
        : `${API}/users`;
      const method = editingUser ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        if (data.generated_password) {
          toast.success(`User created! Password: ${data.generated_password}`);
        } else {
          toast.success(editingUser ? "User updated!" : "User created!");
        }
        setShowUserDialog(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save user");
      }
    } catch (err) {
      toast.error("Failed to save user");
    }
  };

  const deleteUser = async (userId) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    
    try {
      const res = await fetch(`${API}/users/${userId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        toast.success("User deleted!");
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to delete user");
      }
    } catch (err) {
      toast.error("Failed to delete user");
    }
  };

  // Helper functions
  const getKitchenName = (kitchenId) => {
    const kitchen = kitchens.find(k => k.kitchen_id === kitchenId);
    return kitchen ? kitchen.name : "Not assigned";
  };

  const getRoleColor = (role) => {
    const colors = {
      super_admin: "bg-purple-100 text-purple-700",
      admin: "bg-indigo-100 text-indigo-700",
      sales_manager: "bg-blue-100 text-blue-700",
      sales_executive: "bg-cyan-100 text-cyan-700",
      city_manager: "bg-teal-100 text-teal-700",
      kitchen_manager: "bg-orange-100 text-orange-700",
      delivery_boy: "bg-green-100 text-green-700",
      customer: "bg-gray-100 text-gray-700"
    };
    return colors[role] || "bg-gray-100 text-gray-700";
  };

  const staffUsers = users.filter(u => u.role !== "customer" && u.is_active !== false);
  const customerUsers = users.filter(u => u.role === "customer" && u.is_active !== false);
  const activeKitchens = kitchens.filter(k => k.is_active !== false);

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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <Building2 className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{activeKitchens.length}</p>
              <p className="text-sm opacity-80">Kitchens</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <Users className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{staffUsers.length}</p>
              <p className="text-sm opacity-80">Staff</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <Truck className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{staffUsers.filter(u => u.role === "delivery_boy").length}</p>
              <p className="text-sm opacity-80">Delivery Boys</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <UserPlus className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-3xl font-bold">{customerUsers.length}</p>
              <p className="text-sm opacity-80">Customers</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="kitchens">Kitchens</TabsTrigger>
            <TabsTrigger value="staff">Staff</TabsTrigger>
            <TabsTrigger value="customers">Customers</TabsTrigger>
          </TabsList>

          {/* Kitchens Tab */}
          <TabsContent value="kitchens">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Kitchens Management</CardTitle>
                <Button onClick={() => openKitchenDialog()} data-testid="add-kitchen-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Kitchen
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {kitchens.map((kitchen) => (
                    <Card key={kitchen.kitchen_id} className={`${!kitchen.is_active ? 'opacity-50' : ''}`} data-testid={`kitchen-card-${kitchen.kitchen_id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <ChefHat className="w-5 h-5 text-orange-600" />
                          </div>
                          <Badge variant={kitchen.is_active ? "default" : "secondary"}>
                            {kitchen.is_active ? "Active" : "Deleted"}
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold mb-2">{kitchen.name}</h3>
                        
                        <div className="space-y-1 text-sm text-muted-foreground mb-3">
                          <p className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {kitchen.city}
                          </p>
                          <p className="flex items-center gap-1">
                            <Navigation className="w-3 h-3" />
                            {kitchen.address}
                          </p>
                          <p className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {kitchen.contact_phone}
                          </p>
                          {kitchen.location?.lat && (
                            <p className="text-xs">
                              📍 {kitchen.location.lat}, {kitchen.location.lng}
                            </p>
                          )}
                        </div>
                        
                        {kitchen.is_active && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => openKitchenDialog(kitchen)} data-testid={`edit-kitchen-${kitchen.kitchen_id}`}>
                              <Edit className="w-3 h-3 mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => deleteKitchen(kitchen.kitchen_id)} data-testid={`delete-kitchen-${kitchen.kitchen_id}`}>
                              <Trash2 className="w-3 h-3 mr-1" />Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Staff Tab */}
          <TabsContent value="staff">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Staff Management</CardTitle>
                <Button onClick={() => openUserDialog(null, "delivery_boy")} data-testid="add-staff-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Staff
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {staffUsers.map((u) => (
                      <div
                        key={u.user_id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`staff-row-${u.user_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {u.phone}
                              </span>
                              {u.kitchen_id && (
                                <span className="flex items-center gap-1">
                                  <ChefHat className="w-3 h-3" />
                                  {getKitchenName(u.kitchen_id)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getRoleColor(u.role)}>
                            {u.role.replace(/_/g, " ")}
                          </Badge>
                          <Button size="sm" variant="ghost" onClick={() => openUserDialog(u)} data-testid={`edit-staff-${u.user_id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteUser(u.user_id)} data-testid={`delete-staff-${u.user_id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Customers Management</CardTitle>
                <Button onClick={() => openUserDialog(null, "customer")} data-testid="add-customer-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Customer
                </Button>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {customerUsers.map((u) => (
                      <div
                        key={u.user_id}
                        className="flex items-center justify-between p-4 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                        data-testid={`customer-row-${u.user_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <UserPlus className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{u.name}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {u.phone}
                              </span>
                              {u.kitchen_id && (
                                <span className="flex items-center gap-1">
                                  <ChefHat className="w-3 h-3" />
                                  {getKitchenName(u.kitchen_id)}
                                </span>
                              )}
                              {u.city && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {u.city}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{u.city || "No city"}</Badge>
                          <Button size="sm" variant="ghost" onClick={() => openUserDialog(u)} data-testid={`edit-customer-${u.user_id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteUser(u.user_id)} data-testid={`delete-customer-${u.user_id}`}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      {/* Kitchen Dialog */}
      <Dialog open={showKitchenDialog} onOpenChange={setShowKitchenDialog}>
        <DialogContent className="max-w-md" data-testid="kitchen-dialog">
          <DialogHeader>
            <DialogTitle>{editingKitchen ? "Edit Kitchen" : "Add New Kitchen"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Kitchen Name *</Label>
              <Input
                value={kitchenForm.name}
                onChange={(e) => setKitchenForm({ ...kitchenForm, name: e.target.value })}
                placeholder="e.g., Central Kitchen Kochi"
                data-testid="kitchen-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>City *</Label>
              <Select value={kitchenForm.city} onValueChange={(v) => setKitchenForm({ ...kitchenForm, city: v })}>
                <SelectTrigger data-testid="kitchen-city-select"><SelectValue placeholder="Select city" /></SelectTrigger>
                <SelectContent>
                  {(constants.cities || ["Kochi", "Trivandrum"]).map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={kitchenForm.address}
                onChange={(e) => setKitchenForm({ ...kitchenForm, address: e.target.value })}
                placeholder="Full address"
                data-testid="kitchen-address-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Contact Phone *</Label>
              <Input
                value={kitchenForm.contact_phone}
                onChange={(e) => setKitchenForm({ ...kitchenForm, contact_phone: e.target.value })}
                placeholder="Phone number"
                data-testid="kitchen-phone-input"
              />
            </div>
            
            {/* Google Coordinates */}
            <div className="space-y-2">
              <Label>Google Location / Coordinates</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs text-muted-foreground">Latitude</Label>
                  <Input
                    value={kitchenForm.location.lat}
                    onChange={(e) => setKitchenForm({ 
                      ...kitchenForm, 
                      location: { ...kitchenForm.location, lat: e.target.value }
                    })}
                    placeholder="e.g., 9.9312"
                    data-testid="kitchen-lat-input"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Longitude</Label>
                  <Input
                    value={kitchenForm.location.lng}
                    onChange={(e) => setKitchenForm({ 
                      ...kitchenForm, 
                      location: { ...kitchenForm.location, lng: e.target.value }
                    })}
                    placeholder="e.g., 76.2673"
                    data-testid="kitchen-lng-input"
                  />
                </div>
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={getLocation} data-testid="get-location-btn">
                <MapPin className="w-4 h-4 mr-2" />
                {kitchenForm.location.lat ? "📍 Location Captured" : "Get Current Location"}
              </Button>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowKitchenDialog(false)}>Cancel</Button>
              <Button onClick={saveKitchen} data-testid="save-kitchen-btn">
                {editingKitchen ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* User/Staff/Customer Dialog */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className="max-w-md" data-testid="user-dialog">
          <DialogHeader>
            <DialogTitle>
              {editingUser ? `Edit ${userForm.role === "customer" ? "Customer" : "Staff"}` : `Add New ${userForm.role === "customer" ? "Customer" : "Staff"}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                placeholder="Full name"
                data-testid="user-name-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Phone *</Label>
              <Input
                value={userForm.phone}
                onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                placeholder="Phone number"
                data-testid="user-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                placeholder="Email address (optional)"
                data-testid="user-email-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={userForm.role} onValueChange={(v) => setUserForm({ ...userForm, role: v })}>
                <SelectTrigger data-testid="user-role-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="sales_manager">Sales Manager</SelectItem>
                  <SelectItem value="sales_executive">Sales Executive</SelectItem>
                  <SelectItem value="city_manager">City Manager</SelectItem>
                  <SelectItem value="kitchen_manager">Kitchen Manager</SelectItem>
                  <SelectItem value="delivery_boy">Delivery Boy</SelectItem>
                  <SelectItem value="customer">Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Assign Kitchen - for delivery boys and customers */}
            {["delivery_boy", "kitchen_manager", "customer"].includes(userForm.role) && (
              <div className="space-y-2">
                <Label>Assign to Kitchen {userForm.role === "customer" ? "(for deliveries)" : "*"}</Label>
                <Select value={userForm.kitchen_id} onValueChange={(v) => setUserForm({ ...userForm, kitchen_id: v })}>
                  <SelectTrigger data-testid="user-kitchen-select"><SelectValue placeholder="Select kitchen" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">-- None --</SelectItem>
                    {activeKitchens.map((kitchen) => (
                      <SelectItem key={kitchen.kitchen_id} value={kitchen.kitchen_id}>
                        {kitchen.name} ({kitchen.city})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* City - for city managers and customers */}
            {["city_manager", "customer"].includes(userForm.role) && (
              <div className="space-y-2">
                <Label>City</Label>
                <Select value={userForm.city} onValueChange={(v) => setUserForm({ ...userForm, city: v })}>
                  <SelectTrigger data-testid="user-city-select"><SelectValue placeholder="Select city" /></SelectTrigger>
                  <SelectContent>
                    {(constants.cities || ["Kochi", "Trivandrum"]).map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Address - for customers */}
            {userForm.role === "customer" && (
              <div className="space-y-2">
                <Label>Delivery Address</Label>
                <Input
                  value={userForm.address}
                  onChange={(e) => setUserForm({ ...userForm, address: e.target.value })}
                  placeholder="Full delivery address"
                  data-testid="user-address-input"
                />
              </div>
            )}

            {/* Password - only for new users */}
            {!editingUser && (
              <div className="space-y-2">
                <Label>Password (leave empty for auto-generated)</Label>
                <Input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder="Set password or leave empty"
                  data-testid="user-password-input"
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowUserDialog(false)}>Cancel</Button>
              <Button onClick={saveUser} data-testid="save-user-btn">
                {editingUser ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
