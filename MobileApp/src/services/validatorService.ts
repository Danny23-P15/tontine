
import api from './api';

export type ValidatorSuggestion = {
  id: number;
  full_name: string;
  phone_number: string;
};

type ValidatorSuggestionsResponse = {
  results: ValidatorSuggestion[];
};

export const searchValidators = async (
  phone: string
): Promise<ValidatorSuggestion[]> => {
  const response = await api.get<ValidatorSuggestionsResponse>(
    'groups/validator-suggestions/',
    {
      params: { phone },
    }
  );

  return response.data.results;
};
