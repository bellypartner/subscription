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
  Shield, LogOut, Users, Building2, Utensils, DollarSign,
  Plus, Settings, TrendingUp, FileText, Image
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SuperAdminDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [plans, setPlans] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [menuTemplates, setMenuTemplates] = useState([]);
  const [banners, setBanners] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [showBannerDialog, setShowBannerDialog] = useState(false);

  const [newPlan, setNewPlan] = useState({
    name: "",
    plan_type: "monthly",
    diet_type: "veg",
    price: 0,
    cost: 0,
    description: ""
  });

  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    category: "Salad",
    diet_type: "veg",
    ingredients: "",
    allergy_tags: [],
    calories: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, plansRes, itemsRes, templatesRes, bannersRes, logsRes] = await Promise.all([
        fetch(`${API}/reports/revenue`, { credentials: "include" }),
        fetch(`${API}/plans`, { credentials: "include" }),
        fetch(`${API}/menu-items`, { credentials: "include" }),
        fetch(`${API}/menu-templates`, { credentials: "include" }),
        fetch(`${API}/banners`, { credentials: "include" }),
        fetch(`${API}/audit-logs?limit=50`, { credentials: "include" })
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      if (itemsRes.ok) setMenuItems(await itemsRes.json());
      if (templatesRes.ok) setMenuTemplates(await templatesRes.json());
      if (bannersRes.ok) setBanners(await bannersRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
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

  const createPlan = async () => {
    try {
      const res = await fetch(`${API}/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Plan created!");
        setShowPlanDialog(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to create plan");
    }
  };

  const createMenuItem = async () => {
    try {
      const res = await fetch(`${API}/menu-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newMenuItem,
          ingredients: newMenuItem.ingredients.split(",").map(i => i.trim())
        }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Menu item created!");
        setShowMenuDialog(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to create menu item");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="super-admin-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">Super Admin</h1>
              <p className="text-sm text-muted-foreground">Full System Access</p>
            </div>
          </div>
          
          <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
            <CardContent className="p-4">
              <DollarSign className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-2xl font-bold">₹{analytics?.total_revenue?.toLocaleString() || 0}</p>
              <p className="text-sm opacity-80">Total Revenue</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
            <CardContent className="p-4">
              <FileText className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-2xl font-bold">{plans.length}</p>
              <p className="text-sm opacity-80">Plans</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <Utensils className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-2xl font-bold">{menuItems.length}</p>
              <p className="text-sm opacity-80">Menu Items</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <Image className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-2xl font-bold">{banners.length}</p>
              <p className="text-sm opacity-80">Banners</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
            <TabsTrigger value="menu">Menu Items</TabsTrigger>
            <TabsTrigger value="banners">Banners</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => setShowPlanDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Plan
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setShowMenuDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Menu Item
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => setShowBannerDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Banner
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => navigate("/admin")}>
                    <Users className="w-4 h-4 mr-2" />
                    Manage Users
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48">
                    {auditLogs.slice(0, 10).map((log) => (
                      <div key={log.log_id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">{log.entity_type} - {log.user_role}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "HH:mm")}
                        </span>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Plans & Pricing</CardTitle>
                <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />Add Plan</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Plan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Plan Name</Label>
                        <Input
                          value={newPlan.name}
                          onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                          placeholder="e.g., Monthly Veg Plan"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Plan Type</Label>
                          <Select value={newPlan.plan_type} onValueChange={(v) => setNewPlan({ ...newPlan, plan_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="weekly">Weekly (6 deliveries)</SelectItem>
                              <SelectItem value="15_days">15 Days (12 deliveries)</SelectItem>
                              <SelectItem value="monthly">Monthly (24 deliveries)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Diet Type</Label>
                          <Select value={newPlan.diet_type} onValueChange={(v) => setNewPlan({ ...newPlan, diet_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="veg">Veg</SelectItem>
                              <SelectItem value="non_veg">Non-Veg</SelectItem>
                              <SelectItem value="mixed">Mixed</SelectItem>
                              <SelectItem value="breakfast_only">Breakfast Only</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Price (₹)</Label>
                          <Input
                            type="number"
                            value={newPlan.price}
                            onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Cost (₹)</Label>
                          <Input
                            type="number"
                            value={newPlan.cost}
                            onChange={(e) => setNewPlan({ ...newPlan, cost: parseFloat(e.target.value) })}
                          />
                        </div>
                      </div>
                      <Button className="w-full" onClick={createPlan}>Create Plan</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.plan_id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="capitalize">{plan.plan_type.replace("_", " ")}</Badge>
                          <Badge className="capitalize">{plan.diet_type.replace("_", " ")}</Badge>
                        </div>
                        <h3 className="font-semibold mb-2">{plan.name}</h3>
                        <div className="flex items-baseline gap-1 mb-2">
                          <span className="text-2xl font-bold">₹{plan.price}</span>
                          <span className="text-sm text-muted-foreground">/ {plan.total_deliveries} deliveries</span>
                        </div>
                        <p className="text-xs text-muted-foreground">Cost: ₹{plan.cost}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="menu">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Menu Items</CardTitle>
                <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
                  <DialogTrigger asChild>
                    <Button><Plus className="w-4 h-4 mr-2" />Add Item</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Menu Item</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Item Name</Label>
                        <Input
                          value={newMenuItem.name}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                          placeholder="e.g., Mediterranean Chicken Salad"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Select value={newMenuItem.category} onValueChange={(v) => setNewMenuItem({ ...newMenuItem, category: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Salad">Salad</SelectItem>
                              <SelectItem value="Wrap">Wrap</SelectItem>
                              <SelectItem value="Sandwich">Sandwich</SelectItem>
                              <SelectItem value="Multigrain">Multigrain</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Diet Type</Label>
                          <Select value={newMenuItem.diet_type} onValueChange={(v) => setNewMenuItem({ ...newMenuItem, diet_type: v })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="veg">Veg</SelectItem>
                              <SelectItem value="non_veg">Non-Veg</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Ingredients (comma separated)</Label>
                        <Input
                          value={newMenuItem.ingredients}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, ingredients: e.target.value })}
                          placeholder="Chicken, Lettuce, Tomato, Feta"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Calories</Label>
                        <Input
                          type="number"
                          value={newMenuItem.calories}
                          onChange={(e) => setNewMenuItem({ ...newMenuItem, calories: parseInt(e.target.value) })}
                        />
                      </div>
                      <Button className="w-full" onClick={createMenuItem}>Add Item</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {menuItems.map((item) => (
                      <div key={item.item_id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{item.category}</Badge>
                            <Badge variant={item.diet_type === "veg" ? "default" : "destructive"} className="text-xs">
                              {item.diet_type}
                            </Badge>
                            {item.calories && <span className="text-xs text-muted-foreground">{item.calories} kcal</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="banners">
            <Card>
              <CardHeader>
                <CardTitle>Banner Management</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Banner management coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.log_id} className="flex items-start justify-between p-3 bg-muted/30 rounded-lg">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline">{log.action}</Badge>
                            <Badge variant="secondary">{log.entity_type}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            By {log.user_role} ({log.user_id.slice(0, 12)}...)
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.timestamp), "MMM d, HH:mm")}
                        </span>
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
