import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Calendar } from "../components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { toast } from "sonner";
import {
  ArrowLeft, Calendar as CalendarIcon, Pause, Play, Utensils,
  Leaf, Flame, MapPin, Clock, Settings, ChevronRight
} from "lucide-react";
import { format, parseISO, addDays, isSameDay } from "date-fns";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function SubscriptionManagement({ user }) {
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [kitchens, setKitchens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState(null);
  const [selectedDates, setSelectedDates] = useState([]);
  const [showPauseDialog, setShowPauseDialog] = useState(false);
  const [showNewSubDialog, setShowNewSubDialog] = useState(false);

  const [newSub, setNewSub] = useState({
    kitchen_id: "",
    plan_type: "monthly",
    diet_type: "pure_veg",
    meals: ["breakfast", "lunch", "dinner"],
    delivery_days: ["daily"],
    custom_days: [],
    start_date: format(addDays(new Date(), 1), "yyyy-MM-dd")
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [subsRes, deliveriesRes, kitchensRes] = await Promise.all([
        fetch(`${API}/subscriptions`, { credentials: "include" }),
        fetch(`${API}/deliveries`, { credentials: "include" }),
        fetch(`${API}/kitchens`, { credentials: "include" })
      ]);

      if (subsRes.ok) {
        const subs = await subsRes.json();
        setSubscriptions(subs);
        if (subs.length > 0) setSelectedSub(subs[0]);
      }
      if (deliveriesRes.ok) setDeliveries(await deliveriesRes.json());
      if (kitchensRes.ok) setKitchens(await kitchensRes.json());
    } catch (err) {
      console.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handlePauseDates = async () => {
    if (!selectedSub || selectedDates.length === 0) return;

    try {
      const dateStrings = selectedDates.map(d => format(d, "yyyy-MM-dd"));
      const response = await fetch(`${API}/subscriptions/${selectedSub.subscription_id}/pause`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dateStrings),
        credentials: "include"
      });

      if (response.ok) {
        toast.success(`Paused ${selectedDates.length} delivery days`);
        setShowPauseDialog(false);
        setSelectedDates([]);
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to pause deliveries");
    }
  };

  const handleResumeDates = async (dates) => {
    if (!selectedSub) return;

    try {
      const response = await fetch(`${API}/subscriptions/${selectedSub.subscription_id}/resume`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dates),
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Deliveries resumed");
        fetchData();
      }
    } catch (err) {
      toast.error("Failed to resume deliveries");
    }
  };

  const handleCreateSubscription = async () => {
    try {
      const response = await fetch(`${API}/subscriptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newSub,
          user_id: user?.user_id,
          start_date: new Date(newSub.start_date).toISOString()
        }),
        credentials: "include"
      });

      if (response.ok) {
        toast.success("Subscription created!");
        setShowNewSubDialog(false);
        fetchData();
      } else {
        const error = await response.json();
        throw new Error(error.detail);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleMeal = (meal) => {
    const meals = newSub.meals.includes(meal)
      ? newSub.meals.filter(m => m !== meal)
      : [...newSub.meals, meal];
    setNewSub({ ...newSub, meals });
  };

  const getDietIcon = (dietType) => {
    if (dietType === "pure_veg") return <Leaf className="w-4 h-4 text-green-600" />;
    if (dietType === "non_veg") return <Flame className="w-4 h-4 text-red-600" />;
    return <Utensils className="w-4 h-4 text-orange-600" />;
  };

  const getDeliveryForDate = (date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return deliveries.find(d => 
      d.delivery_date === dateStr && 
      d.subscription_id === selectedSub?.subscription_id
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background" data-testid="subscription-management">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold font-['Outfit'] text-lg">My Subscription</h1>
            <p className="text-sm text-muted-foreground">Manage your meal plan</p>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {subscriptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Utensils className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Active Subscription</h3>
              <p className="text-muted-foreground mb-6">
                Start your healthy eating journey today!
              </p>
              <Dialog open={showNewSubDialog} onOpenChange={setShowNewSubDialog}>
                <DialogTrigger asChild>
                  <Button data-testid="create-subscription-btn">
                    Create Subscription
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>New Subscription</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Kitchen</label>
                      <Select
                        value={newSub.kitchen_id}
                        onValueChange={(v) => setNewSub({ ...newSub, kitchen_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a kitchen" />
                        </SelectTrigger>
                        <SelectContent>
                          {kitchens.map((k) => (
                            <SelectItem key={k.kitchen_id} value={k.kitchen_id}>
                              {k.name} ({k.city})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Plan Type</label>
                      <div className="flex gap-2">
                        {[
                          { value: "monthly", label: "Monthly (24 deliveries)" },
                          { value: "weekly", label: "Weekly (6 deliveries)" }
                        ].map((plan) => (
                          <Button
                            key={plan.value}
                            type="button"
                            variant={newSub.plan_type === plan.value ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => setNewSub({ ...newSub, plan_type: plan.value })}
                          >
                            {plan.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Diet Type</label>
                      <div className="flex gap-2">
                        {[
                          { value: "pure_veg", label: "Veg", icon: Leaf, color: "text-green-600" },
                          { value: "mixed", label: "Mixed", icon: Utensils, color: "text-orange-600" },
                          { value: "non_veg", label: "Non-Veg", icon: Flame, color: "text-red-600" }
                        ].map((diet) => (
                          <Button
                            key={diet.value}
                            type="button"
                            variant={newSub.diet_type === diet.value ? "default" : "outline"}
                            className="flex-1"
                            onClick={() => setNewSub({ ...newSub, diet_type: diet.value })}
                          >
                            <diet.icon className={`w-4 h-4 mr-1 ${newSub.diet_type === diet.value ? "" : diet.color}`} />
                            {diet.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Meals</label>
                      <div className="flex gap-2">
                        {["breakfast", "lunch", "dinner"].map((meal) => (
                          <Button
                            key={meal}
                            type="button"
                            variant={newSub.meals.includes(meal) ? "default" : "outline"}
                            className="flex-1 capitalize"
                            onClick={() => toggleMeal(meal)}
                          >
                            {meal}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Delivery Schedule</label>
                      <Select
                        value={newSub.delivery_days[0]}
                        onValueChange={(v) => setNewSub({ ...newSub, delivery_days: [v] })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily (Mon-Sat)</SelectItem>
                          <SelectItem value="alternate">Alternate Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button className="w-full" onClick={handleCreateSubscription}>
                      Create Subscription
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Current Plan */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit'] flex items-center justify-between">
                  <span>Current Plan</span>
                  <Badge variant={selectedSub?.status === "active" ? "default" : "secondary"}>
                    {selectedSub?.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Plan Type</p>
                    <p className="font-semibold capitalize">{selectedSub?.plan_type}</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Diet</p>
                    <div className="flex items-center gap-1">
                      {getDietIcon(selectedSub?.diet_type)}
                      <span className="font-semibold capitalize">
                        {selectedSub?.diet_type?.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Remaining</p>
                    <p className="font-semibold">{selectedSub?.remaining_deliveries} deliveries</p>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-xl">
                    <p className="text-sm text-muted-foreground">Meals</p>
                    <div className="flex flex-wrap gap-1">
                      {selectedSub?.meals?.map((m) => (
                        <Badge key={m} variant="outline" className="text-xs capitalize">
                          {m}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog open={showPauseDialog} onOpenChange={setShowPauseDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="flex-1" data-testid="pause-btn">
                        <Pause className="w-4 h-4 mr-2" />
                        Pause Deliveries
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Pause Deliveries</DialogTitle>
                      </DialogHeader>
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          Select dates to pause deliveries. You can resume anytime.
                        </p>
                        <Calendar
                          mode="multiple"
                          selected={selectedDates}
                          onSelect={setSelectedDates}
                          disabled={(date) => {
                            const delivery = getDeliveryForDate(date);
                            return !delivery || delivery.status === "delivered" || delivery.status === "cancelled";
                          }}
                          className="rounded-md border"
                        />
                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setSelectedDates([]);
                              setShowPauseDialog(false);
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            className="flex-1"
                            onClick={handlePauseDates}
                            disabled={selectedDates.length === 0}
                            data-testid="confirm-pause-btn"
                          >
                            Pause {selectedDates.length} Days
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>

            {/* Paused Dates */}
            {selectedSub?.paused_dates?.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="font-['Outfit'] text-orange-600">
                    <Pause className="w-5 h-5 inline mr-2" />
                    Paused Deliveries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {selectedSub.paused_dates.map((date) => (
                      <Badge
                        key={date}
                        variant="outline"
                        className="bg-orange-50 text-orange-700 cursor-pointer hover:bg-orange-100"
                        onClick={() => handleResumeDates([date])}
                      >
                        {format(parseISO(date), "MMM d")}
                        <Play className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Click on a date to resume delivery
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Delivery Calendar */}
            <Card>
              <CardHeader>
                <CardTitle className="font-['Outfit']">Delivery Schedule</CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  className="rounded-md border"
                  modifiers={{
                    scheduled: deliveries
                      .filter(d => d.status === "scheduled" && d.subscription_id === selectedSub?.subscription_id)
                      .map(d => parseISO(d.delivery_date)),
                    delivered: deliveries
                      .filter(d => d.status === "delivered" && d.subscription_id === selectedSub?.subscription_id)
                      .map(d => parseISO(d.delivery_date)),
                    cancelled: deliveries
                      .filter(d => d.status === "cancelled" && d.subscription_id === selectedSub?.subscription_id)
                      .map(d => parseISO(d.delivery_date))
                  }}
                  modifiersStyles={{
                    scheduled: { backgroundColor: "hsl(var(--primary) / 0.2)", borderRadius: "50%" },
                    delivered: { backgroundColor: "hsl(145 47% 35% / 0.3)", borderRadius: "50%" },
                    cancelled: { backgroundColor: "hsl(var(--destructive) / 0.2)", borderRadius: "50%" }
                  }}
                />
                <div className="flex justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary/30" />
                    <span>Scheduled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500/30" />
                    <span>Delivered</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/30" />
                    <span>Cancelled</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
