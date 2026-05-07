import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, AlertCircle, ThumbsUp, ThumbsDown, DollarSign } from 'lucide-react';
import { useApi } from '../hooks/useApi';
import { ViewerGrid } from './TapMapViewer';
import type { ApprovalInfo, TapStructure, TapMapData, AccountMetadata, AccountSpend, RaciPerson } from '../types';

function RaciRow({ label, people, color }: { label: string; people: RaciPerson[]; color: string }) {
  if (people.length === 0) return null;
  return (
    <div className="flex items-center gap-0">
      <div className={`${color} text-white text-xs font-bold px-3 py-2 rounded-l-lg flex-shrink-0 w-[110px] text-center`}>
        {label}:
      </div>
      <div className="flex flex-wrap gap-2 px-3 py-1.5 border border-l-0 border-gray-200 rounded-r-lg bg-white">
        {people.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5 text-sm">
            <span className="font-bold text-gray-500">{p.role}:</span>
            <span className="text-gray-800">{p.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

interface ReviewPageProps {
  token: string;
  onDone: () => void;
}

type DecisionState = 'idle' | 'approving' | 'rejecting' | 'done_approved' | 'done_rejected' | 'error';

export function ReviewPage({ token, onDone }: ReviewPageProps) {
  const { fetchReview, fetchStructure, fetchTapMap, fetchMetadata, fetchAccountSpend, approveReview, rejectReview } = useApi();

  const [approval, setApproval] = useState<ApprovalInfo | null>(null);
  const [structure, setStructure] = useState<TapStructure | null>(null);
  const [data, setData] = useState<TapMapData>({});
  const [meta, setMeta] = useState<AccountMetadata>({ responsible: [], consulted: [], informed: [] });
  const [spend, setSpend] = useState<AccountSpend | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [decision, setDecision] = useState<DecisionState>('idle');
  const [comments, setComments] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [appr, struct] = await Promise.all([
          fetchReview(token),
          fetchStructure(),
        ]);
        const [tapData, metadata, spendData] = await Promise.all([
          fetchTapMap(appr.account_name),
          fetchMetadata(appr.account_name),
          fetchAccountSpend(appr.account_name),
        ]);
        setApproval(appr);
        setStructure(struct);
        setData(tapData);
        setMeta(metadata);
        setSpend(spendData);
      } catch (e: any) {
        setLoadError(e.message || 'Falha ao carregar.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleApprove = async () => {
    setDecision('approving');
    try {
      await approveReview(token);
      setDecision('done_approved');
    } catch {
      setDecision('error');
    }
  };

  const handleReject = async () => {
    if (!comments.trim()) return;
    setDecision('rejecting');
    try {
      await rejectReview(token, comments.trim());
      setDecision('done_rejected');
    } catch {
      setDecision('error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-[#FF3621]" />
        <span className="ml-3 text-gray-500">Carregando TAP Map...</span>
      </div>
    );
  }

  if (loadError || !approval) {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">Link inválido ou expirado</h2>
        <p className="text-gray-500 text-sm mb-6">{loadError || 'Este link de revisão não existe ou já foi utilizado.'}</p>
        <button onClick={onDone} className="text-[#FF3621] hover:underline text-sm">Ir para o TAP Map Builder</button>
      </div>
    );
  }

  if (decision === 'done_approved') {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <CheckCircle size={56} className="mx-auto mb-4 text-green-500" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">TAP Map aprovado!</h2>
        <p className="text-gray-500 text-sm mb-6">O SA responsável foi notificado.</p>
        <button onClick={onDone} className="text-[#FF3621] hover:underline text-sm">Ir para o TAP Map Builder</button>
      </div>
    );
  }

  if (decision === 'done_rejected') {
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <XCircle size={56} className="mx-auto mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Revisão solicitada</h2>
        <p className="text-gray-500 text-sm mb-6">Seus comentários foram enviados ao SA responsável.</p>
        <button onClick={onDone} className="text-[#FF3621] hover:underline text-sm">Ir para o TAP Map Builder</button>
      </div>
    );
  }

  if (approval.status !== 'pending') {
    const already = approval.status === 'approved' ? 'aprovado' : approval.status === 'rejected' ? 'rejeitado' : 'processado';
    return (
      <div className="max-w-lg mx-auto mt-24 text-center">
        <AlertCircle size={48} className="mx-auto mb-4 text-amber-400" />
        <h2 className="text-lg font-bold text-gray-800 mb-2">TAP Map já {already}</h2>
        <p className="text-gray-500 text-sm mb-6">Este link de revisão não está mais ativo.</p>
        <button onClick={onDone} className="text-[#FF3621] hover:underline text-sm">Ir para o TAP Map Builder</button>
      </div>
    );
  }

  const formatCurrency = (v: number) => v > 0 ? `$${(v / 1_000_000).toFixed(1)}M` : null;
  const hasRaci = meta.responsible.length + meta.consulted.length + meta.informed.length > 0;

  return (
    <div className="max-w-[1800px] mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 -mx-6 px-6 py-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{approval.account_name}</h2>
            <p className="text-xs text-gray-400">
              TAP Map — submetido por <strong>{approval.submitted_by}</strong>
              {approval.submitted_at && (
                <span className="ml-1">em {new Date(approval.submitted_at).toLocaleDateString('pt-BR')}</span>
              )}
              {approval.submission_count && approval.submission_count > 1 && (
                <span className="ml-2 text-amber-500">(revisão #{approval.submission_count})</span>
              )}
            </p>
          </div>
          {spend && spend.total_value > 0 && (
            <div className="flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              <DollarSign size={14} className="text-green-600" />
              <span className="text-xs font-bold text-green-800">{formatCurrency(spend.total_value)}</span>
              <span className="text-xs text-green-600">contrato Databricks {spend.commitment_type}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {decision === 'error' && (
            <span className="text-xs text-red-500 flex items-center gap-1">
              <AlertCircle size={14} /> Erro ao processar
            </span>
          )}

          {!showRejectForm ? (
            <>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={decision === 'approving' || decision === 'rejecting'}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium transition-colors disabled:opacity-50"
              >
                <ThumbsDown size={15} />
                Rejeitar
              </button>
              <button
                onClick={handleApprove}
                disabled={decision === 'approving' || decision === 'rejecting'}
                className="flex items-center gap-2 px-5 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {decision === 'approving'
                  ? <Loader2 size={15} className="animate-spin" />
                  : <ThumbsUp size={15} />
                }
                Aprovar
              </button>
            </>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1">
                <textarea
                  autoFocus
                  value={comments}
                  onChange={e => setComments(e.target.value)}
                  placeholder="Descreva o que precisa ser melhorado..."
                  rows={2}
                  className="w-72 px-3 py-2 text-xs border border-gray-300 rounded-lg focus:ring-1 focus:ring-red-400 outline-none resize-none"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => { setShowRejectForm(false); setComments(''); }}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={!comments.trim() || decision === 'rejecting'}
                    className="flex items-center gap-1 px-3 py-1 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {decision === 'rejecting' ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                    Enviar rejeição
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RACI */}
      {hasRaci && (
        <div className="mb-4 bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-2">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Account-level RACI</p>
          <RaciRow label="Responsible" people={meta.responsible} color="bg-red-500" />
          <RaciRow label="Consulted"   people={meta.consulted}   color="bg-gray-600" />
          <RaciRow label="Informed"    people={meta.informed}    color="bg-blue-600" />
        </div>
      )}

      {/* Full TAP Map grid */}
      {structure && <ViewerGrid structure={structure} data={data} />}
    </div>
  );
}
