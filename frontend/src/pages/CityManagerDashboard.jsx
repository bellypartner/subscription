import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  MapPin, LogOut, Users, Truck, Calendar, RefreshCw,
  Building2, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { format } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function CityManagerDashboard({ user }) {
  const navigate = useNavigate();
  const [kitchens, setKitchens] = useState([]);
  const [deliveryBoys, setDeliveryBoys] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [deliveryRequests, setDeliveryRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const city = user?.city;
      const today = format(new Date(), "yyyy-MM-dd");

      const [kitchensRes, usersRes, deliveriesRes, requestsRes] = await Promise.all([
        fetch(`${API}/kitchens?city=${city}`, { credentials: "include" }),
        fetch(`${API}/users?role=delivery_boy&city=${city}`, { credentials: "include" }),
        fetch(`${API}/deliveries?date=${today}`, { credentials: "include" }),
        fetch(`${API}/delivery-requests?status=pending`, { credentials: "include" })
      ]);

      if (kitchensRes.ok) setKitchens(await kitchensRes.json());
      if (usersRes.ok) setDeliveryBoys(await usersRes.json());
      if (deliveriesRes.ok) setDeliveries(await deliveriesRes.json());
      if (requestsRes.ok) setDeliveryRequests(await requestsRes.json());
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

  const reviewRequest = async (requestId, action) => {
    try {
      const res = await fetch(`${API}/delivery-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success(`Request ${action}ed`);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to review request");
    }
  };

  const cancelDelivery = async (deliveryId) => {
    try {
      const res = await fetch(`${API}/deliveries/${deliveryId}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by City Manager" }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Delivery cancelled and subscription extended");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to cancel delivery");
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
    <div className="min-h-screen bg-background" data-testid="city-manager-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">City Manager - {user?.city}</h1>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={fetchData}>
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 text-center">
              <Building2 className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <p className="text-2xl font-bold text-blue-700">{kitchens.length}</p>
              <p className="text-sm text-blue-600">Kitchens</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-100">
            <CardContent className="p-4 text-center">
              <Truck className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <p className="text-2xl font-bold text-green-700">{deliveryBoys.length}</p>
              <p className="text-sm text-green-600">Delivery Boys</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-100">
            <CardContent className="p-4 text-center">
              <Calendar className="w-6 h-6 mx-auto mb-2 text-orange-600" />
              <p className="text-2xl font-bold text-orange-700">{deliveries.length}</p>
              <p className="text-sm text-orange-600">Today's Deliveries</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-50 border-purple-100">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-purple-600" />
              <p className="text-2xl font-bold text-purple-700">{deliveryRequests.length}</p>
              <p className="text-sm text-purple-600">Pending Requests</p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="delivery-boys">Delivery Boys</TabsTrigger>
            <TabsTrigger value="requests">Requests ({deliveryRequests.length})</TabsTrigger>
            <TabsTrigger value="deliveries">Today's Schedule</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Kitchens */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit']">Kitchens in {user?.city}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {kitchens.map((kitchen) => (
                      <div key={kitchen.kitchen_id} className="flex items-center justify-between p-3 border-b last:border-0">
                        <div>
                          <p className="font-medium">{kitchen.name}</p>
                          <p className="text-sm text-muted-foreground">{kitchen.address}</p>
                        </div>
                        <Badge variant={kitchen.is_active ? "default" : "secondary"}>
                          {kitchen.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Delivery Boys Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit']">Delivery Boys</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-64">
                    {deliveryBoys.map((db) => (
                      <div key={db.user_id} className="flex items-center justify-between p-3 border-b last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Truck className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium">{db.name}</p>
                            <p className="text-sm text-muted-foreground">{db.phone}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          Online
                        </Badge>
                      </div>
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="delivery-boys">
            <Card>
              <CardHeader>
                <CardTitle>Delivery Boy Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {deliveryBoys.map((db) => {
                    const dbDeliveries = deliveries.filter(d => d.delivery_boy_id === db.user_id);
                    const completed = dbDeliveries.filter(d => d.status === "delivered").length;
                    const pending = dbDeliveries.filter(d => !["delivered", "cancelled"].includes(d.status)).length;
                    
                    return (
                      <Card key={db.user_id}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="w-6 h-6 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{db.name}</p>
                              <p className="text-sm text-muted-foreground">{db.phone}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-center">
                            <div className="p-2 bg-green-50 rounded-lg">
                              <p className="text-xl font-bold text-green-700">{completed}</p>
                              <p className="text-xs text-green-600">Completed</p>
                            </div>
                            <div className="p-2 bg-orange-50 rounded-lg">
                              <p className="text-xl font-bold text-orange-700">{pending}</p>
                              <p className="text-xs text-orange-600">Pending</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Pending Delivery Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {deliveryRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {deliveryRequests.map((req) => (
                      <Card key={req.request_id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <Badge variant="outline" className="mb-2 capitalize">
                                {req.request_type}
                              </Badge>
                              <p className="font-medium">Original Date: {req.original_date}</p>
                              {req.requested_date && (
                                <p className="text-sm text-muted-foreground">
                                  Requested Date: {req.requested_date}
                                </p>
                              )}
                              {req.reason && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Reason: {req.reason}
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-green-600 border-green-600"
                                onClick={() => reviewRequest(req.request_id, "approve")}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-600"
                                onClick={() => reviewRequest(req.request_id, "reject")}
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Reject
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="deliveries">
            <Card>
              <CardHeader>
                <CardTitle>Today's Delivery Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-3">
                    {deliveries.map((delivery) => (
                      <Card key={delivery.delivery_id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className="capitalize">
                                  {delivery.meal_period}
                                </Badge>
                                <Badge className={
                                  delivery.status === "delivered" ? "bg-green-100 text-green-700" :
                                  delivery.status === "cancelled" ? "bg-red-100 text-red-700" :
                                  "bg-blue-100 text-blue-700"
                                }>
                                  {delivery.status?.replace("_", " ")}
                                </Badge>
                              </div>
                              <p className="font-medium">{delivery.customer?.name}</p>
                              <p className="text-sm text-muted-foreground">{delivery.address}</p>
                            </div>
                            {!["delivered", "cancelled"].includes(delivery.status) && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => cancelDelivery(delivery.delivery_id)}
                              >
                                Cancel
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
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
