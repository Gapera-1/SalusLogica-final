import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BaseLayout from "../components/BaseLayout";

const NotificationCenter = ({ setIsAuthenticated, setUser, user }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [statistics, setStatistics] = useState({
    total_notifications: 0,
    email_notifications: 0,
    sms_notifications: 0,
    failed_notifications: 0
  });
  const [filter, setFilter] = useState("all");
  const [checkingMissed, setCheckingMissed] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock notification data
      const mockNotifications = [
        {
          id: 1,
          notification_type: "EMAIL",
          recipient: "john.doe@example.com",
          subject: "Medicine Reminder: Aspirin",
          message: "This is a reminder to take your Aspirin (100mg) at 8:00 AM",
          status: "SENT",
          sent_at: "2024-01-15T08:00:00Z",
          medicine_name: "Aspirin",
          dose_time: "08:00"
        },
        {
          id: 2,
          notification_type: "SMS",
          recipient: "+1234567890",
          subject: "Missed Dose Alert",
          message: "You missed your Metformin dose at 2:00 PM",
          status: "DELIVERED",
          sent_at: "2024-01-15T14:30:00Z",
          medicine_name: "Metformin",
          dose_time: "14:00"
        },
        {
          id: 3,
          notification_type: "EMAIL",
          recipient: "john.doe@example.com",
          subject: "Medicine Refill Reminder",
          message: "Your Atorvastatin prescription is running low. Time to refill!",
          status: "FAILED",
          sent_at: "2024-01-15T10:00:00Z",
          medicine_name: "Atorvastatin",
          dose_time: "20:00"
        },
        {
          id: 4,
          notification_type: "SMS",
          recipient: "+1234567890",
          subject: "Daily Adherence Report",
          message: "Great job! You took all your medications today. Keep it up!",
          status: "SENT",
          sent_at: "2024-01-14T20:00:00Z",
          medicine_name: "Daily Report",
          dose_time: "20:00"
        },
        {
          id: 5,
          notification_type: "EMAIL",
          recipient: "john.doe@example.com",
          subject: "Medicine Interaction Alert",
          message: "Warning: Potential interaction detected between Warfarin and Aspirin",
          status: "SENT",
          sent_at: "2024-01-14T15:00:00Z",
          medicine_name: "Multiple",
          dose_time: "N/A"
        }
      ];
      
      setNotifications(mockNotifications);
      calculateStatistics(mockNotifications);
      setLoading(false);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setLoading(false);
    }
  };

  const calculateStatistics = (notifications) => {
    const stats = {
      total_notifications: notifications.length,
      email_notifications: notifications.filter(n => n.notification_type === "EMAIL").length,
      sms_notifications: notifications.filter(n => n.notification_type === "SMS").length,
      failed_notifications: notifications.filter(n => n.status === "FAILED").length
    };
    setStatistics(stats);
  };

  const checkMissedDoses = async () => {
    setCheckingMissed(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Add new notification for missed doses
      const newNotification = {
        id: notifications.length + 1,
        notification_type: "EMAIL",
        recipient: "john.doe@example.com",
        subject: "Missed Doses Check Complete",
        message: "Found 2 missed doses in the last 24 hours. Check your dose history for details.",
        status: "SENT",
        sent_at: new Date().toISOString(),
        medicine_name: "System Check",
        dose_time: "N/A"
      };
      
      setNotifications(prev => [newNotification, ...prev]);
      calculateStatistics([newNotification, ...notifications]);
    } catch (error) {
      console.error("Error checking missed doses:", error);
    } finally {
      setCheckingMissed(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "EMAIL": return "fas fa-envelope";
      case "SMS": return "fas fa-sms";
      default: return "fas fa-bell";
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case "EMAIL": return "border-blue-500";
      case "SMS": return "border-green-500";
      default: return "border-gray-500";
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "SENT": return "text-green-600 bg-green-100";
      case "DELIVERED": return "text-blue-600 bg-blue-100";
      case "FAILED": return "text-red-600 bg-red-100";
      case "PENDING": return "text-yellow-600 bg-yellow-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredNotifications = notifications.filter(notification => {
    if (filter === "all") return true;
    if (filter === "email") return notification.notification_type === "EMAIL";
    if (filter === "sms") return notification.notification_type === "SMS";
    if (filter === "failed") return notification.status === "FAILED";
    return true;
  });

  if (loading) {
    return (
      <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
        <div className="flex flex-col items-center justify-center min-h-96">
          <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600">Loading notifications...</p>
        </div>
      </BaseLayout>
    );
  }

  return (
    <BaseLayout showNavigation={true} setIsAuthenticated={setIsAuthenticated}>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  <i className="fas fa-bell text-blue-600 mr-2"></i>
                  Notification Center
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Stay updated with your medication reminders
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {statistics.total_notifications} notifications
                </span>
                <button
                  onClick={() => navigate("/medicine-list")}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  <i className="fas fa-pills mr-2"></i>View Medicines
                </button>
                <button
                  onClick={checkMissedDoses}
                  disabled={checkingMissed}
                  className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium disabled:cursor-not-allowed"
                >
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  {checkingMissed ? "Checking..." : "Check Missed Doses"}
                </button>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                  <i className="fas fa-bell text-blue-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Notifications</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total_notifications}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                  <i className="fas fa-envelope text-green-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Email Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.email_notifications}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                  <i className="fas fa-sms text-purple-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">SMS Sent</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.sms_notifications}</p>
                </div>
              </div>
            </div>
            <div className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Failed</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.failed_notifications}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="mb-6 bg-white shadow rounded-lg">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                <button
                  onClick={() => setFilter("all")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm ${
                    filter === "all"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  All Notifications
                </button>
                <button
                  onClick={() => setFilter("email")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm ${
                    filter === "email"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Email
                </button>
                <button
                  onClick={() => setFilter("sms")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm ${
                    filter === "sms"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  SMS
                </button>
                <button
                  onClick={() => setFilter("failed")}
                  className={`py-2 px-4 border-b-2 font-medium text-sm ${
                    filter === "failed"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  Failed
                </button>
              </nav>
            </div>
          </div>

          {/* Notifications List */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              {filteredNotifications.length > 0 ? (
                <div className="space-y-4">
                  {filteredNotifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border-l-4 ${getNotificationColor(notification.notification_type)} bg-gray-50 p-4 rounded-r-lg hover:bg-gray-100 transition-colors`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-2">
                            <div className="flex-shrink-0 mr-3">
                              <i className={`${getNotificationIcon(notification.notification_type)} text-gray-400 text-lg`}></i>
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-gray-900">
                                {notification.subject}
                              </h4>
                              <p className="text-xs text-gray-500">
                                To: {notification.recipient}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>
                              <i className="fas fa-pills mr-1"></i>
                              {notification.medicine_name}
                            </span>
                            <span>
                              <i className="fas fa-clock mr-1"></i>
                              {notification.dose_time}
                            </span>
                            <span>
                              <i className="fas fa-calendar mr-1"></i>
                              {formatDate(notification.sent_at)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(notification.status)}`}>
                            {notification.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <i className="fas fa-inbox text-gray-400 text-4xl mb-4"></i>
                  <p className="text-gray-500">No notifications found</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <button className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex-shrink-0">
                  <i className="fas fa-cog text-blue-600 text-xl"></i>
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-sm font-medium text-gray-900">Notification Settings</h4>
                  <p className="text-xs text-gray-500">Configure your preferences</p>
                </div>
              </button>
              <button className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex-shrink-0">
                  <i className="fas fa-download text-green-600 text-xl"></i>
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-sm font-medium text-gray-900">Export History</h4>
                  <p className="text-xs text-gray-500">Download notification logs</p>
                </div>
              </button>
              <button className="flex items-center p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow">
                <div className="flex-shrink-0">
                  <i className="fas fa-trash text-red-600 text-xl"></i>
                </div>
                <div className="ml-4 text-left">
                  <h4 className="text-sm font-medium text-gray-900">Clear Old</h4>
                  <p className="text-xs text-gray-500">Remove old notifications</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </BaseLayout>
  );
};

export default NotificationCenter;
