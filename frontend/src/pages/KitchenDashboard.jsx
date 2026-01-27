import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  ChefHat, LogOut, Clock, CheckCircle2, Truck, Package,
  AlertCircle, Users, RefreshCw, Printer, Coffee, Sun, Moon
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function KitchenDashboard({ user }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState({ breakfast: [], lunch: [], dinner: [] });
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMeal, setActiveMeal] = useState("lunch");

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    try {
      const kitchenId = user?.kitchen_id;
      
      const [deliveriesRes, usersRes] = await Promise.all([
        fetch(`${API}/deliveries/today?kitchen_id=${kitchenId}`, { credentials: "include" }),
        fetch(`${API}/users?role=delivery_boy&kitchen_id=${kitchenId}`, { credentials: "include" })
      ]);

      if (deliveriesRes.ok) setDeliveries(await deliveriesRes.json());
      if (usersRes.ok) setDeliveryBoys(await usersRes.json());
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

  const updateStatus = async (deliveryId, newStatus) => {
    try {
      const res = await fetch(`${API}/deliveries/${deliveryId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        credentials: "include"
      });
      
      if (res.ok) {
        toast.success(`Status updated to ${newStatus.replace("_", " ")}`);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const assignDeliveryBoy = async (deliveryId, deliveryBoyId) => {
    try {
      const res = await fetch(`${API}/deliveries/${deliveryId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delivery_boy_id: deliveryBoyId }),
        credentials: "include"
      });
      
      if (res.ok) {
        toast.success("Delivery assigned");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to assign delivery");
    }
  };

  const handlePrint = (mealPeriod) => {
    const mealDeliveries = deliveries[mealPeriod];
    const printContent = mealDeliveries.map(d => 
      `${d.customer?.name} | ${d.menu_items?.map(i => i.name).join(", ") || "Menu Item"} | Allergies: ${d.allergy_notes || "None"}`
    ).join("\n");
    
    const printWindow = window.open("", "", "width=800,height=600");
    printWindow.document.write(`
      <html>
        <head><title>Kitchen Order List - ${mealPeriod.toUpperCase()}</title></head>
        <body style="font-family: monospace; padding: 20px;">
          <h2>FoodFleet Kitchen - ${mealPeriod.toUpperCase()} Orders</h2>
          <p>Date: ${format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          <hr/>
          <pre>${printContent}</pre>
          <p>Total Orders: ${mealDeliveries.length}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-700 border-blue-200",
      preparing: "bg-yellow-100 text-yellow-700 border-yellow-200",
      ready: "bg-purple-100 text-purple-700 border-purple-200",
      out_for_delivery: "bg-orange-100 text-orange-700 border-orange-200",
      delivered: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getMealIcon = (meal) => {
    if (meal === "breakfast") return <Coffee className="w-4 h-4" />;
    if (meal === "lunch") return <Sun className="w-4 h-4" />;
    return <Moon className="w-4 h-4" />;
  };

  const allMealsCount = {
    breakfast: deliveries.breakfast.length,
    lunch: deliveries.lunch.length,
    dinner: deliveries.dinner.length,
    total: deliveries.breakfast.length + deliveries.lunch.length + deliveries.dinner.length
  };

  const readyCount = {
    breakfast: deliveries.breakfast.filter(d => d.status === "ready").length,
    lunch: deliveries.lunch.filter(d => d.status === "ready").length,
    dinner: deliveries.dinner.filter(d => d.status === "ready").length
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="kitchen-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">Kitchen Dashboard</h1>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={fetchData} data-testid="refresh-btn">
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{allMealsCount.total}</p>
              <p className="text-sm text-blue-600">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">{allMealsCount.breakfast}</p>
              <p className="text-sm text-yellow-600">Breakfast</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-700">{allMealsCount.lunch}</p>
              <p className="text-sm text-orange-600">Lunch</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{allMealsCount.dinner}</p>
              <p className="text-sm text-purple-600">Dinner</p>
            </CardContent>
          </Card>
        </div>

        {/* Meal Tabs - All visible */}
        <Tabs value={activeMeal} onValueChange={setActiveMeal} className="space-y-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="breakfast" className="gap-2">
                <Coffee className="w-4 h-4" />
                Breakfast ({allMealsCount.breakfast})
              </TabsTrigger>
              <TabsTrigger value="lunch" className="gap-2">
                <Sun className="w-4 h-4" />
                Lunch ({allMealsCount.lunch})
              </TabsTrigger>
              <TabsTrigger value="dinner" className="gap-2">
                <Moon className="w-4 h-4" />
                Dinner ({allMealsCount.dinner})
              </TabsTrigger>
            </TabsList>

            <Button
              variant="outline"
              onClick={() => handlePrint(activeMeal)}
              disabled={deliveries[activeMeal].length === 0}
              data-testid="print-btn"
            >
              <Printer className="w-4 h-4 mr-2" />
              Print {activeMeal} List
            </Button>
          </div>

          {["breakfast", "lunch", "dinner"].map((meal) => (
            <TabsContent key={meal} value={meal} className="mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {deliveries[meal].map((delivery) => (
                  <Card
                    key={delivery.delivery_id}
                    className={`border-2 ${getStatusColor(delivery.status)} transition-all hover:shadow-lg`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge variant="outline" className={getStatusColor(delivery.status)}>
                          {delivery.status?.replace("_", " ")}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Day {delivery.delivery_day_number}
                        </span>
                      </div>

                      <div className="space-y-2 mb-4">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{delivery.customer?.name || "Customer"}</span>
                        </div>
                        
                        {delivery.allergy_notes && (
                          <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                            <div>
                              <p className="text-xs font-medium text-red-700">Allergies</p>
                              <p className="text-xs text-red-600">{delivery.allergy_notes}</p>
                            </div>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground truncate">
                          {delivery.address}
                        </p>
                      </div>

                      {/* Assign Delivery Boy */}
                      {["ready", "scheduled", "preparing"].includes(delivery.status) && (
                        <div className="mb-3">
                          <Select
                            value={delivery.delivery_boy_id || ""}
                            onValueChange={(value) => assignDeliveryBoy(delivery.delivery_id, value)}
                          >
                            <SelectTrigger className="w-full text-xs">
                              <SelectValue placeholder="Assign delivery boy" />
                            </SelectTrigger>
                            <SelectContent>
                              {deliveryBoys.map((db) => (
                                <SelectItem key={db.user_id} value={db.user_id}>
                                  {db.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {delivery.status === "scheduled" && (
                          <Button
                            size="lg"
                            className="flex-1 h-12"
                            onClick={() => updateStatus(delivery.delivery_id, "preparing")}
                          >
                            Start Preparing
                          </Button>
                        )}
                        {delivery.status === "preparing" && (
                          <Button
                            size="lg"
                            className="flex-1 h-12 bg-purple-600 hover:bg-purple-700"
                            onClick={() => updateStatus(delivery.delivery_id, "ready")}
                          >
                            <CheckCircle2 className="w-5 h-5 mr-2" />
                            Mark READY
                          </Button>
                        )}
                        {delivery.status === "ready" && delivery.delivery_boy_id && (
                          <Button
                            size="lg"
                            className="flex-1 h-12 bg-orange-500 hover:bg-orange-600"
                            onClick={() => updateStatus(delivery.delivery_id, "out_for_delivery")}
                          >
                            <Truck className="w-5 h-5 mr-2" />
                            Dispatch
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {deliveries[meal].length === 0 && (
                  <div className="col-span-full text-center py-12">
                    <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No {meal} orders today</p>
                  </div>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}
