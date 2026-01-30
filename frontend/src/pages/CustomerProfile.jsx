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
import { ArrowLeft, User, Heart, Activity, Home, Wallet, Save, MapPin, Clock, Check } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function CustomerProfile({ user }) {
  const navigate = useNavigate();
  const [constants, setConstants] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    emergency_contact: "",
    allergies: [],
    other_allergies: "",
    lifestyle_diseases: [],
    job_type: "",
    height: "",
    weight: "",
    physical_activity: "",
    smoking_status: false,
    drinking_status: false,
    accommodation_type: "",
    preferred_meals: [],
    delivery_days: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
    delivery_time_window: "",
    subscription_goal: "",
    address: "",
    google_location: { lat: "", lng: "" },
    google_maps_link: "",
    alternate_phone: ""
  });

  useEffect(() => {
    fetchConstants();
    loadUserProfile();
  }, []);

  const fetchConstants = async () => {
    try {
      const res = await fetch(`${API}/constants`);
      if (res.ok) setConstants(await res.json());
    } catch (err) {
      console.error("Failed to fetch constants");
    }
  };

  const loadUserProfile = async () => {
    if (!user?.user_id) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${API}/users/${user.user_id}`, { credentials: "include" });
      if (res.ok) {
        const userData = await res.json();
        setProfile({
          emergency_contact: userData.emergency_contact || "",
          allergies: userData.allergies || [],
          other_allergies: userData.other_allergies || "",
          lifestyle_diseases: userData.lifestyle_diseases || [],
          job_type: userData.job_type || "",
          height: userData.height || "",
          weight: userData.weight || "",
          physical_activity: userData.physical_activity || "",
          smoking_status: userData.smoking_status || false,
          drinking_status: userData.drinking_status || false,
          accommodation_type: userData.accommodation_type || "",
          preferred_meals: userData.preferred_meals || [],
          delivery_days: userData.delivery_days || ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"],
          delivery_time_window: userData.delivery_time_window || "",
          subscription_goal: userData.subscription_goal || "",
          address: userData.address || "",
          google_location: userData.google_location || { lat: "", lng: "" },
          google_maps_link: userData.google_maps_link || "",
          alternate_phone: userData.alternate_phone || ""
        });
      }
    } catch (err) {
      console.error("Failed to load profile");
    } finally {
      setLoading(false);
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

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation not supported by your browser. Please enter coordinates manually.");
      return;
    }
    
    toast.info("Getting your location...");
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setProfile({
          ...profile,
          google_location: {
            lat: position.coords.latitude.toFixed(6),
            lng: position.coords.longitude.toFixed(6)
          }
        });
        toast.success("Location captured successfully!");
      },
      (error) => {
        switch(error.code) {
          case error.PERMISSION_DENIED:
            toast.error("Location access denied. Please enable location permissions in your browser settings, then try again.");
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("Location unavailable. Please enter coordinates manually or paste a Google Maps link.");
            break;
          case error.TIMEOUT:
            toast.error("Location request timed out. Please try again or enter coordinates manually.");
            break;
          default:
            toast.error("Could not get location. Please enter coordinates manually or paste a Google Maps link.");
        }
      },
      { 
        enableHighAccuracy: true, 
        timeout: 15000, 
        maximumAge: 0 
      }
    );
  };

  // Open location in Google Maps
  const openInGoogleMaps = () => {
    if (profile.google_maps_link) {
      window.open(profile.google_maps_link, "_blank");
    } else if (profile.google_location?.lat && profile.google_location?.lng) {
      window.open(`https://www.google.com/maps?q=${profile.google_location.lat},${profile.google_location.lng}`, "_blank");
    } else {
      toast.error("No location set. Please enter coordinates or paste a Google Maps link first.");
    }
  };

  // Parse Google Maps link to extract coordinates
  const parseGoogleMapsLink = (link) => {
    if (!link) return;
    
    // Try to extract coordinates from various Google Maps URL formats
    // Format 1: @lat,lng,zoom
    const atMatch = link.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (atMatch) {
      setProfile({
        ...profile,
        google_maps_link: link,
        google_location: { lat: atMatch[1], lng: atMatch[2] }
      });
      toast.success("Coordinates extracted from link!");
      return;
    }
    
    // Format 2: ?q=lat,lng or place/lat,lng
    const qMatch = link.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (qMatch) {
      setProfile({
        ...profile,
        google_maps_link: link,
        google_location: { lat: qMatch[1], lng: qMatch[2] }
      });
      toast.success("Coordinates extracted from link!");
      return;
    }
    
    // If no coordinates found, just save the link
    setProfile({ ...profile, google_maps_link: link });
    toast.info("Link saved. Please also enter coordinates manually for accurate delivery.");
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...profile,
        google_location: profile.google_location.lat ? {
          lat: parseFloat(profile.google_location.lat),
          lng: parseFloat(profile.google_location.lng)
        } : null,
        height: profile.height ? parseFloat(profile.height) : null,
        weight: profile.weight ? parseFloat(profile.weight) : null
      };

      const res = await fetch(`${API}/users/${user.user_id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        credentials: "include"
      });

      if (res.ok) {
        toast.success("Profile saved successfully!");
        // Reload to get updated profile points
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        const err = await res.json();
        throw new Error(err.detail || "Failed to save profile");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const weekDays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

  // Calculate profile completion
  const calculateCompletion = () => {
    let completed = 0;
    let total = 10;
    
    if (profile.address) completed++;
    if (profile.google_location?.lat || profile.google_maps_link) completed++;
    if (profile.height) completed++;
    if (profile.weight) completed++;
    if (profile.allergies.length > 0 || profile.other_allergies) completed++;
    if (profile.lifestyle_diseases.length > 0) completed++;
    if (profile.job_type) completed++;
    if (profile.physical_activity) completed++;
    if (profile.preferred_meals.length > 0) completed++;
    if (profile.delivery_time_window) completed++;
    
    return Math.round((completed / total) * 100);
  };

  const completion = calculateCompletion();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
            <p className="text-sm text-muted-foreground">Complete your profile to earn ₹100</p>
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
                <p className="text-2xl font-bold text-primary">{completion}%</p>
                <p className="text-xs text-muted-foreground">= ₹{completion}</p>
              </div>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary rounded-full transition-all"
                style={{ width: `${completion}%` }}
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
            <div className="grid grid-cols-2 gap-4">
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
            </div>
          </CardContent>
        </Card>

        {/* Delivery Address & Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <MapPin className="w-5 h-5 text-red-500" />
              Delivery Address & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Delivery Address *</Label>
              <Textarea
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                placeholder="Enter your complete delivery address"
                data-testid="address-input"
              />
            </div>

            {/* Google Location */}
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <Label className="font-medium">Google Location (for accurate delivery)</Label>
              
              {/* Paste Google Maps Link */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Option 1: Paste Google Maps Link</Label>
                <Input
                  value={profile.google_maps_link}
                  onChange={(e) => parseGoogleMapsLink(e.target.value)}
                  placeholder="Paste Google Maps link here (e.g., https://maps.google.com/...)"
                  data-testid="google-maps-link-input"
                />
              </div>

              {/* Manual Coordinates */}
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Option 2: Enter Coordinates</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Latitude</Label>
                    <Input
                      value={profile.google_location.lat}
                      onChange={(e) => setProfile({ 
                        ...profile, 
                        google_location: { ...profile.google_location, lat: e.target.value }
                      })}
                      placeholder="e.g., 9.9312"
                      data-testid="lat-input"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Longitude</Label>
                    <Input
                      value={profile.google_location.lng}
                      onChange={(e) => setProfile({ 
                        ...profile, 
                        google_location: { ...profile.google_location, lng: e.target.value }
                      })}
                      placeholder="e.g., 76.2673"
                      data-testid="lng-input"
                    />
                  </div>
                </div>
              </div>

              {/* Get Current Location */}
              <Button type="button" variant="outline" className="w-full" onClick={getLocation} data-testid="get-location-btn">
                <MapPin className="w-4 h-4 mr-2" />
                {profile.google_location.lat ? `📍 Location: ${profile.google_location.lat}, ${profile.google_location.lng}` : "Get Current Location"}
              </Button>
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
                    {profile.allergies.includes(allergy) && <Check className="w-3 h-3 mr-1" />}
                    {allergy}
                  </Badge>
                ))}
              </div>
              {/* Other Allergies */}
              <div className="mt-3">
                <Label className="text-sm text-muted-foreground">Other allergies not listed above</Label>
                <Input
                  value={profile.other_allergies}
                  onChange={(e) => setProfile({ ...profile, other_allergies: e.target.value })}
                  placeholder="e.g., Shellfish, Sesame, Mustard..."
                  data-testid="other-allergies-input"
                />
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
                    {profile.lifestyle_diseases.includes(disease) && <Check className="w-3 h-3 mr-1" />}
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
                  onChange={(e) => setProfile({ ...profile, height: e.target.value })}
                  placeholder="170"
                  data-testid="height-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Weight (kg)</Label>
                <Input
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: e.target.value })}
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

            {/* Smoking & Drinking */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={profile.smoking_status}
                  onCheckedChange={(checked) => setProfile({ ...profile, smoking_status: checked })}
                  data-testid="smoking-checkbox"
                />
                <Label>I smoke</Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={profile.drinking_status}
                  onCheckedChange={(checked) => setProfile({ ...profile, drinking_status: checked })}
                  data-testid="drinking-checkbox"
                />
                <Label>I drink alcohol</Label>
              </div>
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

        {/* Delivery Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-['Outfit']">
              <Clock className="w-5 h-5 text-green-500" />
              Delivery Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Preferred Delivery Time Window */}
            <div className="space-y-3">
              <Label>Preferred Delivery Time Window *</Label>
              <Select
                value={profile.delivery_time_window}
                onValueChange={(v) => setProfile({ ...profile, delivery_time_window: v })}
              >
                <SelectTrigger data-testid="time-window-select">
                  <SelectValue placeholder="Select preferred time" />
                </SelectTrigger>
                <SelectContent>
                  {(constants.delivery_time_windows || [
                    "09:00-10:00", "10:00-11:00", "11:00-12:00", "12:00-13:00", 
                    "13:00-14:00", "14:00-15:00", "18:00-19:00", "19:00-20:00", "20:00-21:00"
                  ]).map((window) => (
                    <SelectItem key={window} value={window}>
                      {window.replace("-", " - ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Note: Lunch cannot be scheduled before 9:30 AM cutoff. Delivery time must be at least 1 hour after cutoff.
              </p>
            </div>

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
                    {profile.preferred_meals.includes(meal) && <Check className="w-4 h-4 mr-1" />}
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
                  <SelectValue placeholder="What is your goal?" />
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
          disabled={saving}
          data-testid="save-profile-btn"
        >
          {saving ? (
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
