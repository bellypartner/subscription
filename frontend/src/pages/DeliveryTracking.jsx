import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { toast } from "sonner";
import { ArrowLeft, Phone, MapPin, Clock, Truck, User, Package } from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

const createIcon = (color, emoji) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 40px; height: 40px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; font-size: 20px;">
      ${emoji}
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const homeIcon = createIcon("#2F855A", "🏠");
const truckIcon = createIcon("#DD6B20", "🚚");
const kitchenIcon = createIcon("#3B82F6", "👨‍🍳");

function MapFitter({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.length >= 2) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function DeliveryTracking({ user }) {
  const { deliveryId } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState(null);
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null);
  const [kitchen, setKitchen] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDelivery();
    // Poll for updates every 10 seconds
    const interval = setInterval(fetchDelivery, 10000);
    return () => clearInterval(interval);
  }, [deliveryId]);

  const fetchDelivery = async () => {
    try {
      const response = await fetch(`${API}/deliveries?user_id=${user?.user_id}`, {
        credentials: "include"
      });
      
      if (response.ok) {
        const deliveries = await response.json();
        const found = deliveries.find(d => d.delivery_id === deliveryId);
        if (found) {
          setDelivery(found);
          
          // Fetch kitchen location
          if (found.kitchen_id) {
            const kitchenRes = await fetch(`${API}/kitchens/${found.kitchen_id}`);
            if (kitchenRes.ok) {
              setKitchen(await kitchenRes.json());
            }
          }
          
          // Get delivery boy location from assignment
          if (found.delivery_boy_id) {
            const assignRes = await fetch(
              `${API}/delivery-assignments?delivery_boy_id=${found.delivery_boy_id}&date=${found.delivery_date}`,
              { credentials: "include" }
            );
            if (assignRes.ok) {
              const assignments = await assignRes.json();
              if (assignments.length > 0 && assignments[0].current_location) {
                setDeliveryBoyLocation(assignments[0].current_location);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch delivery");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: "bg-blue-100 text-blue-700",
      preparing: "bg-yellow-100 text-yellow-700",
      ready: "bg-purple-100 text-purple-700",
      dispatched: "bg-orange-100 text-orange-700",
      in_transit: "bg-orange-100 text-orange-700",
      delivered: "bg-green-100 text-green-700"
    };
    return colors[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusStep = (status) => {
    const steps = ["preparing", "ready", "dispatched", "in_transit", "delivered"];
    return steps.indexOf(status) + 1;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Delivery not found</p>
          <Button onClick={() => navigate("/dashboard")} className="mt-4">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const customerLocation = delivery.location?.lat ? [delivery.location.lat, delivery.location.lng] : null;
  const kitchenLocation = kitchen?.location?.lat ? [kitchen.location.lat, kitchen.location.lng] : null;
  const driverLocation = deliveryBoyLocation?.lat ? [deliveryBoyLocation.lat, deliveryBoyLocation.lng] : null;

  const mapBounds = [customerLocation, kitchenLocation, driverLocation].filter(Boolean);

  return (
    <div className="min-h-screen bg-background" data-testid="delivery-tracking">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="back-btn">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold font-['Outfit']">Track Delivery</h1>
            <p className="text-sm text-muted-foreground">
              {format(new Date(delivery.delivery_date), "EEEE, MMMM d")}
            </p>
          </div>
          <Badge className={getStatusColor(delivery.status)}>
            {delivery.status.replace("_", " ").toUpperCase()}
          </Badge>
        </div>
      </header>

      {/* Map */}
      <div className="h-[40vh] relative">
        {customerLocation ? (
          <MapContainer
            center={customerLocation}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {mapBounds.length >= 2 && <MapFitter bounds={mapBounds} />}
            
            {/* Customer Location */}
            <Marker position={customerLocation} icon={homeIcon}>
              <Popup>
                <div className="text-center">
                  <p className="font-semibold">Your Location</p>
                  <p className="text-sm text-muted-foreground">{delivery.address}</p>
                </div>
              </Popup>
            </Marker>
            
            {/* Kitchen Location */}
            {kitchenLocation && (
              <Marker position={kitchenLocation} icon={kitchenIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">{kitchen.name}</p>
                    <p className="text-sm text-muted-foreground">{kitchen.address}</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Delivery Boy Location */}
            {driverLocation && (
              <Marker position={driverLocation} icon={truckIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">Delivery Partner</p>
                    <p className="text-sm text-muted-foreground">On the way!</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Route line */}
            {kitchenLocation && driverLocation && (
              <Polyline
                positions={[kitchenLocation, driverLocation]}
                color="#DD6B20"
                weight={3}
                dashArray="10, 10"
              />
            )}
            {driverLocation && customerLocation && (
              <Polyline
                positions={[driverLocation, customerLocation]}
                color="#2F855A"
                weight={3}
              />
            )}
          </MapContainer>
        ) : (
          <div className="h-full flex items-center justify-center bg-muted">
            <p className="text-muted-foreground">Location not available</p>
          </div>
        )}
      </div>

      {/* Status Progress */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Delivery Progress</h3>
            <div className="flex items-center justify-between relative">
              <div className="absolute top-4 left-0 right-0 h-1 bg-muted" />
              <div
                className="absolute top-4 left-0 h-1 bg-primary transition-all"
                style={{ width: `${(getStatusStep(delivery.status) / 5) * 100}%` }}
              />
              
              {[
                { key: "preparing", label: "Preparing", icon: "👨‍🍳" },
                { key: "ready", label: "Ready", icon: "✅" },
                { key: "dispatched", label: "Dispatched", icon: "📦" },
                { key: "in_transit", label: "On the way", icon: "🚚" },
                { key: "delivered", label: "Delivered", icon: "🎉" }
              ].map((step, i) => {
                const isActive = getStatusStep(delivery.status) >= i + 1;
                const isCurrent = delivery.status === step.key;
                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                        isActive
                          ? isCurrent
                            ? "bg-primary scale-125 shadow-lg"
                            : "bg-primary"
                          : "bg-muted"
                      }`}
                    >
                      {step.icon}
                    </div>
                    <span className={`text-xs mt-2 ${isActive ? "font-medium" : "text-muted-foreground"}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Delivery Info */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Delivery Address
              </h4>
              <p className="text-muted-foreground">{delivery.address}</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Package className="w-4 h-4" />
                Order Details
              </h4>
              <div className="flex flex-wrap gap-2">
                {delivery.meals.map((meal) => (
                  <Badge key={meal} variant="secondary" className="capitalize">
                    {meal}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Menu Items */}
        {delivery.menu_items?.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-4">
              <h4 className="font-semibold mb-3">Today's Menu</h4>
              <div className="space-y-3">
                {delivery.menu_items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{item.calories} kcal</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timestamps */}
        <Card className="mt-4">
          <CardContent className="p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Timeline
            </h4>
            <div className="space-y-2 text-sm">
              {delivery.dispatched_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dispatched</span>
                  <span>{format(new Date(delivery.dispatched_at), "h:mm a")}</span>
                </div>
              )}
              {delivery.delivered_at && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Delivered</span>
                  <span>{format(new Date(delivery.delivered_at), "h:mm a")}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
