import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  Utensils, Bell, LogOut, Calendar as CalendarIcon, MapPin, Clock,
  Flame, Leaf, ChevronRight, Pause, Play, Settings, Truck
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, addDays } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function CustomerDashboard({ user }) {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, deliveriesRes, notifRes] = await Promise.all([
        fetch(`${API}/subscriptions`, { credentials: "include" }),
        fetch(`${API}/deliveries`, { credentials: "include" }),
        fetch(`${API}/notifications`, { credentials: "include" })
      ]);

      if (subsRes.ok) setSubscriptions(await subsRes.json());
      if (deliveriesRes.ok) setDeliveries(await deliveriesRes.json());
      if (notifRes.ok) setNotifications(await notifRes.json());
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

  const markNotificationRead = async (notificationId) => {
    await fetch(`${API}/notifications/${notificationId}/read`, {
      method: "PUT",
      credentials: "include"
    });
    fetchData();
  };

  const getDeliveryForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return deliveries.find(d => d.delivery_date === dateStr);
  };

  const todayDelivery = getDeliveryForDate(new Date());
  const upcomingDeliveries = deliveries
    .filter(d => new Date(d.delivery_date) >= new Date() && d.status !== "cancelled")
    .sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date))
    .slice(0, 5);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-700",
      preparing: "bg-yellow-100 text-yellow-700",
      ready: "bg-purple-100 text-purple-700",
      dispatched: "bg-orange-100 text-orange-700",
      in_transit: "bg-orange-100 text-orange-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getDietIcon = (dietType) => {
    if (dietType === "pure_veg") return <Leaf className="w-4 h-4 text-green-600" />;
    if (dietType === "non_veg") return <Flame className="w-4 h-4 text-red-600" />;
    return <Utensils className="w-4 h-4 text-orange-600" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="customer-dashboard">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Utensils className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">FoodFleet</h1>
              <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => setShowNotifications(!showNotifications)}
                data-testid="notifications-btn"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent text-accent-foreground text-xs rounded-full flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
              
              {showNotifications && (
                <Card className="absolute right-0 top-12 w-80 shadow-xl z-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Notifications</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-64">
                      {notifications.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">No notifications</p>
                      ) : (
                        <div className="space-y-2">
                          {notifications.slice(0, 10).map((notif) => (
                            <div
                              key={notif.notification_id}
                              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                                notif.is_read ? "bg-muted/50" : "bg-primary/5"
                              }`}
                              onClick={() => markNotificationRead(notif.notification_id)}
                            >
                              <p className="text-sm font-medium">{notif.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">{notif.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/subscription")}
              data-testid="settings-btn"
            >
              <Settings className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Bento Grid */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Hero Card - Today's Delivery */}
          <Card className="col-span-full md:col-span-8 row-span-2 bg-gradient-to-br from-primary/5 to-secondary overflow-hidden">
            <CardContent className="p-6 h-full flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Meal</p>
                  <h2 className="text-2xl font-bold font-['Outfit']">
                    {todayDelivery ? format(new Date(), "EEEE, MMM d") : "No delivery today"}
                  </h2>
                </div>
                {todayDelivery && (
                  <Badge className={getStatusColor(todayDelivery.status)}>
                    {todayDelivery.status.replace("_", " ").toUpperCase()}
                  </Badge>
                )}
              </div>
              
              {todayDelivery ? (
                <div className="flex-1 flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-2">
                      {getDietIcon(subscriptions[0]?.diet_type)}
                      <span className="text-sm capitalize">
                        {subscriptions[0]?.diet_type?.replace("_", " ")} Plan
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Meals Included:</p>
                      <div className="flex flex-wrap gap-2">
                        {todayDelivery.meals.map((meal) => (
                          <Badge key={meal} variant="secondary" className="capitalize">
                            {meal}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    {todayDelivery.menu_items?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">Today's Menu:</p>
                        {todayDelivery.menu_items.map((item, i) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-white rounded-lg">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-xs text-muted-foreground">{item.description}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-semibold text-primary">{item.calories} kcal</p>
                              <p className="text-xs text-muted-foreground">
                                P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {["dispatched", "in_transit"].includes(todayDelivery.status) && (
                      <Button
                        onClick={() => navigate(`/tracking/${todayDelivery.delivery_id}`)}
                        className="w-full md:w-auto rounded-full"
                        data-testid="track-delivery-btn"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Track Delivery
                      </Button>
                    )}
                  </div>
                  
                  <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1762631383556-7fa1365898b7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwyfHxoZWFsdGh5JTIwZm9vZCUyMGJvd2wlMjBvdmVyaGVhZHxlbnwwfHx8fDE3Njk0NDI5Mzl8MA&ixlib=rb-4.1.0&q=85"
                      alt="Today's meal"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <Utensils className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No delivery scheduled for today</p>
                    <Button
                      variant="link"
                      onClick={() => navigate("/subscription")}
                      className="mt-2"
                    >
                      Manage Subscription
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subscription Stats */}
          <Card className="col-span-full md:col-span-4">
            <CardContent className="p-6">
              <h3 className="font-semibold font-['Outfit'] mb-4">Your Plan</h3>
              {subscriptions.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Plan Type</span>
                    <Badge variant="secondary" className="capitalize">
                      {subscriptions[0].plan_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Diet Type</span>
                    <div className="flex items-center gap-1">
                      {getDietIcon(subscriptions[0].diet_type)}
                      <span className="capitalize">{subscriptions[0].diet_type?.replace("_", " ")}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Remaining</span>
                    <span className="font-semibold">{subscriptions[0].remaining_deliveries} deliveries</span>
                  </div>
                  <div className="pt-2">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${(subscriptions[0].remaining_deliveries / subscriptions[0].total_deliveries) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-2">No active subscription</p>
                  <Button variant="outline" size="sm" onClick={() => navigate("/subscription")}>
                    Subscribe Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Calendar */}
          <Card className="col-span-full md:col-span-4">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md"
                modifiers={{
                  delivery: deliveries
                    .filter(d => d.status !== "cancelled")
                    .map(d => parseISO(d.delivery_date)),
                  cancelled: deliveries
                    .filter(d => d.status === "cancelled")
                    .map(d => parseISO(d.delivery_date))
                }}
                modifiersStyles={{
                  delivery: { backgroundColor: "hsl(var(--primary) / 0.2)", borderRadius: "50%" },
                  cancelled: { backgroundColor: "hsl(var(--destructive) / 0.2)", borderRadius: "50%" }
                }}
              />
            </CardContent>
          </Card>

          {/* Upcoming Deliveries */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle className="font-['Outfit']">Upcoming Deliveries</CardTitle>
            </CardHeader>
            <CardContent>
              {upcomingDeliveries.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcomingDeliveries.map((delivery) => (
                    <Card
                      key={delivery.delivery_id}
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        if (["dispatched", "in_transit"].includes(delivery.status)) {
                          navigate(`/tracking/${delivery.delivery_id}`);
                        }
                      }}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {isToday(parseISO(delivery.delivery_date))
                                ? "Today"
                                : isTomorrow(parseISO(delivery.delivery_date))
                                ? "Tomorrow"
                                : format(parseISO(delivery.delivery_date), "EEE, MMM d")}
                            </span>
                          </div>
                          <Badge className={getStatusColor(delivery.status)}>
                            {delivery.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {delivery.meals.map((meal) => (
                            <Badge key={meal} variant="outline" className="text-xs capitalize">
                              {meal}
                            </Badge>
                          ))}
                        </div>
                        {["dispatched", "in_transit"].includes(delivery.status) && (
                          <div className="mt-3 flex items-center gap-1 text-sm text-primary">
                            <Truck className="w-4 h-4" />
                            Track Now
                            <ChevronRight className="w-4 h-4" />
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No upcoming deliveries</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
