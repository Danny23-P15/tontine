import api from "./api";        

export const getMyGroups = async () => {
    const response = await api.get("/groups/my-groups/");
    return response.data;
};

export const getGroupDetail = async (groupId) => {
    const response = await api.get(`/groups/${groupId}/`);
    return response.data;
};