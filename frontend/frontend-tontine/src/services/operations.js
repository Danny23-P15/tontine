import api from "./api";

export const getPendingOperations = () =>
  api.get("operations/pending/");

export const respondToOperation = (payload) =>
  api.post("operations/respond/", payload);
