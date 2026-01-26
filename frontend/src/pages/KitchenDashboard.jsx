import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  Utensils, LogOut, Clock, CheckCircle2, Truck, ChefHat,
  Package, AlertCircle, Users, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function KitchenDashboard({ user }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchData = async () => {
    try {
      const kitchenId = user?.kitchen_id;
      const today = format(new Date(), "yyyy-MM-dd");
      
      const [deliveriesRes, analyticsRes, usersRes] = await Promise.all([
        fetch(`${API}/deliveries?kitchen_id=${kitchenId}&date=${today}`, { credentials: "include" }),
        fetch(`${API}/analytics/kitchen/${kitchenId}`, { credentials: "include" }),
        fetch(`${API}/users?role=delivery_boy&kitchen_id=${kitchenId}`, { credentials: "include" })
      ]);

      if (deliveriesRes.ok) setDeliveries(await deliveriesRes.json());
      if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
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
      const response = await fetch(`${API}/deliveries/${deliveryId}/status?status=${newStatus}`, {
        method: "PUT",
        credentials: "include"
      });
      
      if (response.ok) {
        toast.success(`Status updated to ${newStatus}`);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

  const assignDeliveryBoy = async (deliveryId, deliveryBoyId) => {
    try {
      const response = await fetch(`${API}/deliveries/${deliveryId}/assign?delivery_boy_id=${deliveryBoyId}`, {
        method: "PUT",
        credentials: "include"
      });
      
      if (response.ok) {
        toast.success("Delivery assigned");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to assign delivery");
    }
  };

  const filteredDeliveries = statusFilter === "all" 
    ? deliveries 
    : deliveries.filter(d => d.status === statusFilter);

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-700 border-blue-200",
      preparing: "bg-yellow-100 text-yellow-700 border-yellow-200",
      ready: "bg-purple-100 text-purple-700 border-purple-200",
      dispatched: "bg-orange-100 text-orange-700 border-orange-200",
      in_transit: "bg-orange-100 text-orange-700 border-orange-200",
      delivered: "bg-green-100 text-green-700 border-green-200",
      cancelled: "bg-red-100 text-red-700 border-red-200"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getNextStatus = (currentStatus) => {
    const flow = {
      scheduled: "preparing",
      preparing: "ready",
      ready: "dispatched"
    };
    return flow[currentStatus];
  };

  const getStatusIcon = (status) => {
    const icons = {
      scheduled: Clock,
      preparing: ChefHat,
      ready: Package,
      dispatched: Truck,
      in_transit: Truck,
      delivered: CheckCircle2,
      cancelled: AlertCircle
    };
    const Icon = icons[status] || Clock;
    return <Icon className="w-4 h-4" />;
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
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <ChefHat className="w-5 h-5 text-primary-foreground" />
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-blue-700">{analytics?.today?.total || 0}</p>
              <p className="text-sm text-blue-600">Total Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-700">{analytics?.today?.pending || 0}</p>
              <p className="text-sm text-yellow-600">Pending</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-purple-700">{analytics?.today?.ready || 0}</p>
              <p className="text-sm text-purple-600">Ready</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-orange-700">{analytics?.today?.dispatched || 0}</p>
              <p className="text-sm text-orange-600">Dispatched</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-700">{analytics?.today?.delivered || 0}</p>
              <p className="text-sm text-green-600">Delivered</p>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-4 mb-6">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48" data-testid="status-filter">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Orders</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="preparing">Preparing</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="dispatched">Dispatched</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-muted-foreground">
            Showing {filteredDeliveries.length} orders
          </p>
        </div>

        {/* Orders Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDeliveries.map((delivery) => (
            <Card
              key={delivery.delivery_id}
              className={`border-2 ${getStatusColor(delivery.status)} transition-all hover:shadow-lg`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="outline" className={getStatusColor(delivery.status)}>
                    {getStatusIcon(delivery.status)}
                    <span className="ml-1 capitalize">{delivery.status.replace("_", " ")}</span>
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    #{delivery.delivery_id.slice(-6)}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{delivery.customer?.name || "Customer"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {delivery.meals.map((meal) => (
                      <Badge key={meal} variant="secondary" className="text-xs capitalize">
                        {meal}
                      </Badge>
                    ))}
                  </div>
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
                      <SelectTrigger className="w-full text-xs" data-testid={`assign-${delivery.delivery_id}`}>
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
                  {getNextStatus(delivery.status) && (
                    <Button
                      size="lg"
                      className="flex-1 h-12 text-base font-semibold"
                      onClick={() => updateStatus(delivery.delivery_id, getNextStatus(delivery.status))}
                      data-testid={`update-status-${delivery.delivery_id}`}
                    >
                      Mark {getNextStatus(delivery.status).replace("_", " ")}
                    </Button>
                  )}
                  {delivery.status === "ready" && delivery.delivery_boy_id && (
                    <Button
                      size="lg"
                      variant="default"
                      className="flex-1 h-12 text-base font-semibold bg-accent hover:bg-accent/90"
                      onClick={() => updateStatus(delivery.delivery_id, "dispatched")}
                      data-testid={`dispatch-${delivery.delivery_id}`}
                    >
                      <Truck className="w-5 h-5 mr-2" />
                      Dispatch
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredDeliveries.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No orders found</h3>
            <p className="text-muted-foreground">
              {statusFilter === "all" 
                ? "No orders for today yet" 
                : `No ${statusFilter} orders`}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
