import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "../components/ui/dialog";
import { ScrollArea } from "../components/ui/scroll-area";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import {
  Shield, LogOut, Users, Building2, Utensils, DollarSign,
  Plus, Settings, TrendingUp, FileText, Image, Edit, Trash2, X, Upload
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SuperAdminDashboard({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [analytics, setAnalytics] = useState(null);
  const [plans, setPlans] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [constants, setConstants] = useState({});
  const [loading, setLoading] = useState(true);
  
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showMenuDialog, setShowMenuDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingMenuItem, setEditingMenuItem] = useState(null);
  const [showPlanBuilder, setShowPlanBuilder] = useState(false);
  const [selectedPlanForBuilder, setSelectedPlanForBuilder] = useState(null);

  const fileInputRef = useRef(null);

  const [newPlan, setNewPlan] = useState({
    name: "",
    delivery_days: 24,
    validity_days: 30,
    diet_type: "veg",
    price: 0,
    cost: 0,
    description: "",
    selected_items: []
  });

  const [newMenuItem, setNewMenuItem] = useState({
    name: "",
    description: "",
    category: "Salad",
    diet_type: "veg",
    ingredients: "",
    allergy_tags: [],
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    sodium: 0,
    fiber: 0,
    image_url: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [analyticsRes, plansRes, itemsRes, logsRes, constantsRes] = await Promise.all([
        fetch(`${API}/reports/revenue`, { credentials: "include" }),
        fetch(`${API}/plans`, { credentials: "include" }),
        fetch(`${API}/menu-items?include_inactive=true`, { credentials: "include" }),
        fetch(`${API}/audit-logs?limit=50`, { credentials: "include" }),
        fetch(`${API}/constants`, { credentials: "include" })
      ]);

      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
      if (plansRes.ok) setPlans(await plansRes.json());
      if (itemsRes.ok) setMenuItems(await itemsRes.json());
      if (logsRes.ok) setAuditLogs(await logsRes.json());
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

  // ============ PLAN CRUD ============
  const savePlan = async () => {
    try {
      const planData = {
        name: newPlan.name,
        delivery_days: newPlan.delivery_days,
        validity_days: newPlan.validity_days,
        diet_type: newPlan.diet_type,
        price: newPlan.price,
        cost: newPlan.cost,
        description: newPlan.description,
        selected_items: newPlan.selected_items
      };

      const url = editingPlan ? `${API}/plans/${editingPlan.plan_id}` : `${API}/plans`;
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(planData),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(editingPlan ? "Plan updated!" : "Plan created!");
        setShowPlanDialog(false);
        setEditingPlan(null);
        resetPlanForm();
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save plan");
      }
    } catch (err) {
      toast.error("Failed to save plan");
    }
  };

  const deletePlan = async (planId) => {
    if (!confirm("Are you sure you want to delete this plan?")) return;
    
    try {
      const res = await fetch(`${API}/plans/${planId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Plan deleted!");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to delete plan");
    }
  };

  const editPlan = (plan) => {
    setEditingPlan(plan);
    setNewPlan({
      name: plan.name,
      delivery_days: plan.delivery_days || 24,
      validity_days: plan.validity_days || 30,
      diet_type: plan.diet_type || "veg",
      price: plan.price || 0,
      cost: plan.cost || 0,
      description: plan.description || "",
      selected_items: plan.selected_items || []
    });
    setShowPlanDialog(true);
  };

  const resetPlanForm = () => {
    setNewPlan({
      name: "",
      delivery_days: 24,
      validity_days: 30,
      diet_type: "veg",
      price: 0,
      cost: 0,
      description: "",
      selected_items: []
    });
  };

  // ============ MENU ITEM CRUD ============
  const saveMenuItem = async () => {
    try {
      const itemData = {
        ...newMenuItem,
        ingredients: typeof newMenuItem.ingredients === 'string' 
          ? newMenuItem.ingredients.split(",").map(i => i.trim()).filter(i => i)
          : newMenuItem.ingredients
      };

      const url = editingMenuItem ? `${API}/menu-items/${editingMenuItem.item_id}` : `${API}/menu-items`;
      const method = editingMenuItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(editingMenuItem ? "Menu item updated!" : "Menu item created!");
        setShowMenuDialog(false);
        setEditingMenuItem(null);
        resetMenuItemForm();
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to save menu item");
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (!confirm("Are you sure you want to delete this menu item?")) return;
    
    try {
      const res = await fetch(`${API}/menu-items/${itemId}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Menu item deleted!");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to delete menu item");
    }
  };

  const editMenuItem = (item) => {
    setEditingMenuItem(item);
    setNewMenuItem({
      name: item.name,
      description: item.description || "",
      category: item.category,
      diet_type: item.diet_type,
      ingredients: Array.isArray(item.ingredients) ? item.ingredients.join(", ") : item.ingredients || "",
      allergy_tags: item.allergy_tags || [],
      calories: item.calories || 0,
      protein: item.protein || 0,
      carbs: item.carbs || 0,
      fat: item.fat || 0,
      sodium: item.sodium || 0,
      fiber: item.fiber || 0,
      image_url: item.image_url || ""
    });
    setShowMenuDialog(true);
  };

  const resetMenuItemForm = () => {
    setNewMenuItem({
      name: "",
      description: "",
      category: "Salad",
      diet_type: "veg",
      ingredients: "",
      allergy_tags: [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      sodium: 0,
      fiber: 0,
      image_url: ""
    });
  };

  // ============ IMAGE UPLOAD ============
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Read and compress image
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = document.createElement("img");
      img.onload = async () => {
        // Create canvas for 1:1 ratio crop
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        canvas.width = 400;  // Fixed size for consistency
        canvas.height = 400;
        
        const ctx = canvas.getContext("2d");
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, 400, 400);
        
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        
        try {
          const res = await fetch(`${API}/upload-image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image_data: imageData }),
            credentials: "include"
          });

          if (res.ok) {
            const { image_url } = await res.json();
            setNewMenuItem({ ...newMenuItem, image_url: imageData });
            toast.success("Image uploaded!");
          }
        } catch (err) {
          toast.error("Failed to upload image");
        }
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const toggleAllergyTag = (tag) => {
    const tags = newMenuItem.allergy_tags.includes(tag)
      ? newMenuItem.allergy_tags.filter(t => t !== tag)
      : [...newMenuItem.allergy_tags, tag];
    setNewMenuItem({ ...newMenuItem, allergy_tags: tags });
  };

  // ============ PLAN BUILDER ============
  const openPlanBuilder = (plan) => {
    setSelectedPlanForBuilder(plan);
    setShowPlanBuilder(true);
  };

  const savePlanMenuSequence = async (selectedItems) => {
    try {
      const res = await fetch(`${API}/plans/${selectedPlanForBuilder.plan_id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_items: selectedItems }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Plan menu items saved!");
        setShowPlanBuilder(false);
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to save menu items");
      }
    } catch (err) {
      toast.error("Failed to save menu items");
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
              <p className="text-2xl font-bold">{plans.filter(p => p.is_active).length}</p>
              <p className="text-sm opacity-80">Active Plans</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white">
            <CardContent className="p-4">
              <Utensils className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-2xl font-bold">{menuItems.filter(m => m.is_active).length}</p>
              <p className="text-sm opacity-80">Menu Items</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white">
            <CardContent className="p-4">
              <Image className="w-6 h-6 mb-2 opacity-80" />
              <p className="text-2xl font-bold">{auditLogs.length}</p>
              <p className="text-sm opacity-80">Recent Actions</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="menu">Menu Items</TabsTrigger>
            <TabsTrigger value="plans">Plans & Pricing</TabsTrigger>
            <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button className="w-full justify-start" variant="outline" onClick={() => { resetMenuItemForm(); setEditingMenuItem(null); setShowMenuDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Menu Item
                  </Button>
                  <Button className="w-full justify-start" variant="outline" onClick={() => { resetPlanForm(); setEditingPlan(null); setShowPlanDialog(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Plan
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

          {/* Menu Items Tab */}
          <TabsContent value="menu">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Menu Items</CardTitle>
                <Button onClick={() => { resetMenuItemForm(); setEditingMenuItem(null); setShowMenuDialog(true); }}>
                  <Plus className="w-4 h-4 mr-2" />Add Item
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {menuItems.map((item) => (
                    <Card key={item.item_id} className={`relative ${!item.is_active ? 'opacity-50' : ''}`}>
                      <CardContent className="p-4">
                        {/* Image */}
                        <div className="w-full aspect-square bg-muted rounded-lg mb-3 overflow-hidden">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Utensils className="w-12 h-12 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold">{item.name}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              <Badge variant={item.diet_type === "veg" ? "default" : "destructive"} className="text-xs">
                                {item.diet_type}
                              </Badge>
                            </div>
                          </div>
                          {!item.is_active && <Badge variant="secondary">Deleted</Badge>}
                        </div>
                        
                        {/* Nutrition */}
                        <div className="grid grid-cols-3 gap-2 text-center mb-3 text-xs">
                          <div className="bg-muted/50 rounded p-1">
                            <p className="font-semibold">{item.calories || 0}</p>
                            <p className="text-muted-foreground">kcal</p>
                          </div>
                          <div className="bg-muted/50 rounded p-1">
                            <p className="font-semibold">{item.protein || 0}g</p>
                            <p className="text-muted-foreground">Protein</p>
                          </div>
                          <div className="bg-muted/50 rounded p-1">
                            <p className="font-semibold">{item.carbs || 0}g</p>
                            <p className="text-muted-foreground">Carbs</p>
                          </div>
                        </div>
                        
                        {/* Allergy Tags */}
                        {item.allergy_tags?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {item.allergy_tags.map(tag => (
                              <Badge key={tag} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                        
                        {/* Actions */}
                        {item.is_active && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => editMenuItem(item)}>
                              <Edit className="w-3 h-3 mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="flex-1" onClick={() => deleteMenuItem(item.item_id)}>
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

          {/* Plans Tab */}
          <TabsContent value="plans">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Plans & Pricing</CardTitle>
                <Button onClick={() => { resetPlanForm(); setEditingPlan(null); setShowPlanDialog(true); }} data-testid="add-plan-btn">
                  <Plus className="w-4 h-4 mr-2" />Add Plan
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plans.map((plan) => (
                    <Card key={plan.plan_id} className={`${!plan.is_active ? 'opacity-50' : ''}`} data-testid={`plan-card-${plan.plan_id}`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <Badge variant="outline" className="capitalize mb-2">
                              {plan.delivery_days || 24} Deliveries
                            </Badge>
                            <h3 className="font-semibold">{plan.name}</h3>
                          </div>
                          <Badge className="capitalize">{(plan.diet_type || "veg").replace("_", " ")}</Badge>
                        </div>
                        
                        <div className="mb-4">
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold">₹{plan.price || 0}</span>
                            <span className="text-sm text-muted-foreground">/ {plan.validity_days || 30} days</span>
                          </div>
                          <p className="text-xs text-muted-foreground">Cost: ₹{plan.cost || 0}</p>
                        </div>
                        
                        {/* Menu items assigned */}
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground">
                            Menu items: {plan.selected_items?.length || 0} / {plan.delivery_days || 24}
                          </p>
                          <div className="h-2 bg-muted rounded-full overflow-hidden mt-1">
                            <div 
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${((plan.selected_items?.length || 0) / (plan.delivery_days || 24)) * 100}%` }}
                            />
                          </div>
                        </div>
                        
                        {plan.is_active && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1" onClick={() => editPlan(plan)} data-testid={`edit-plan-${plan.plan_id}`}>
                              <Edit className="w-3 h-3 mr-1" />Edit
                            </Button>
                            <Button size="sm" variant="secondary" className="flex-1" onClick={() => openPlanBuilder(plan)} data-testid={`menu-plan-${plan.plan_id}`}>
                              <Utensils className="w-3 h-3 mr-1" />Menu
                            </Button>
                            <Button size="sm" variant="destructive" onClick={() => deletePlan(plan.plan_id)} data-testid={`delete-plan-${plan.plan_id}`}>
                              <Trash2 className="w-3 h-3" />
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

          {/* Audit Logs Tab */}
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

      {/* Menu Item Dialog */}
      <Dialog open={showMenuDialog} onOpenChange={setShowMenuDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMenuItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Item Image (1:1 ratio)</Label>
              <div className="flex items-center gap-4">
                <div className="w-32 h-32 bg-muted rounded-lg overflow-hidden flex items-center justify-center border-2 border-dashed">
                  {newMenuItem.image_url ? (
                    <img src={newMenuItem.image_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <Upload className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Image
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">Image will be cropped to 1:1 ratio (400x400)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Item Name *</Label>
                <Input
                  value={newMenuItem.name}
                  onChange={(e) => setNewMenuItem({ ...newMenuItem, name: e.target.value })}
                  placeholder="e.g., Mediterranean Chicken Salad"
                />
              </div>
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={newMenuItem.category} onValueChange={(v) => setNewMenuItem({ ...newMenuItem, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(constants.meal_categories || ["Salad", "Wrap", "Sandwich", "Multigrain"]).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newMenuItem.description}
                onChange={(e) => setNewMenuItem({ ...newMenuItem, description: e.target.value })}
                placeholder="Brief description of the dish"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diet Type *</Label>
                <Select value={newMenuItem.diet_type} onValueChange={(v) => setNewMenuItem({ ...newMenuItem, diet_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non_veg">Non-Veg</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ingredients (comma separated)</Label>
                <Input
                  value={newMenuItem.ingredients}
                  onChange={(e) => setNewMenuItem({ ...newMenuItem, ingredients: e.target.value })}
                  placeholder="Chicken, Lettuce, Tomato"
                />
              </div>
            </div>

            {/* Allergy Tags */}
            <div className="space-y-2">
              <Label>Allergy Tags</Label>
              <div className="flex flex-wrap gap-2">
                {(constants.allergies || []).map(tag => (
                  <Badge
                    key={tag}
                    variant={newMenuItem.allergy_tags.includes(tag) ? "destructive" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAllergyTag(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Nutrition */}
            <div className="space-y-2">
              <Label>Nutrition Information</Label>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Calories (kcal)</Label>
                  <Input
                    type="number"
                    value={newMenuItem.calories}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, calories: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Protein (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newMenuItem.protein}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, protein: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Carbs (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newMenuItem.carbs}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, carbs: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fat (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newMenuItem.fat}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, fat: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Sodium (mg)</Label>
                  <Input
                    type="number"
                    value={newMenuItem.sodium}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, sodium: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Fiber (g)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={newMenuItem.fiber}
                    onChange={(e) => setNewMenuItem({ ...newMenuItem, fiber: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMenuDialog(false)}>Cancel</Button>
              <Button onClick={saveMenuItem}>{editingMenuItem ? "Update" : "Create"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Dialog */}
      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Plan Name *</Label>
              <Input
                value={newPlan.name}
                onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                placeholder="e.g., Monthly Veg Plan"
                data-testid="plan-name-input"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Days *</Label>
                <Select 
                  value={String(newPlan.delivery_days)} 
                  onValueChange={(v) => {
                    const days = parseInt(v);
                    const validityMap = {6: 7, 12: 15, 24: 30};
                    setNewPlan({ 
                      ...newPlan, 
                      delivery_days: days, 
                      validity_days: validityMap[days] || 30,
                      selected_items: newPlan.selected_items.slice(0, days)
                    });
                  }}
                >
                  <SelectTrigger data-testid="delivery-days-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="6">6 Deliveries (Weekly)</SelectItem>
                    <SelectItem value="12">12 Deliveries (15 Days)</SelectItem>
                    <SelectItem value="24">24 Deliveries (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Validity Days *</Label>
                <Select value={String(newPlan.validity_days)} onValueChange={(v) => setNewPlan({ ...newPlan, validity_days: parseInt(v) })}>
                  <SelectTrigger data-testid="validity-days-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 Days</SelectItem>
                    <SelectItem value="15">15 Days</SelectItem>
                    <SelectItem value="30">30 Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Diet Type *</Label>
                <Select value={newPlan.diet_type} onValueChange={(v) => setNewPlan({ ...newPlan, diet_type: v })}>
                  <SelectTrigger data-testid="diet-type-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="veg">Veg</SelectItem>
                    <SelectItem value="non_veg">Non-Veg</SelectItem>
                    <SelectItem value="mixed">Mixed</SelectItem>
                    <SelectItem value="breakfast_only">Breakfast Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (₹) *</Label>
                <Input
                  type="number"
                  value={newPlan.price}
                  onChange={(e) => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) || 0 })}
                  data-testid="plan-price-input"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Cost (₹) - Internal</Label>
              <Input
                type="number"
                value={newPlan.cost}
                onChange={(e) => setNewPlan({ ...newPlan, cost: parseFloat(e.target.value) || 0 })}
                data-testid="plan-cost-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={newPlan.description}
                onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                placeholder="Brief description of the plan"
                data-testid="plan-description-input"
              />
            </div>
            
            {/* Menu Items Selection */}
            <div className="space-y-2">
              <Label>Select Menu Items ({newPlan.selected_items.length} / {newPlan.delivery_days} selected)</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Select up to {newPlan.delivery_days} menu items for this plan. Each item represents one delivery day.
              </p>
              <ScrollArea className="h-48 border rounded-md p-2">
                <div className="space-y-2">
                  {menuItems.filter(m => m.is_active).map((item) => {
                    const isSelected = newPlan.selected_items.includes(item.item_id);
                    const canSelect = newPlan.selected_items.length < newPlan.delivery_days || isSelected;
                    
                    return (
                      <div 
                        key={item.item_id}
                        className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors ${
                          isSelected ? 'bg-primary/10 border border-primary' : 'bg-muted/30 hover:bg-muted/50'
                        } ${!canSelect && !isSelected ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => {
                          if (!canSelect && !isSelected) return;
                          const newItems = isSelected 
                            ? newPlan.selected_items.filter(id => id !== item.item_id)
                            : [...newPlan.selected_items, item.item_id];
                          setNewPlan({ ...newPlan, selected_items: newItems });
                        }}
                        data-testid={`menu-item-select-${item.item_id}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Utensils className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{item.name}</p>
                            <div className="flex items-center gap-1">
                              <Badge variant="outline" className="text-xs">{item.category}</Badge>
                              <Badge variant={item.diet_type === "veg" ? "default" : "destructive"} className="text-xs">
                                {item.diet_type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <Badge variant="default" className="bg-primary">Selected</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPlanDialog(false)}>Cancel</Button>
              <Button onClick={savePlan} data-testid="save-plan-btn">{editingPlan ? "Update" : "Create"}</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Plan Builder Dialog */}
      <Dialog open={showPlanBuilder} onOpenChange={setShowPlanBuilder}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Menu Items to {selectedPlanForBuilder?.name}</DialogTitle>
          </DialogHeader>
          {selectedPlanForBuilder && (
            <PlanMenuBuilder
              plan={selectedPlanForBuilder}
              menuItems={menuItems.filter(m => m.is_active)}
              onSave={savePlanMenuSequence}
              onCancel={() => setShowPlanBuilder(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Plan Menu Builder Component
function PlanMenuBuilder({ plan, menuItems, onSave, onCancel }) {
  const [sequence, setSequence] = useState(plan.menu_items_sequence || []);
  const totalDays = plan.total_deliveries;

  const setItemForDay = (day, itemId) => {
    const newSequence = sequence.filter(s => s.day !== day);
    if (itemId) {
      newSequence.push({ day, item_id: itemId, meal_period: "lunch" });
    }
    newSequence.sort((a, b) => a.day - b.day);
    setSequence(newSequence);
  };

  const getItemForDay = (day) => {
    const found = sequence.find(s => s.day === day);
    return found?.item_id || "";
  };

  return (
    <div className="space-y-4 mt-4">
      <p className="text-sm text-muted-foreground">
        Assign menu items for each delivery day. Total: {totalDays} days. Selected: {sequence.length}
      </p>
      
      <div className="grid grid-cols-4 gap-3 max-h-[400px] overflow-y-auto">
        {Array.from({ length: totalDays }, (_, i) => i + 1).map(day => (
          <div key={day} className="space-y-1">
            <Label className="text-xs">Day {day}</Label>
            <Select value={getItemForDay(day)} onValueChange={(v) => setItemForDay(day, v)}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">-- None --</SelectItem>
                {menuItems.map(item => (
                  <SelectItem key={item.item_id} value={item.item_id}>
                    {item.name} ({item.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button onClick={() => onSave(sequence)}>Save Menu Sequence</Button>
      </DialogFooter>
    </div>
  );
}
