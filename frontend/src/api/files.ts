import { useEffect, useState } from 'react';
import { api, ApiError, resolveFileUrl } from './client';

// Uploaded files are private. To open one, we first ask the server for a short link to that ONE file.
// The server only gives a link to people who are allowed to see the file.

/** The message to show a person when a file could not be opened. */
export const fileErrorMessage = (err: unknown): string =>
  err instanceof ApiError
    ? err.message
    : 'We could not open this file. Please check your internet connection and try again.';

/**
 * Asks for a short link (valid for about 10 minutes) to one file.
 * `storedUrl` is the address saved with the paper. `name` is the file name used when downloading.
 */
export async function getFileLink(storedUrl: string, mode: 'view' | 'download' = 'view', name?: string): Promise<string> {
  const res = await api.post('/uploads/access', { file: storedUrl, mode, name });
  return resolveFileUrl(res.path);
}

/** Opens a file in a new tab. */
export async function openFile(storedUrl: string): Promise<void> {
  // Open the tab first, in the same click: browsers block tabs that are opened after waiting.
  const tab = window.open('', '_blank');
  try {
    const url = await getFileLink(storedUrl, 'view');
    if (tab) tab.location.href = url;
    else window.open(url, '_blank');
  } catch (err) {
    tab?.close();
    throw err;
  }
}

/** Downloads a file to the person's computer. */
export async function downloadFile(storedUrl: string, name?: string): Promise<void> {
  const url = await getFileLink(storedUrl, 'download', name);
  const link = document.createElement('a');
  link.href = url;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

interface FileLinkState {
  url?: string;
  error?: string;
  loading: boolean;
}

/**
 * For a viewer that sits inside the page: gets a link for the file and gives it back when ready.
 * Pass undefined when there is no file.
 */
export function useFileLink(storedUrl?: string): FileLinkState {
  const [state, setState] = useState<FileLinkState>({ loading: false });

  useEffect(() => {
    if (!storedUrl) {
      setState({ loading: false });
      return;
    }
    let cancelled = false;
    setState({ loading: true });
    getFileLink(storedUrl, 'view')
      .then(url => { if (!cancelled) setState({ url, loading: false }); })
      .catch(err => { if (!cancelled) setState({ loading: false, error: fileErrorMessage(err) }); });
    return () => { cancelled = true; };
  }, [storedUrl]);

  return state;
}
