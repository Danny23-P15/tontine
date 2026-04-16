import api from "./api";

export const substituteValidator = async ({
  operationId,
  validatorPhone,
  decision,
}) => {
  const response = await api.post(
    `/admin/operations/${operationId}/substitute-validator/`,
    {
      validator_phone_number: validatorPhone,
      decision: decision,
    }
  );

  return response.data;
};