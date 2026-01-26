import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { ScrollArea } from "../components/ui/scroll-area";
import { toast } from "sonner";
import {
  Truck, LogOut, MapPin, CheckCircle2, Navigation, Phone,
  Package, Clock, ChevronRight, RefreshCw
} from "lucide-react";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

// Fix Leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png"
});

// Custom icons
const createCustomIcon = (color) => {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: ${color}; width: 30px; height: 30px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
    </div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30]
  });
};

const deliveryIcon = createCustomIcon("#DD6B20");
const completedIcon = createCustomIcon("#2F855A");
const currentIcon = createCustomIcon("#3B82F6");

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 13);
    }
  }, [center, map]);
  return null;
}

export default function DeliveryDashboard({ user }) {
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(true);
  const watchId = useRef(null);

  useEffect(() => {
    fetchDeliveries();
    startLocationTracking();
    
    return () => {
      if (watchId.current) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, [user]);

  const startLocationTracking = () => {
    if (navigator.geolocation) {
      watchId.current = navigator.geolocation.watchPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => console.error("Location error:", error),
        { enableHighAccuracy: true, maximumAge: 10000 }
      );
    }
  };

  const fetchDeliveries = async () => {
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const response = await fetch(
        `${API}/deliveries?delivery_boy_id=${user?.user_id}&date=${today}`,
        { credentials: "include" }
      );
      
      if (response.ok) {
        const data = await response.json();
        setDeliveries(data);
        if (data.length > 0 && !selectedDelivery) {
          setSelectedDelivery(data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch deliveries");
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
        toast.success(newStatus === "delivered" ? "Delivery completed!" : "Status updated");
        fetchDeliveries();
      }
    } catch (err) {
      toast.error("Failed to update status");
    }
  };

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

  const pendingDeliveries = deliveries.filter(d => d.status !== "delivered" && d.status !== "cancelled");
  const completedDeliveries = deliveries.filter(d => d.status === "delivered");

  // Calculate map center
  const mapCenter = selectedDelivery?.location?.lat 
    ? [selectedDelivery.location.lat, selectedDelivery.location.lng]
    : currentLocation 
    ? [currentLocation.lat, currentLocation.lng]
    : [12.9716, 77.5946]; // Default: Bangalore

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background" data-testid="delivery-dashboard">
      {/* Header */}
      <header className="flex-shrink-0 bg-white/80 backdrop-blur-xl border-b z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
              <Truck className="w-5 h-5 text-accent-foreground" />
            </div>
            <div>
              <h1 className="font-bold font-['Outfit'] text-lg">Delivery Route</h1>
              <p className="text-sm text-muted-foreground">
                {pendingDeliveries.length} pending • {completedDeliveries.length} completed
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="md:hidden"
              onClick={() => setShowList(!showList)}
            >
              {showList ? "Map" : "List"}
            </Button>
            <Button variant="ghost" size="icon" onClick={fetchDeliveries}>
              <RefreshCw className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="logout-btn">
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content - Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* Map */}
        <div className={`flex-1 relative ${!showList ? "block" : "hidden md:block"}`}>
          <MapContainer
            center={mapCenter}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            className="z-0"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController center={mapCenter} />
            
            {/* Current Location */}
            {currentLocation && (
              <Marker position={[currentLocation.lat, currentLocation.lng]} icon={currentIcon}>
                <Popup>
                  <div className="text-center">
                    <p className="font-semibold">Your Location</p>
                  </div>
                </Popup>
              </Marker>
            )}
            
            {/* Delivery Markers */}
            {deliveries.map((delivery, index) => (
              delivery.location?.lat && (
                <Marker
                  key={delivery.delivery_id}
                  position={[delivery.location.lat, delivery.location.lng]}
                  icon={delivery.status === "delivered" ? completedIcon : deliveryIcon}
                  eventHandlers={{
                    click: () => setSelectedDelivery(delivery)
                  }}
                >
                  <Popup>
                    <div className="min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Stop #{index + 1}</span>
                        <Badge className={getStatusColor(delivery.status)}>
                          {delivery.status}
                        </Badge>
                      </div>
                      <p className="font-medium">{delivery.customer?.name}</p>
                      <p className="text-sm text-muted-foreground">{delivery.address}</p>
                      {delivery.customer?.phone && (
                        <a
                          href={`tel:${delivery.customer.phone}`}
                          className="flex items-center gap-1 text-sm text-primary mt-2"
                        >
                          <Phone className="w-3 h-3" />
                          {delivery.customer.phone}
                        </a>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        {/* Delivery List */}
        <div className={`w-full md:w-96 bg-background border-l flex flex-col ${showList ? "block" : "hidden md:block"}`}>
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {deliveries.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No deliveries assigned</p>
                </div>
              ) : (
                <>
                  {/* Pending */}
                  {pendingDeliveries.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Pending ({pendingDeliveries.length})
                      </h3>
                      {pendingDeliveries.map((delivery, index) => (
                        <Card
                          key={delivery.delivery_id}
                          className={`cursor-pointer transition-all ${
                            selectedDelivery?.delivery_id === delivery.delivery_id
                              ? "ring-2 ring-primary shadow-md"
                              : "hover:shadow-md"
                          }`}
                          onClick={() => setSelectedDelivery(delivery)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold">
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="font-medium">{delivery.customer?.name}</p>
                                  <div className="flex gap-1 mt-1">
                                    {delivery.meals.map((meal) => (
                                      <Badge key={meal} variant="outline" className="text-xs capitalize">
                                        {meal}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              <Badge className={getStatusColor(delivery.status)}>
                                {delivery.status.replace("_", " ")}
                              </Badge>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {delivery.address}
                            </p>
                            
                            <div className="flex gap-2">
                              {delivery.customer?.phone && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  asChild
                                >
                                  <a href={`tel:${delivery.customer.phone}`}>
                                    <Phone className="w-4 h-4 mr-1" />
                                    Call
                                  </a>
                                </Button>
                              )}
                              {delivery.location?.lat && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="flex-1"
                                  asChild
                                >
                                  <a
                                    href={`https://www.google.com/maps/dir/?api=1&destination=${delivery.location.lat},${delivery.location.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Navigation className="w-4 h-4 mr-1" />
                                    Navigate
                                  </a>
                                </Button>
                              )}
                            </div>
                            
                            {["dispatched", "in_transit"].includes(delivery.status) && (
                              <Button
                                className="w-full mt-3 bg-green-600 hover:bg-green-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(delivery.delivery_id, "delivered");
                                }}
                                data-testid={`complete-${delivery.delivery_id}`}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                Mark as Delivered
                              </Button>
                            )}
                            
                            {delivery.status === "ready" && (
                              <Button
                                className="w-full mt-3"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateStatus(delivery.delivery_id, "in_transit");
                                }}
                                data-testid={`start-${delivery.delivery_id}`}
                              >
                                <Truck className="w-4 h-4 mr-2" />
                                Start Delivery
                              </Button>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                  
                  {/* Completed */}
                  {completedDeliveries.length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                        Completed ({completedDeliveries.length})
                      </h3>
                      {completedDeliveries.map((delivery) => (
                        <Card
                          key={delivery.delivery_id}
                          className="bg-green-50/50 border-green-100"
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="w-5 h-5 text-green-600" />
                                <div>
                                  <p className="font-medium">{delivery.customer?.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {delivery.delivered_at && format(new Date(delivery.delivered_at), "h:mm a")}
                                  </p>
                                </div>
                              </div>
                              <Badge className="bg-green-100 text-green-700">Delivered</Badge>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
