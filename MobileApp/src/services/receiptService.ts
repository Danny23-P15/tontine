import { fetch } from 'expo/fetch';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import api from './api';
import { getAccessToken } from './tokenService';

const PDF = 'application/pdf';

export async function downloadReceipt(reference: string): Promise<File> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Session expirée. Reconnecte-toi.');
  }

  const url = `${api.defaults.baseURL}operations/${encodeURIComponent(reference)}/receipt/`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let detail = 'Impossible de télécharger le justificatif.';
    try {
      const data = await response.json();
      if (data?.detail) detail = data.detail;
    } catch {
      // réponse non JSON : on garde le message par défaut
    }
    throw new Error(detail);
  }

  const safeName = reference.replace(/[^\w-]/g, '_');
  const file = new File(Paths.cache, `justificatif-${safeName}.pdf`);
  await file.write(await response.bytes());
  return file;
}

export async function openReceipt(file: File): Promise<void> {
  try {
    if (await file.canPreview({ mimeType: PDF })) {
      await file.preview({ title: 'Justificatif', mimeType: PDF });
      return;
    }
  } catch {
    // pas de visionneuse : on bascule sur le partage
  }

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Justificatif de transaction',
      mimeType: PDF,
    });
    return;
  }

  throw new Error("Aucune application ne peut ouvrir ce PDF sur cet appareil.");
}