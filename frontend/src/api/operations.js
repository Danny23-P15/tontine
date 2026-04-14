import axios from "axios";
import api from "./axios";

const API_URL = "http://localhost:8000/api";

export const respondToOperation = async ({ operationId, decision }) => {
  const response = await axios.post(
    `${API_URL}/operations/respond/`,
    {
      operation_id: operationId,
      decision: decision,
    },
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("access")}`,
      },
    }
  );

  return response.data;
};

export const fetchAdminOperations = async () => {
  const response = await api.get("/admin/operations/");
  return response.data;
};
