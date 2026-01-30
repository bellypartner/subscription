import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { ScrollArea } from "../components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog";
import { toast } from "sonner";
import {
  Utensils, Bell, LogOut, Calendar as CalendarIcon, MapPin, Clock,
  Flame, Leaf, ChevronRight, User, Truck, XCircle, AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { format, parseISO, isToday, isTomorrow, isBefore, startOfDay, addDays } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Cancellation cutoff times
const CANCELLATION_CUTOFFS = {
  breakfast: { hour: 7, minute: 0, display: "7:00 AM" },
  lunch: { hour: 9, minute: 30, display: "9:30 AM" },
  dinner: { hour: 15, minute: 0, display: "3:00 PM" }
};

export default function CustomerDashboard({ user }) {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const [cancelDialog, setCancelDialog] = useState({ open: false, delivery: null });
  const [cancelling, setCancelling] = useState(false);

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

  // Check if a delivery can be cancelled based on cutoff time
  const canCancelDelivery = (delivery) => {
    if (delivery.status !== "scheduled") return false;
    
    const deliveryDate = parseISO(delivery.delivery_date);
    const today = startOfDay(new Date());
    
    // Can't cancel past deliveries
    if (isBefore(deliveryDate, today)) return false;
    
    // If not today, can cancel
    if (!isToday(deliveryDate)) return true;
    
    // If today, check cutoff time
    const cutoff = CANCELLATION_CUTOFFS[delivery.meal_period];
    if (!cutoff) return false;
    
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
    
    return now < cutoffTime;
  };

  // Get time remaining until cutoff
  const getTimeUntilCutoff = (delivery) => {
    if (!isToday(parseISO(delivery.delivery_date))) return null;
    
    const cutoff = CANCELLATION_CUTOFFS[delivery.meal_period];
    if (!cutoff) return null;
    
    const now = new Date();
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoff.hour, cutoff.minute, 0, 0);
    
    if (now >= cutoffTime) return "Cutoff passed";
    
    const diff = cutoffTime - now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  const handleCancelDelivery = async () => {
    if (!cancelDialog.delivery) return;
    
    setCancelling(true);
    try {
      const res = await fetch(`${API}/deliveries/${cancelDialog.delivery.delivery_id}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Customer requested cancellation" }),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Delivery cancelled! Your subscription has been extended by 1 day.");
        setCancelDialog({ open: false, delivery: null });
        fetchData();
      } else {
        const err = await res.json();
        toast.error(err.detail || "Failed to cancel delivery");
      }
    } catch (err) {
      toast.error("Failed to cancel delivery");
    } finally {
      setCancelling(false);
    }
  };

  const getDeliveriesForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return deliveries.filter(d => d.delivery_date === dateStr);
  };

  const selectedDateDeliveries = getDeliveriesForDate(selectedDate);
  const todayDeliveries = getDeliveriesForDate(new Date());
  
  const upcomingDeliveries = deliveries
    .filter(d => {
      const deliveryDate = parseISO(d.delivery_date);
      return deliveryDate >= startOfDay(new Date()) && d.status !== "cancelled";
    })
    .sort((a, b) => new Date(a.delivery_date) - new Date(b.delivery_date))
    .slice(0, 7);

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  // Calculate profile completion
  const profileFields = ['address', 'height', 'weight', 'allergies', 'lifestyle_diseases'];
  const completedFields = profileFields.filter(f => user?.[f] && (Array.isArray(user[f]) ? user[f].length > 0 : true));
  const profileCompletion = Math.round((completedFields.length / profileFields.length) * 100);
  const isProfileComplete = profileCompletion >= 80;

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-700",
      preparing: "bg-yellow-100 text-yellow-700",
      ready: "bg-purple-100 text-purple-700",
      out_for_delivery: "bg-orange-100 text-orange-700",
      in_transit: "bg-orange-100 text-orange-700",
      delivered: "bg-green-100 text-green-700",
      cancelled: "bg-red-100 text-red-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getMealIcon = (mealPeriod) => {
    const icons = {
      breakfast: "🌅",
      lunch: "☀️",
      dinner: "🌙"
    };
    return icons[mealPeriod] || "🍽️";
  };

  const getDietIcon = (dietType) => {
    if (dietType === "veg" || dietType === "pure_veg") return <Leaf className="w-4 h-4 text-green-600" />;
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

  // If no subscription, show prompt
  const hasActiveSubscription = subscriptions.some(s => s.status === "active");

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
              onClick={() => navigate("/profile")}
              data-testid="profile-btn"
            >
              <User className="w-5 h-5" />
            </Button>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Profile Completion Banner */}
        {!isProfileComplete && (
          <Card className="mb-6 border-amber-200 bg-amber-50" data-testid="profile-banner">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-600" />
                <div>
                  <p className="font-medium text-amber-800">Complete your profile</p>
                  <p className="text-sm text-amber-600">Add your address, health info to get personalized meals. Earn ₹100!</p>
                </div>
              </div>
              <Button onClick={() => navigate("/profile")} variant="outline" className="border-amber-400 text-amber-700 hover:bg-amber-100" data-testid="complete-profile-btn">
                Complete Profile ({profileCompletion}%)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* No Subscription Banner */}
        {!hasActiveSubscription && (
          <Card className="mb-6 border-blue-200 bg-blue-50" data-testid="no-subscription-banner">
            <CardContent className="p-6 text-center">
              <Utensils className="w-12 h-12 text-blue-400 mx-auto mb-4" />
              <h3 className="font-semibold text-lg text-blue-800 mb-2">No Active Subscription</h3>
              <p className="text-blue-600 mb-4">Contact our sales team to get started with a meal plan!</p>
              <p className="text-sm text-blue-500">Once your plan is assigned, you'll see your meal calendar here.</p>
            </CardContent>
          </Card>
        )}

        {hasActiveSubscription && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-4 space-y-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg font-['Outfit'] flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5" />
                    Delivery Calendar
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    className="rounded-md"
                    modifiers={{
                      delivery: deliveries
                        .filter(d => d.status !== "cancelled")
                        .map(d => parseISO(d.delivery_date)),
                      cancelled: deliveries
                        .filter(d => d.status === "cancelled")
                        .map(d => parseISO(d.delivery_date)),
                      delivered: deliveries
                        .filter(d => d.status === "delivered")
                        .map(d => parseISO(d.delivery_date))
                    }}
                    modifiersStyles={{
                      delivery: { backgroundColor: "hsl(var(--primary) / 0.2)", borderRadius: "50%" },
                      cancelled: { backgroundColor: "hsl(var(--destructive) / 0.2)", borderRadius: "50%", textDecoration: "line-through" },
                      delivered: { backgroundColor: "hsl(142 76% 36% / 0.2)", borderRadius: "50%" }
                    }}
                  />
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary/20" />
                      <span>Scheduled</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-green-500/20" />
                      <span>Delivered</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-red-500/20" />
                      <span>Cancelled</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Subscription Info */}
              {subscriptions[0] && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg font-['Outfit']">Your Plan</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <Badge variant={subscriptions[0].status === "active" ? "default" : "secondary"} className="capitalize">
                        {subscriptions[0].status}
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
                    {subscriptions[0].extended_deliveries > 0 && (
                      <div className="flex items-center justify-between text-green-600">
                        <span className="text-sm">Extended days</span>
                        <span className="font-semibold">+{subscriptions[0].extended_deliveries}</span>
                      </div>
                    )}
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
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Deliveries Section */}
            <div className="lg:col-span-8 space-y-6">
              {/* Selected Date Deliveries */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit'] flex items-center justify-between">
                    <span>
                      {isToday(selectedDate) ? "Today's Meals" : 
                       isTomorrow(selectedDate) ? "Tomorrow's Meals" : 
                       format(selectedDate, "EEEE, MMM d")}
                    </span>
                    {selectedDateDeliveries.length > 0 && (
                      <Badge variant="outline">{selectedDateDeliveries.length} meal(s)</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedDateDeliveries.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDateDeliveries.map((delivery) => (
                        <div 
                          key={delivery.delivery_id} 
                          className={`p-4 rounded-xl border ${delivery.status === "cancelled" ? "bg-muted/30 opacity-60" : "bg-card"}`}
                          data-testid={`delivery-${delivery.delivery_id}`}
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <span className="text-2xl">{getMealIcon(delivery.meal_period)}</span>
                              <div>
                                <h4 className="font-semibold capitalize">{delivery.meal_period}</h4>
                                <p className="text-sm text-muted-foreground">
                                  Day {delivery.delivery_day_number} of your plan
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <Badge className={getStatusColor(delivery.status)}>
                                {delivery.status.replace("_", " ")}
                              </Badge>
                              {isToday(parseISO(delivery.delivery_date)) && delivery.status === "scheduled" && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Cancel before {CANCELLATION_CUTOFFS[delivery.meal_period]?.display}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Menu Items */}
                          {delivery.menu_items?.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium text-muted-foreground mb-2">Menu:</p>
                              {delivery.menu_items.map((item, i) => (
                                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">🥗</span>
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      <p className="text-xs text-muted-foreground">{item.category}</p>
                                    </div>
                                  </div>
                                  {item.calories && (
                                    <div className="text-right text-sm">
                                      <p className="font-semibold text-primary">{item.calories} kcal</p>
                                      <p className="text-xs text-muted-foreground">
                                        P:{item.protein}g C:{item.carbs}g F:{item.fat}g
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2 mt-3">
                            {["out_for_delivery", "in_transit"].includes(delivery.status) && (
                              <Button
                                onClick={() => navigate(`/tracking/${delivery.delivery_id}`)}
                                className="flex-1"
                                data-testid={`track-${delivery.delivery_id}`}
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                Track Delivery
                              </Button>
                            )}
                            
                            {canCancelDelivery(delivery) && (
                              <Button
                                variant="outline"
                                className="flex-1 text-destructive border-destructive hover:bg-destructive/10"
                                onClick={() => setCancelDialog({ open: true, delivery })}
                                data-testid={`cancel-${delivery.delivery_id}`}
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel
                                {isToday(parseISO(delivery.delivery_date)) && (
                                  <span className="ml-1 text-xs">({getTimeUntilCutoff(delivery)})</span>
                                )}
                              </Button>
                            )}
                            
                            {delivery.status === "cancelled" && (
                              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                <XCircle className="w-4 h-4" />
                                Cancelled - Extended to next day
                              </div>
                            )}
                            
                            {delivery.status === "delivered" && (
                              <div className="flex items-center gap-2 text-green-600 text-sm">
                                <CheckCircle2 className="w-4 h-4" />
                                Delivered
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CalendarIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {parseISO(format(selectedDate, "yyyy-MM-dd")).getDay() === 0 
                          ? "Sunday is a holiday - No deliveries"
                          : "No deliveries scheduled for this date"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Upcoming Deliveries */}
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit']">Upcoming Deliveries</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingDeliveries.length > 0 ? (
                    <div className="space-y-3">
                      {upcomingDeliveries.map((delivery) => (
                        <div
                          key={delivery.delivery_id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setSelectedDate(parseISO(delivery.delivery_date))}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-xl">{getMealIcon(delivery.meal_period)}</span>
                            <div>
                              <p className="font-medium">
                                {isToday(parseISO(delivery.delivery_date))
                                  ? "Today"
                                  : isTomorrow(parseISO(delivery.delivery_date))
                                  ? "Tomorrow"
                                  : format(parseISO(delivery.delivery_date), "EEE, MMM d")}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">
                                {delivery.meal_period} - Day {delivery.delivery_day_number}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={getStatusColor(delivery.status)}>
                              {delivery.status.replace("_", " ")}
                            </Badge>
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
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

              {/* Cancellation Deadlines Info */}
              <Card className="bg-muted/30">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Cancellation Deadlines
                  </h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Breakfast:</span>
                      <p className="font-semibold">Before 7:00 AM</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lunch:</span>
                      <p className="font-semibold">Before 9:30 AM</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Dinner:</span>
                      <p className="font-semibold">Before 3:00 PM</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Cancelled deliveries are automatically extended to your subscription end date.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={cancelDialog.open} onOpenChange={(open) => setCancelDialog({ open, delivery: null })}>
        <DialogContent data-testid="cancel-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Cancel Delivery?
            </DialogTitle>
          </DialogHeader>
          
          {cancelDialog.delivery && (
            <div className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="font-medium capitalize">
                  {getMealIcon(cancelDialog.delivery.meal_period)} {cancelDialog.delivery.meal_period} - {format(parseISO(cancelDialog.delivery.delivery_date), "EEEE, MMM d")}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Day {cancelDialog.delivery.delivery_day_number} of your plan
                </p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p>• This meal will be cancelled and removed from kitchen preparation.</p>
                <p>• Your subscription will be automatically extended by 1 day.</p>
                <p className="text-muted-foreground">This action cannot be undone.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelDialog({ open: false, delivery: null })}>
              Keep Delivery
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleCancelDelivery}
              disabled={cancelling}
              data-testid="confirm-cancel-btn"
            >
              {cancelling ? "Cancelling..." : "Yes, Cancel Delivery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
