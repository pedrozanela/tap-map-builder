import { useState, useCallback } from 'react';
import type {
  TapStructure, AccountSummary, TapMapEntry, TapMapData,
  AccountMetadata, SalesforceAccount, AccountSpend, ApprovalInfo,
} from '../types';

const API_BASE = '/api';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'API request failed');
  }
  return res.json();
}

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const clearError = useCallback(() => setError(null), []);

  const fetchMe = useCallback(async (): Promise<{ email: string; display_name: string }> => {
    try {
      return await apiFetch('/me');
    } catch {
      return { email: '', display_name: '' };
    }
  }, []);

  const fetchSalesforceAccounts = useCallback(async (): Promise<{
    accounts: SalesforceAccount[];
    user: { email: string; display_name: string };
  }> => {
    try {
      return await apiFetch('/salesforce/accounts');
    } catch {
      return { accounts: [], user: { email: '', display_name: '' } };
    }
  }, []);

  const fetchAccountSpend = useCallback(async (accountName: string): Promise<AccountSpend> => {
    try {
      return await apiFetch(`/salesforce/account-spend/${encodeURIComponent(accountName)}`);
    } catch {
      return { total_value: 0, commitment_type: '', contracts: [] };
    }
  }, []);

  const fetchStructure = useCallback(async (): Promise<TapStructure> => {
    setLoading(true);
    setError(null);
    try {
      return await apiFetch<TapStructure>('/structure');
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAccounts = useCallback(async (): Promise<AccountSummary[]> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ accounts: AccountSummary[] }>('/accounts');
      return data.accounts;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAllAccounts = useCallback(async (): Promise<AccountSummary[]> => {
    try {
      const data = await apiFetch<{ accounts: AccountSummary[] }>('/accounts/all');
      return data.accounts;
    } catch (e: any) {
      setError(e.message);
      throw e;
    }
  }, []);

  const fetchTapMap = useCallback(async (accountName: string): Promise<TapMapData> => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<{ entries: TapMapEntry[] }>(`/tap-map/${encodeURIComponent(accountName)}`);
      const map: TapMapData = {};
      for (const entry of data.entries) {
        map[`${entry.section}::${entry.subsection}`] = entry;
      }
      return map;
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetadata = useCallback(async (accountName: string): Promise<AccountMetadata> => {
    try {
      return await apiFetch(`/tap-map/${encodeURIComponent(accountName)}/metadata`);
    } catch {
      return { responsible: [], consulted: [], informed: [] };
    }
  }, []);

  const saveMetadata = useCallback(async (accountName: string, meta: AccountMetadata): Promise<void> => {
    await apiFetch(`/tap-map/${encodeURIComponent(accountName)}/metadata`, {
      method: 'PUT',
      body: JSON.stringify(meta),
    });
  }, []);

  const saveTapMap = useCallback(async (accountName: string, entries: TapMapEntry[]): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/tap-map/${encodeURIComponent(accountName)}`, {
        method: 'POST',
        body: JSON.stringify({ entries }),
      });
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTapMap = useCallback(async (accountName: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/tap-map/${encodeURIComponent(accountName)}`, { method: 'DELETE' });
    } catch (e: any) {
      setError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchManager = useCallback(async (): Promise<{ manager_email: string; manager_name: string; manager_title: string }> => {
    try {
      return await apiFetch('/me/manager');
    } catch {
      return { manager_email: '', manager_name: '', manager_title: '' };
    }
  }, []);

  const fetchApproval = useCallback(async (accountName: string): Promise<ApprovalInfo> => {
    try {
      return await apiFetch(`/tap-map/${encodeURIComponent(accountName)}/approval`);
    } catch {
      return { account_name: accountName, status: 'draft' };
    }
  }, []);

  const submitForApproval = useCallback(async (accountName: string, managerEmail: string): Promise<string> => {
    const res = await apiFetch<{ status: string; token: string }>(`/tap-map/${encodeURIComponent(accountName)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ manager_email: managerEmail }),
    });
    return res.token;
  }, []);

  const fetchReview = useCallback(async (token: string): Promise<ApprovalInfo> => {
    return apiFetch(`/review/${encodeURIComponent(token)}`);
  }, []);

  const approveReview = useCallback(async (token: string): Promise<void> => {
    await apiFetch(`/review/${encodeURIComponent(token)}/approve`, { method: 'POST' });
  }, []);

  const rejectReview = useCallback(async (token: string, comments: string): Promise<void> => {
    await apiFetch(`/review/${encodeURIComponent(token)}/reject`, {
      method: 'POST',
      body: JSON.stringify({ comments }),
    });
  }, []);

  return {
    loading, error, clearError,
    fetchMe, fetchSalesforceAccounts, fetchAccountSpend,
    fetchStructure, fetchAccounts, fetchAllAccounts, fetchTapMap, fetchMetadata,
    saveMetadata, saveTapMap, deleteTapMap,
    fetchManager, fetchApproval, submitForApproval, fetchReview, approveReview, rejectReview,
  };
}
