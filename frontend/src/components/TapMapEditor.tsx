import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, Save, Printer, Loader2, AlertCircle, CheckCircle, DollarSign, Plus, X, Send, Clock, ThumbsUp, ThumbsDown, Mail, Copy, Check } from 'lucide-react';
import { TapMapGrid } from './TapMapGrid';
import { useApi } from '../hooks/useApi';
import type { TapStructure, TapMapData, TapMapEntry, AccountMetadata, AccountSpend, RaciPerson, ApprovalInfo } from '../types';

interface TapMapEditorProps {
  accountName: string;
  onBack: () => void;
}

// ── RACI person chip ──────────────────────────────────────────────────────────
function PersonChip({ person, onRemove }: { person: RaciPerson; onRemove: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 bg-white border border-gray-200 rounded-lg px-2 py-1 text-xs shadow-sm">
      <span className="font-bold text-gray-500">{person.role}:</span>
      <span className="text-gray-700">{person.name}</span>
      <button
        onClick={onRemove}
        className="ml-0.5 text-gray-300 hover:text-red-400 transition-colors"
      >
        <X size={10} />
      </button>
    </div>
  );
}

// ── Inline add-person form ────────────────────────────────────────────────────
function AddPersonForm({ onAdd }: { onAdd: (p: RaciPerson) => void }) {
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState('');
  const [name, setName] = useState('');

  const submit = () => {
    const r = role.trim();
    const n = name.trim();
    if (r && n) {
      onAdd({ role: r, name: n });
      setRole('');
      setName('');
      setOpen(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] text-gray-400 border border-dashed border-gray-300 rounded-lg px-2 py-1 hover:border-[#FF3621] hover:text-[#FF3621] transition-colors"
      >
        <Plus size={10} /> Add
      </button>
    );
  }

  return (
    <div className="inline-flex items-center gap-1">
      <input
        autoFocus
        type="text"
        value={role}
        onChange={e => setRole(e.target.value)}
        placeholder="Role (AE, SA...)"
        className="w-24 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#FF3621] outline-none"
        onKeyDown={e => { if (e.key === 'Enter') name ? submit() : undefined; if (e.key === 'Escape') setOpen(false); }}
      />
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="Full name"
        className="w-32 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-[#FF3621] outline-none"
        onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') setOpen(false); }}
      />
      <button
        onClick={submit}
        className="p-1 bg-[#FF3621] text-white rounded hover:bg-[#e02e1b] transition-colors"
      >
        <Plus size={12} />
      </button>
      <button
        onClick={() => { setOpen(false); setRole(''); setName(''); }}
        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function TrafficLegend() {
  return (
    <div className="flex items-center gap-4 text-[10px] text-gray-500">
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300 inline-block" /> No tools</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> No Databricks</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400 inline-block" /> Databricks present</span>
      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> Databricks primary</span>
    </div>
  );
}

// ── Submit for approval modal ──────────────────────────────────────────────────
function SubmitApprovalModal({ accountName, onSubmit, onClose, fetchManager }: {
  accountName: string;
  onSubmit: (managerEmail: string) => Promise<string>;
  onClose: () => void;
  fetchManager: () => Promise<{ manager_email: string; manager_name: string; manager_title: string }>;
}) {
  const [email, setEmail] = useState('');
  const [managerName, setManagerName] = useState('');
  const [loadingManager, setLoadingManager] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState('');
  const [reviewToken, setReviewToken] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchManager().then(m => {
      if (m.manager_email) { setEmail(m.manager_email); setManagerName(m.manager_name); }
      setLoadingManager(false);
    });
  }, []);

  const handle = async () => {
    if (!email.trim() || !email.includes('@')) { setErr('E-mail inválido.'); return; }
    setSubmitting(true);
    setErr('');
    try {
      const token = await onSubmit(email.trim());
      setReviewToken(token);
    } catch (e: any) {
      setErr(e.message || 'Erro ao enviar.');
      setSubmitting(false);
    }
  };

  const reviewUrl = reviewToken
    ? `${window.location.origin}/?review_token=${reviewToken}`
    : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(reviewUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Success step ──
  if (reviewToken) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
        <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle size={18} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Submetido com sucesso!</h3>
              <p className="text-xs text-gray-500">E-mail enviado automaticamente para <strong>{managerName || email}</strong></p>
            </div>
          </div>

          {/* Email sent confirmation */}
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3 text-xs text-green-700">
            <Mail size={13} className="flex-shrink-0" />
            <span>E-mail de revisão enviado para <strong>{email}</strong></span>
          </div>

          {/* Review URL */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 mb-4 text-xs text-gray-600 font-mono break-all">
            {reviewUrl}
          </div>

          <div className="flex flex-col gap-2 mb-4">
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              {copied ? <><Check size={15} className="text-green-600" /> Copiado!</> : <><Copy size={15} /> Copiar link</>}
            </button>
          </div>

          <button onClick={onClose} className="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Fechar
          </button>
        </div>
      </div>
    );
  }

  // ── Step 1: enter manager email ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
        <h3 className="text-base font-bold text-gray-900 mb-1">Submeter para aprovação</h3>
        <p className="text-xs text-gray-500 mb-4">
          Gera um link de revisão para o gestor do TAP Map de <strong>{accountName}</strong>.
        </p>
        <label className="text-xs font-semibold text-gray-500 uppercase block mb-1">E-mail do gestor</label>
        {loadingManager ? (
          <div className="flex items-center gap-2 py-2 mb-3 text-xs text-gray-400">
            <Loader2 size={13} className="animate-spin" /> Buscando gestor...
          </div>
        ) : (
          <>
            {managerName && (
              <p className="text-xs text-green-600 mb-1 flex items-center gap-1">
                <CheckCircle size={12} /> Gestor encontrado: <strong>{managerName}</strong>
              </p>
            )}
            <input
              autoFocus
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); setManagerName(''); }}
              onKeyDown={e => { if (e.key === 'Enter') handle(); if (e.key === 'Escape') onClose(); }}
              placeholder="manager@databricks.com"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-1 focus:ring-[#FF3621] outline-none mb-3"
            />
          </>
        )}
        {err && <p className="text-xs text-red-500 mb-3">{err}</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </button>
          <button
            onClick={handle}
            disabled={submitting || loadingManager}
            className="flex items-center gap-2 px-5 py-2 bg-[#FF3621] text-white rounded-lg text-sm font-medium hover:bg-[#e02e1b] disabled:opacity-50 transition-colors"
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Submeter para aprovação
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Approval banner ────────────────────────────────────────────────────────────
function ApprovalBanner({ approval }: { approval: ApprovalInfo }) {
  if (approval.status === 'pending') {
    return (
      <div className="no-print mb-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <Clock size={16} className="text-amber-500 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800">Aguardando aprovação</p>
          <p className="text-xs text-amber-600">
            Enviado para <strong>{approval.manager_email}</strong>
            {approval.submitted_at && ` em ${new Date(approval.submitted_at).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
      </div>
    );
  }
  if (approval.status === 'approved') {
    return (
      <div className="no-print mb-4 flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
        <ThumbsUp size={16} className="text-green-600 flex-shrink-0" />
        <div>
          <p className="text-sm font-semibold text-green-800">TAP Map aprovado</p>
          <p className="text-xs text-green-600">
            Por <strong>{approval.reviewer_email}</strong>
            {approval.reviewed_at && ` em ${new Date(approval.reviewed_at).toLocaleDateString('pt-BR')}`}
          </p>
        </div>
      </div>
    );
  }
  if (approval.status === 'rejected') {
    return (
      <div className="no-print mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-3 mb-1">
          <ThumbsDown size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-sm font-semibold text-red-800">Revisão solicitada pelo gestor</p>
        </div>
        {approval.comments && (
          <p className="text-xs text-red-700 ml-7 bg-white border border-red-100 rounded-lg px-3 py-2 mt-1">
            <strong>Comentários:</strong> {approval.comments}
          </p>
        )}
        <p className="text-xs text-red-500 ml-7 mt-1">
          Edite o TAP e submeta novamente para aprovação.
        </p>
      </div>
    );
  }
  return null;
}

// ── Main editor ───────────────────────────────────────────────────────────────
export function TapMapEditor({ accountName, onBack }: TapMapEditorProps) {
  const {
    loading, error, clearError,
    fetchStructure, fetchTapMap, fetchMetadata, saveMetadata,
    fetchAccountSpend, saveTapMap, fetchApproval, submitForApproval, fetchManager,
  } = useApi();

  const [structure, setStructure] = useState<TapStructure | null>(null);
  const [data, setData] = useState<TapMapData>({});
  const [meta, setMeta] = useState<AccountMetadata>({ responsible: [], consulted: [], informed: [] });
  const [spend, setSpend] = useState<AccountSpend | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [initialLoading, setInitialLoading] = useState(true);
  const [approval, setApproval] = useState<ApprovalInfo | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [struct, tapData, metadata, spendData, approvalData] = await Promise.all([
          fetchStructure(),
          fetchTapMap(accountName),
          fetchMetadata(accountName),
          fetchAccountSpend(accountName),
          fetchApproval(accountName),
        ]);
        if (mounted) {
          setStructure(struct);
          setData(tapData);
          setMeta(metadata);
          setSpend(spendData);
          setApproval(approvalData);
          setInitialLoading(false);
        }
      } catch {
        if (mounted) setInitialLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [accountName]);

  const handleChange = useCallback((key: string, entry: TapMapEntry) => {
    setData(prev => ({ ...prev, [key]: entry }));
    setDirty(true);
    setSaveStatus('idle');
  }, []);

  const addPerson = (field: keyof AccountMetadata, person: RaciPerson) => {
    setMeta(prev => ({ ...prev, [field]: [...prev[field], person] }));
    setDirty(true);
    setSaveStatus('idle');
  };

  const removePerson = (field: keyof AccountMetadata, idx: number) => {
    setMeta(prev => ({ ...prev, [field]: prev[field].filter((_, i) => i !== idx) }));
    setDirty(true);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    clearError();
    try {
      await Promise.all([
        saveTapMap(accountName, Object.values(data)),
        saveMetadata(accountName, meta),
      ]);
      setSaveStatus('saved');
      setDirty(false);
      setTimeout(() => setSaveStatus('idle'), 2000);
      // Refresh approval status — saving resets an approved TAP back to draft
      const updatedApproval = await fetchApproval(accountName);
      setApproval(updatedApproval);
    } catch {
      setSaveStatus('error');
    }
  };

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={32} className="animate-spin text-[#FF3621]" />
        <span className="ml-3 text-gray-500">Loading TAP Map...</span>
      </div>
    );
  }

  if (!structure) {
    return (
      <div className="text-center py-24 text-red-500">
        <AlertCircle size={40} className="mx-auto mb-3" />
        <p>Failed to load TAP Map structure. {error}</p>
        <button onClick={onBack} className="mt-4 text-[#FF3621] hover:underline">Go back</button>
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    v > 0 ? `$${(v / 1_000_000).toFixed(1)}M` : null;

  const RACI_ROWS: { label: string; key: keyof AccountMetadata; color: string; hint: string }[] = [
    { label: 'Responsible', key: 'responsible', color: 'bg-red-500',  hint: 'AE, SA...' },
    { label: 'Consulted',   key: 'consulted',   color: 'bg-gray-600', hint: 'BVC, SSA, PS, BDR...' },
    { label: 'Informed',    key: 'informed',    color: 'bg-blue-600', hint: 'DSA, Cloud, C/Si/ISV...' },
  ];

  return (
    <div className="max-w-[1700px] mx-auto">
      {/* Top bar */}
      <div className="no-print sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 -mx-6 px-6 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              if (dirty && !window.confirm('Unsaved changes. Leave anyway?')) return;
              onBack();
            }}
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900">{accountName}</h2>
            <p className="text-xs text-gray-400">TAP Map — TAM, Architecture, Powerbase</p>
          </div>
          {spend && spend.total_value > 0 && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <DollarSign size={14} className="text-green-600" />
              <div>
                <span className="text-xs font-bold text-green-800">{formatCurrency(spend.total_value)}</span>
                <span className="text-xs text-green-600 ml-1">Databricks contract {spend.commitment_type}</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {dirty && saveStatus === 'idle' && (
            <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>
          )}
          {saveStatus === 'saved' && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <CheckCircle size={14} /> Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="text-xs text-red-500 font-medium flex items-center gap-1">
              <AlertCircle size={14} /> Save failed
            </span>
          )}
          <button
            onClick={() => window.print()}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2 transition-colors"
          >
            <Printer size={16} />
            Print
          </button>
          <button
            onClick={handleSave}
            disabled={!dirty || saveStatus === 'saving'}
            className="px-5 py-2 bg-[#FF3621] text-white rounded-lg hover:bg-[#e02e1b] disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
          >
            {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save
          </button>
          {approval && approval.status !== 'pending' && approval.status !== 'approved' && (
            <button
              onClick={() => setShowSubmitModal(true)}
              disabled={dirty}
              title={dirty ? 'Salve antes de submeter para aprovação' : ''}
              className="px-5 py-2 border border-[#FF3621] text-[#FF3621] rounded-lg hover:bg-[#FF3621] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-2 transition-colors"
            >
              <Send size={16} />
              Submeter
            </button>
          )}
          {approval?.status === 'pending' && (
            <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <Clock size={14} /> Aguardando aprovação
            </span>
          )}
          {approval?.status === 'approved' && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <ThumbsUp size={14} /> Aprovado
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="no-print mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
          <button onClick={clearError} className="ml-auto text-red-400 hover:text-red-600">&times;</button>
        </div>
      )}

      {/* Approval banner */}
      {approval && <ApprovalBanner approval={approval} />}

      {/* Account-level RACI */}
      <div className="no-print mb-4 bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Account-level RACI</p>
          <TrafficLegend />
        </div>
        <div className="flex flex-col gap-3">
          {RACI_ROWS.map(({ label, key, color, hint }) => (
            <div key={key} className="flex items-start gap-0">
              <div className={`${color} text-white text-xs font-bold px-3 py-2 rounded-l-lg flex-shrink-0 w-[110px] text-center self-stretch flex items-center justify-center`}>
                {label}:
              </div>
              <div className="flex-1 flex flex-wrap items-center gap-1.5 px-3 py-2 border border-l-0 border-gray-200 rounded-r-lg bg-white min-h-[38px]">
                {meta[key].map((person, idx) => (
                  <PersonChip key={idx} person={person} onRemove={() => removePerson(key, idx)} />
                ))}
                <AddPersonForm onAdd={(p) => addPerson(key, p)} />
                {meta[key].length === 0 && (
                  <span className="text-[10px] text-gray-300 ml-1">{hint}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* TAP Map grid */}
      <TapMapGrid structure={structure} data={data} onChange={handleChange} />

      {showSubmitModal && (
        <SubmitApprovalModal
          accountName={accountName}
          fetchManager={fetchManager}
          onSubmit={async (managerEmail) => {
            const token = await submitForApproval(accountName, managerEmail);
            const updated = await fetchApproval(accountName);
            setApproval(updated);
            return token;
          }}
          onClose={() => setShowSubmitModal(false)}
        />
      )}
    </div>
  );
}
