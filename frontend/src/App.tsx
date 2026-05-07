import React, { useState, useEffect, useCallback } from 'react';
import { AccountList } from './components/AccountList';
import { TapMapEditor } from './components/TapMapEditor';
import { TapMapViewer } from './components/TapMapViewer';
import { ReviewPage } from './components/ReviewPage';
import { useApi } from './hooks/useApi';
import type { AccountSummary } from './types';
import { Loader2, AlertCircle } from 'lucide-react';

// Check for manager review token in URL
const REVIEW_TOKEN = new URLSearchParams(window.location.search).get('review_token');

type View = { type: 'list' } | { type: 'editor'; accountName: string } | { type: 'viewer'; accountName: string };

export default function App() {
  const { loading, error, clearError, fetchAccounts, deleteTapMap } = useApi();
  const [view, setView] = useState<View>({ type: 'list' });
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [initialLoad, setInitialLoad] = useState(true);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch {
      // error is set by useApi
    } finally {
      setInitialLoad(false);
    }
  }, [fetchAccounts]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const handleSelect = (accountName: string) => {
    setView({ type: 'editor', accountName });
  };

  const handleView = (accountName: string) => {
    setView({ type: 'viewer', accountName });
  };

  const handleCreate = (accountName: string) => {
    // Navigate directly to editor; save will create the record
    setView({ type: 'editor', accountName });
  };

  const handleDelete = async (accountName: string) => {
    try {
      await deleteTapMap(accountName);
      setAccounts(prev => prev.filter(a => a.account_name !== accountName));
    } catch {
      // error displayed by useApi
    }
  };

  const handleBack = () => {
    setView({ type: 'list' });
    loadAccounts();
  };

  // Manager review flow — bypass normal app
  if (REVIEW_TOKEN) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="no-print text-white shadow-lg" style={{ backgroundColor: '#1C2D35' }}>
          <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center gap-3">
            <img src="https://cdn.simpleicons.org/databricks/FF3621" alt="Databricks" className="w-7 h-7" />
            <span className="font-bold text-base tracking-tight" style={{ color: '#FF3621' }}>Databricks</span>
            <span className="text-white/40 text-sm">|</span>
            <span className="font-medium text-sm text-white/90">TAP Map — Revisão</span>
          </div>
        </header>
        <main className="px-6 py-8">
          <ReviewPage
            token={REVIEW_TOKEN}
            onDone={() => { window.history.replaceState({}, '', '/'); window.location.reload(); }}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="no-print text-white shadow-lg" style={{ backgroundColor: '#1C2D35' }}>
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Databricks logo */}
            <img
              src="https://cdn.simpleicons.org/databricks/FF3621"
              alt="Databricks"
              className="w-7 h-7"
            />
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight" style={{ color: '#FF3621' }}>Databricks</span>
              <span className="text-white/40 text-sm">|</span>
              <span className="font-medium text-sm text-white/90">TAP Map Builder</span>
            </div>
          </div>
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Field Engineering</span>
        </div>
      </header>

      {/* Content */}
      <main className="px-6 py-8">
        {/* Global error */}
        {error && view.type === 'list' && (
          <div className="max-w-3xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
            <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
          </div>
        )}

        {initialLoad ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin text-[#FF3621]" />
            <span className="ml-3 text-gray-500">Loading...</span>
          </div>
        ) : view.type === 'list' ? (
          <AccountList
            accounts={accounts}
            onSelect={handleSelect}
            onView={handleView}
            onCreate={handleCreate}
            onDelete={handleDelete}
            loading={loading}
          />
        ) : view.type === 'viewer' ? (
          <TapMapViewer
            accountName={view.accountName}
            onBack={handleBack}
          />
        ) : (
          <TapMapEditor
            accountName={view.accountName}
            onBack={handleBack}
          />
        )}
      </main>
    </div>
  );
}
