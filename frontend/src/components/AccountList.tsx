import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Trash2, Clock, User, Search, ChevronDown, Plus, Eye, Pencil, Globe, Filter } from 'lucide-react';
import type { AccountSummary, SalesforceAccount } from '../types';
import { useApi } from '../hooks/useApi';

interface AccountListProps {
  accounts: AccountSummary[];
  onSelect: (accountName: string) => void;
  onView: (accountName: string) => void;
  onCreate: (accountName: string) => void;
  onDelete: (accountName: string) => void;
  loading: boolean;
}

type Tab = 'mine' | 'all';

export function AccountList({ accounts, onSelect, onView, onCreate, onDelete, loading }: AccountListProps) {
  const { fetchSalesforceAccounts, fetchAllAccounts } = useApi();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [sfAccounts, setSfAccounts] = useState<SalesforceAccount[]>([]);
  const [currentUser, setCurrentUser] = useState<{ email: string; display_name: string } | null>(null);
  const [sfLoading, setSfLoading] = useState(true);
  const [sfSlow, setSfSlow] = useState(false);

  // Tabs
  const [activeTab, setActiveTab] = useState<Tab>('mine');

  // All accounts tab state
  const [allAccounts, setAllAccounts] = useState<AccountSummary[]>([]);
  const [allLoading, setAllLoading] = useState(false);
  const [allLoaded, setAllLoaded] = useState(false);
  const [managerFilter, setManagerFilter] = useState('');
  const [saFilter, setSaFilter] = useState('');

  // Combobox state
  const [comboSearch, setComboSearch] = useState('');
  const [comboOpen, setComboOpen] = useState(false);
  const comboRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const slowTimer = setTimeout(() => setSfSlow(true), 15000);
    (async () => {
      setSfLoading(true);
      const result = await fetchSalesforceAccounts();
      setSfAccounts(result.accounts);
      setCurrentUser(result.user);
      setSfLoading(false);
      setSfSlow(false);
    })();
    return () => clearTimeout(slowTimer);
  }, [fetchSalesforceAccounts]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (comboRef.current && !comboRef.current.contains(e.target as Node)) {
        setComboOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const loadAllAccounts = async () => {
    if (allLoaded) return;
    setAllLoading(true);
    try {
      const data = await fetchAllAccounts();
      setAllAccounts(data);
      setAllLoaded(true);
    } finally {
      setAllLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'all' && !allLoaded) {
      loadAllAccounts();
    }
  };

  const ownerLabel = (email: string | undefined) => {
    if (!email) return '';
    return email.split('@')[0].replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase());
  };

  // Unique managers and SAs for filters
  const managers = Array.from(
    new Set(allAccounts.map(a => a.manager_name).filter(Boolean) as string[])
  ).sort();

  const sas = Array.from(
    new Set(allAccounts.map(a => {
      const creator = a.created_by || a.last_updated_by;
      return creator ? (ownerLabel(creator) || creator) : null;
    }).filter(Boolean) as string[])
  ).sort();

  const filteredAll = allAccounts.filter(a => {
    if (managerFilter && a.manager_name !== managerFilter) return false;
    if (saFilter) {
      const creator = a.created_by || a.last_updated_by;
      const saName = creator ? (ownerLabel(creator) || creator) : '';
      if (saName !== saFilter) return false;
    }
    return true;
  });

  const filteredSf = sfAccounts.filter(a =>
    a.customer_name.toLowerCase().includes(comboSearch.toLowerCase())
  );

  const handleSelectSf = (name: string) => {
    setComboSearch(name);
    setComboOpen(false);
  };

  const handleCreate = () => {
    const name = comboSearch.trim();
    if (name) {
      onCreate(name);
      setComboSearch('');
    }
  };

  const handleDelete = (accountName: string) => {
    if (confirmDelete === accountName) {
      onDelete(accountName);
      setConfirmDelete(null);
    } else {
      setConfirmDelete(accountName);
      setTimeout(() => setConfirmDelete(null), 3000);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };


  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">TAP Map Builder</h1>
        <p className="text-gray-500 text-sm">TAM, Architecture, Powerbase mapping for customer accounts</p>
      </div>

      {/* Current user identity */}
      {currentUser && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 mb-6">
          <div className="w-9 h-9 rounded-full bg-[#FF3621] flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {currentUser.display_name || 'Solution Architect'}
            </p>
            <p className="text-xs text-[#FF3621]">{currentUser.email}</p>
          </div>
          <div className="ml-auto text-xs text-[#FF3621] font-medium bg-orange-100 px-2 py-0.5 rounded-full">
            Solution Architect
          </div>
        </div>
      )}

      {/* New TAP Map — Salesforce combobox */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          New TAP Map
        </h2>
        <div className="flex gap-3">
          {/* Combobox */}
          <div ref={comboRef} className="relative flex-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={comboSearch}
                onChange={e => { setComboSearch(e.target.value); setComboOpen(true); }}
                onFocus={() => setComboOpen(true)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
                placeholder={sfLoading ? (sfSlow ? 'Starting warehouse…' : 'Loading accounts...') : 'Search or enter account name...'}
                disabled={loading}
                className="w-full pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#FF3621] focus:border-[#FF3621] outline-none text-sm disabled:bg-gray-50"
              />
              <button
                onClick={() => setComboOpen(o => !o)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {comboOpen && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                {sfLoading ? (
                  <div className="px-3 py-3 text-xs text-gray-400 text-center">
                    {sfSlow ? 'Starting data warehouse, please wait…' : 'Loading your accounts...'}
                  </div>
                ) : filteredSf.length > 0 ? (
                  filteredSf.map(a => (
                    <button
                      key={a.account_id || a.customer_name}
                      onClick={() => handleSelectSf(a.customer_name)}
                      className="w-full text-left px-3 py-2.5 hover:bg-orange-50 transition-colors"
                    >
                      <div className="text-sm font-medium text-gray-800">{a.customer_name}</div>
                      <div className="text-xs text-gray-400 flex gap-3 mt-0.5">
                        {a.industry && <span>{a.industry}</span>}
                        {a.region && <span>· {a.region}</span>}
                        {a.account_executive && <span>· AE: {a.account_executive}</span>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">
                    {sfAccounts.length === 0
                      ? 'No Salesforce accounts found for your user'
                      : 'No matches — press Enter to create manually'}
                  </div>
                )}
                {comboSearch.trim() && !sfAccounts.find(a => a.customer_name === comboSearch.trim()) && (
                  <button
                    onClick={handleCreate}
                    className="w-full text-left px-3 py-2 text-xs text-[#FF3621] hover:bg-orange-50 border-t border-gray-100 flex items-center gap-1"
                  >
                    <Plus size={12} /> Create "{comboSearch.trim()}" manually
                  </button>
                )}
              </div>
            )}
          </div>

          <button
            onClick={handleCreate}
            disabled={!comboSearch.trim() || loading}
            className="px-5 py-2.5 bg-[#FF3621] text-white rounded-lg hover:bg-[#e02e1b] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm font-medium transition-colors flex-shrink-0"
          >
            <Plus size={16} />
            Open
          </button>
        </div>

        {sfAccounts.length > 0 && (
          <p className="mt-2 text-xs text-gray-400">
            {sfAccounts.length} accounts found in Salesforce for your user
          </p>
        )}
      </div>

      {/* TAP Maps section with tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Tab bar */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => handleTabChange('mine')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'mine'
                ? 'border-[#FF3621] text-[#FF3621]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <MapPin size={15} />
            My TAP Maps
            <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
              activeTab === 'mine' ? 'bg-orange-100 text-[#FF3621]' : 'bg-gray-100 text-gray-500'
            }`}>
              {accounts.length}
            </span>
          </button>
          <button
            onClick={() => handleTabChange('all')}
            className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-[#FF3621] text-[#FF3621]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Globe size={15} />
            All TAP Maps
            {allLoaded && (
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                activeTab === 'all' ? 'bg-orange-100 text-[#FF3621]' : 'bg-gray-100 text-gray-500'
              }`}>
                {allAccounts.length}
              </span>
            )}
          </button>
        </div>

        {/* My TAP Maps tab */}
        {activeTab === 'mine' && (
          <>
            {accounts.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <MapPin size={40} className="mx-auto mb-3 opacity-50" />
                <p>No TAP maps yet. Select a customer above to get started.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {accounts.map(account => (
                  <div
                    key={account.account_name}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <button onClick={() => onView(account.account_name)} className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{account.account_name}</div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(account.last_updated)}
                        </span>
                        <span>{account.sections_filled} sections filled</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={e => { e.stopPropagation(); onView(account.account_name); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-[#FF3621] hover:bg-orange-50 transition-colors"
                        title="View (read-only)"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onSelect(account.account_name); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(account.account_name); }}
                        className={`p-2 rounded-lg transition-colors ${
                          confirmDelete === account.account_name
                            ? 'bg-red-100 text-red-600 hover:bg-red-200'
                            : 'text-gray-300 hover:text-red-500 hover:bg-red-50'
                        }`}
                        title={confirmDelete === account.account_name ? 'Click again to confirm' : 'Delete'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* All TAP Maps tab */}
        {activeTab === 'all' && (
          <>
            {/* Filter bar */}
            {allLoaded && (
              <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-4 flex-wrap">
                <Filter size={14} className="text-gray-400 flex-shrink-0" />
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Manager:</span>
                  <select
                    value={managerFilter}
                    onChange={e => setManagerFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#FF3621]"
                  >
                    <option value="">All</option>
                    {managers.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">SA:</span>
                  <select
                    value={saFilter}
                    onChange={e => setSaFilter(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-[#FF3621]"
                  >
                    <option value="">All</option>
                    {sas.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                {(managerFilter || saFilter) && (
                  <button
                    onClick={() => { setManagerFilter(''); setSaFilter(''); }}
                    className="text-xs text-[#FF3621] hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            )}

            {allLoading ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <div className="w-8 h-8 border-2 border-[#FF3621] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm">Loading all TAP maps…</p>
              </div>
            ) : filteredAll.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400">
                <Globe size={40} className="mx-auto mb-3 opacity-50" />
                <p>{allAccounts.length === 0 ? 'No TAP maps have been created yet.' : 'No maps for the selected district.'}</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredAll.map(account => (
                  <div
                    key={account.account_name}
                    className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <button onClick={() => onView(account.account_name)} className="flex-1 text-left">
                      <div className="font-medium text-gray-900">{account.account_name}</div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <User size={12} />
                          {(() => {
                            const creator = account.created_by || account.last_updated_by;
                            return ownerLabel(creator) || creator || '—';
                          })()}
                        </span>
                        {account.manager_name && (
                          <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500">
                            {account.manager_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatDate(account.last_updated)}
                        </span>
                        <span>{account.sections_filled} sections filled</span>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 ml-3">
                      <button
                        onClick={e => { e.stopPropagation(); onView(account.account_name); }}
                        className="p-2 rounded-lg text-gray-400 hover:text-[#FF3621] hover:bg-orange-50 transition-colors"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
