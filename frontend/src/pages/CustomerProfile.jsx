import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, User, Heart, Activity, Home, Wallet, Save } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function CustomerProfile({ user }) {
  const navigate = useNavigate();
  const [constants, setConstants] = useState({});
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState({
    emergency_contact: user?.emergency_contact || "",
    allergies: user?.allergies || [],
    lifestyle_diseases: user?.lifestyle_diseases || [],
    job_type: user?.job_type || "",
    height: user?.height || "",
    weight: user?.weight || "",
    physical_activity: user?.physical_activity || "",
    smoking_status: user?.smoking_status || false,
    accommodation_type: user?.accommodation_type || "",
    preferred_meals: user?.preferred_meals || [],
    delivery_days: user?.delivery_days || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    subscription_goal: user?.subscription_goal || "",
    address: user?.address || "",
    alternate_phone: user?.alternate_phone || ""
  });

  useEffect(() => {
    fetchConstants();
  }, []);

  const fetchConstants = async () => {
    try {
      const res = await fetch(`${API}/constants`);
      if (res.ok) setConstants(await res.json());
    } catch (err) {
      console.error("Failed to fetch constants");
    }
  };

  const toggleAllergy = (allergy) => {
    const allergies = profile.allergies.includes(allergy)
      ? profile.allergies.filter(a => a !== allergy)
      : [...profile.allergies, allergy];
    setProfile({ ...profile, allergies });
  };

  const toggleDisease = (disease) => {
    const diseases = profile.lifestyle_diseases.includes(disease)
      ? profile.lifestyle_diseases.filter(d => d !== disease)
      : [...profile.lifestyle_diseases, disease];
    setProfile({ ...profile, lifestyle_diseases: diseases });
  };

  const toggleMeal = (meal) => {
    const meals = profile.preferred_meals.includes(meal)
      ? profile.preferred_meals.filter(m => m !== meal)
      : [...profile.preferred_meals, meal];
    setProfile({ ...profile, preferred_meals: meals });
  };

  const toggleDay = (day) => {
    if (day === "sunday") return; // Sunday disabled
    const days = profile.delivery_days.includes(day)
      ? profile.delivery_days.filter(d => d !== day)
      : [...profile.delivery_days, day];
    setProfile({ ...profile, delivery_days: days });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/${user.user_id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Profile updated successfully!");
        navigate("/dashboard");
      } else {
        throw new Error("Failed to update profile");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  return (
    <div className="min-h-screen bg-background" data-testid="customer-profile">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold font-['Outfit'] text-lg">My Profile</h1>
            <p className="text-sm text-muted-foreground">Complete your profile to earn ₹{user?.profile_points || 0}</p>
          </div>
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <span className="font-semibold text-primary">₹{user?.wallet_balance || 0}</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Profile Completion */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold">Profile Completion</h3>
                <p className="text-sm text-muted-foreground">Complete all sections to earn ₹100</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary">{user?.profile_points || 0}%</p>
                <p className="text-xs text-muted-foreground">= ₹{user?.profile_points || 0}</p>
              </div>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${user?.profile_points || 0}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <User className="w-5 h-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={user?.name || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={user?.phone || ""} disabled className="bg-muted" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Alternate Phone</Label>
              <Input
                value={profile.alternate_phone}
                onChange={(e) => setProfile({ ...profile, alternate_phone: e.target.value })}
                placeholder="Alternate contact number"
                data-testid="alternate-phone-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Emergency Contact</Label>
              <Input
                value={profile.emergency_contact}
                onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                placeholder="Emergency contact number"
                data-testid="emergency-contact-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Delivery Address</Label>
              <Textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Full delivery address"
                data-testid="address-input"
              />
            </div>
          </CardContent>
        </Card>

        {/* Health Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <Heart className="w-5 h-5 text-red-500" />
              Health Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Allergies */}
            <div className="space-y-3">
              <Label>Allergies (Select all that apply)</Label>
              <div className="flex flex-wrap gap-2">
                {(constants.allergies || []).map((allergy) => (
                  <Badge
                    key={allergy}
                    variant={profile.allergies.includes(allergy) ? "default" : "outline"}
                    className="cursor-pointer py-2 px-4"
                    onClick={() => toggleAllergy(allergy)}
                    data-testid={`allergy-${allergy}`}
                  >
                    {allergy}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Lifestyle Diseases */}
            <div className="space-y-3">
              <Label>Lifestyle Diseases</Label>
              <div className="flex flex-wrap gap-2">
                {(constants.lifestyle_diseases || []).map((disease) => (
                  <Badge
                    key={disease}
                    variant={profile.lifestyle_diseases.includes(disease) ? "destructive" : "outline"}
                    className="cursor-pointer py-2 px-4"
                    onClick={() => toggleDisease(disease)}
                    data-testid={`disease-${disease}`}
                  >
                    {disease}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Physical Metrics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Height (cm)</Label>
                <Input
                  type="number"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: parseFloat(e.target.value) || "" })}
                  placeholder="170"
                  data-testid="height-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: parseFloat(e.target.value) || "" })}
                  placeholder="70"
                  data-testid="weight-input"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lifestyle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <Activity className="w-5 h-5 text-blue-500" />
              Lifestyle
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Job Type</Label>
                <Select
                  value={profile.job_type}
                  onValueChange={(v) => setProfile({ ...profile, job_type: v })}
                >
                  <SelectTrigger data-testid="job-type-select">
                    <SelectValue placeholder="Select job type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(constants.job_types || []).map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Physical Activity</Label>
                <Select
                  value={profile.physical_activity}
                  onValueChange={(v) => setProfile({ ...profile, physical_activity: v })}
                >
                  <SelectTrigger data-testid="activity-select">
                    <SelectValue placeholder="Select activity level" />
                  </SelectTrigger>
                  <SelectContent>
                    {(constants.physical_activity || []).map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Checkbox
                checked={profile.smoking_status}
                onCheckedChange={(checked) => setProfile({ ...profile, smoking_status: checked })}
                data-testid="smoking-checkbox"
              />
              <Label>I smoke</Label>
            </div>

            <div className="space-y-2">
              <Label>Accommodation Type</Label>
              <Select
                value={profile.accommodation_type}
                onValueChange={(v) => setProfile({ ...profile, accommodation_type: v })}
              >
                <SelectTrigger data-testid="accommodation-select">
                  <SelectValue placeholder="Select accommodation" />
                </SelectTrigger>
                <SelectContent>
                  {(constants.accommodation_types || []).map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <Home className="w-5 h-5 text-green-500" />
              Delivery Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Meal Periods */}
            <div className="space-y-3">
              <Label>Preferred Meal Times</Label>
              <div className="flex gap-3">
                {(constants.meal_periods || ["breakfast", "lunch", "dinner"]).map((meal) => (
                  <Button
                    key={meal}
                    type="button"
                    variant={profile.preferred_meals.includes(meal) ? "default" : "outline"}
                    className="flex-1 capitalize"
                    onClick={() => toggleMeal(meal)}
                    data-testid={`meal-${meal}`}
                  >
                    {meal}
                  </Button>
                ))}
              </div>
            </div>

            {/* Delivery Days */}
            <div className="space-y-3">
              <Label>Delivery Days</Label>
              <div className="grid grid-cols-7 gap-2">
                {weekDays.map((day) => (
                  <Button
                    key={day}
                    type="button"
                    variant={profile.delivery_days.includes(day) ? "default" : "outline"}
                    size="sm"
                    className="capitalize"
                    onClick={() => toggleDay(day)}
                    disabled={day === "sunday"}
                    data-testid={`day-${day}`}
                  >
                    {day.slice(0, 3)}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Sunday is a holiday - no deliveries</p>
            </div>

            {/* Subscription Goal */}
            <div className="space-y-2">
              <Label>Subscription Goal</Label>
              <Select
                value={profile.subscription_goal}
                onValueChange={(v) => setProfile({ ...profile, subscription_goal: v })}
              >
                <SelectTrigger data-testid="goal-select">
                  <SelectValue placeholder="What's your goal?" />
                </SelectTrigger>
                <SelectContent>
                  {(constants.subscription_goals || []).map((goal) => (
                    <SelectItem key={goal} value={goal}>{goal}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          className="w-full py-6 rounded-xl"
          disabled={loading}
          data-testid="save-profile-btn"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Save className="w-5 h-5 mr-2" />
              Save Profile
            </>
          )}
        </Button>
      </main>
    </div>
  );
}
