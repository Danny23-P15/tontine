import { apiFetch } from "./client";

export function getPendingOperations() {
  return apiFetch(`/operations/pending/`);
}

export async function respondToOperation({
  validation_reference,
  accept,
  rejection_reason = null,
}) {
  return apiFetch("/operations/respond/", {
    method: "POST",
    body: JSON.stringify({
      validation_reference,
      accept,
      rejection_reason,
    }),
  });
}


// export function respondToOperation(payload) {
//   return apiFetch("/operations/respond/", {
//     method: "POST",
//     body: JSON.stringify(payload),
//   });
// }
