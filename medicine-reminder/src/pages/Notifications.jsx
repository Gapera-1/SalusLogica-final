import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";

const Notifications = ({ setIsAuthenticated, setUser, user }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data - replace with API calls
    setTimeout(() => {
      setNotifications([
        { 
          id: 1, 
          type: "reminder", 
          title: "Medicine Reminder", 
          message: "Time to take Aspirin (100mg)", 
          time: "2:00 PM", 
          date: "Today",
          read: false,
          priority: "high"
        },
        { 
          id: 2, 
          type: "refill", 
          title: "Low Stock Alert", 
          message: "Vitamin D running low. Only 5 tablets left.", 
          time: "10:00 AM", 
          date: "Today",
          read: false,
          priority: "medium"
        },
        { 
          id: 3, 
          type: "appointment", 
          title: "Appointment Reminder", 
          message: "Doctor appointment tomorrow at 10:00 AM", 
          time: "Yesterday", 
          date: "Feb 10",
          read: true,
          priority: "high"
        },
        { 
          id: 4, 
          type: "system", 
          title: "Profile Updated", 
          message: "Your profile has been successfully updated", 
          time: "2 days ago", 
          date: "Feb 9",
          read: true,
          priority: "low"
        },
        { 
          id: 5, 
          type: "reminder", 
          title: "Missed Dose", 
          message: "You missed your morning dose of Omega-3", 
          time: "3 days ago", 
          date: "Feb 8",
          read: true,
          priority: "high"
        }
      ]);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.read;
    if (filter === "read") return notification.read;
    return true;
  });

  const markAsRead = (id) => {
    setNotifications(notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const deleteNotification = (id) => {
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    if (window.confirm("Are you sure you want to clear all notifications?")) {
      setNotifications([]);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "reminder": return "⏰";
      case "refill": return "🔄";
      case "appointment": return "📅";
      case "system": return "⚙️";
      default: return "📢";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "border-red-500";
      case "medium": return "border-yellow-500";
      case "low": return "border-green-500";
      default: return "border-white border-opacity-30";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
          <p className="text-white mt-4">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white border-opacity-20">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-white text-2xl font-bold mb-1">Notifications</h2>
              <p className="text-purple-200 text-sm">
                {notifications.filter(n => !n.read).length} unread notifications
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={markAllAsRead}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-all duration-300 text-sm"
              >
                Mark All Read
              </button>
              <button
                onClick={clearAllNotifications}
                className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-all duration-300 text-sm"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {["all", "unread", "read"].map(filterType => (
              <button
                key={filterType}
                onClick={() => setFilter(filterType)}
                className={`px-4 py-2 rounded-lg transition-all duration-300 text-sm font-medium ${
                  filter === filterType
                    ? "bg-green-500 text-white"
                    : "bg-white bg-opacity-10 text-white hover:bg-opacity-20"
                }`}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {filterType === "unread" && notifications.filter(n => !n.read).length > 0 && (
                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-12 text-center border border-white border-opacity-20">
              <div className="text-5xl mb-4">🔔</div>
              <h3 className="text-white text-xl font-semibold mb-2">No notifications</h3>
              <p className="text-purple-200 text-sm">
                {filter === "unread" ? "All notifications have been read" : "No notifications found"}
              </p>
            </div>
          ) : (
            filteredNotifications.map(notification => (
              <div
                key={notification.id}
                className={`bg-white bg-opacity-10 backdrop-blur-md rounded-2xl p-5 border-l-4 transition-all duration-300 hover:bg-opacity-20 ${
                  notification.read 
                    ? "border-white border-opacity-30" 
                    : `border-l-4 ${getPriorityColor(notification.priority)}`
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className="text-3xl bg-white bg-opacity-10 w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-white font-semibold text-base">{notification.title}</h4>
                        <p className="text-purple-200 text-sm mt-1">{notification.message}</p>
                      </div>
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="text-white text-opacity-60 hover:text-opacity-100 ml-4 transition-opacity"
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <span className="text-purple-300 text-xs">
                          {notification.date} at {notification.time}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          notification.priority === "high" ? "bg-red-500 text-white" :
                          notification.priority === "medium" ? "bg-yellow-500 text-white" :
                          "bg-green-500 text-white"
                        }`}>
                          {notification.priority}
                        </span>
                      </div>
                      
                      {!notification.read && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="bg-green-500 text-white px-3 py-1 rounded-lg text-xs hover:bg-green-600 transition-colors"
                        >
                          Mark as Read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Settings Link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/profile")}
            className="bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg border border-white border-opacity-30 hover:bg-opacity-30 transition-all duration-300 font-medium hover:-translate-y-0.5"
          >
            Notification Settings
          </button>
        </div>
      </div>
    </BaseLayout>
  );
};

export default Notifications;
