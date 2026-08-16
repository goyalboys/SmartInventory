import { useEffect, useState } from "react";
import api from "../services/api";

function NotificationsBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const response = await api.get("/notifications");
      setNotifications(response.data.notifications);
      setUnreadCount(response.data.unreadCount);
    } catch {
      setNotifications([]);
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) loadNotifications();
  };

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    loadNotifications();
  };

  const markAllRead = async () => {
    await api.patch("/notifications/read-all");
    loadNotifications();
  };

  return (
    <div className="notifications-wrap">
      <button type="button" className="btn btn-secondary btn-sm notif-btn" onClick={handleOpen}>
        🔔
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notif-panel card">
          <div className="notif-panel-header">
            <strong>Notifications</strong>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="muted small">No notifications yet.</p>
          ) : (
            <ul className="notif-list">
              {notifications.map((notification) => (
                <li
                  key={notification._id}
                  className={notification.read ? "notif-item read" : "notif-item"}
                  onClick={() => !notification.read && markRead(notification._id)}
                >
                  <strong>{notification.title}</strong>
                  <p className="small muted">{notification.message}</p>
                  <span className="small muted">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationsBell;
