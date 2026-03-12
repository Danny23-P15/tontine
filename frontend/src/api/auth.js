import { apiFetch } from "./client";

export function login(phone_number, password) {
  return apiFetch("/auth/login/", {
    method: "POST",
    body: JSON.stringify({
      phone_number,
      password,
    }),
  });
}
