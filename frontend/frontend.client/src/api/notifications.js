import { api } from "./api";

export async function getNotifications() {
  const { data } = await api.get("/Notifications");
  return data;
}

export async function getUnreadNotificationCount() {
  const { data } = await api.get("/Notifications/unread-count");
  return data.unreadCount;
}

export async function markNotificationAsRead(id) {
  await api.put(`/Notifications/${id}/read`);
}