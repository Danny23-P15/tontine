import api from "./api";        

export const getMyGroups = async () => {
    const response = await api.get("/groups/my-groups/");
    return response.data;
};

export const getGroupDetail = async (groupId) => {
    const response = await api.get(`/groups/${groupId}/`);
    return response.data;
};

export async function requestRemoveValidator(groupId, validatorPhone) {
  const response = await fetch(
    `http://127.0.0.1:8000/api/groups/${groupId}/remove-validator/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("access_token")}`,
      },
      body: JSON.stringify({
        validator_phone_number: validatorPhone,
      }),
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Erreur suppression");
  }

  return data;
}
