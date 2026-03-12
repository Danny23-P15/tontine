// notifications.js - Version simplifiée
import api from "./api.js";

export const getPendingNotifications = async () => {
  try {
    const response = await api.get("/notifications/pending");
    return response.data;
  } catch (error) {
    console.error("Erreur récupération notifications:", error);
    throw error;
  }
};

export const getInboxNotifications = async () => {
  const res = await api.get("/notifications/inbox/");
  return res.data;
};

export const respondToGroupCreation = async (payload) => {
  try {
    const response = await api.post("/groups/creation/respond", payload);
    return response.data;
  } catch (error) {
    console.error("Erreur réponse création groupe:", error);
    throw error;
  }
};