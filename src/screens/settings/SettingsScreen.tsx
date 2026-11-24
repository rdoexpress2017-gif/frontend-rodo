import React, { useEffect, useState } from 'react';
import { Save, PlayCircle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { SystemSettingsDTO } from '../../shared/types/domain.types';
import { api } from '../../shared/services/api';

export const SettingsScreen: React.FC = () => {
  const [pricePerKm, setPricePerKm] = useState('2.50');
  const [baseRate, setBaseRate] = useState('10.00');
  const [commissionPct, setCommissionPct] = useState('80.0');
  const [dailyJobExecutionTime, setDailyJobExecutionTime] = useState('20:00');
  const [dailyJobExecutedToday, setDailyJobExecutedToday] = useState(false);
  const [lastDailyJobExecutionDate, setLastDailyJobExecutionDate] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [jobMessage, setJobMessage] = useState<string | null>(null);
  const [jobAlertError, setJobAlertError] = useState<string | null>(null);

  useEffect(() => {
    api.get<SystemSettingsDTO>('/settings').then((res) => {
      if (res.data) {
        setPricePerKm(String(res.data.pricePerKm ?? 2.5));
        setBaseRate(String(res.data.baseRate ?? 10.0));
        setCommissionPct(String(res.data.defaultMotoboyCommissionPercentage ?? 80.0));
        setDailyJobExecutionTime(res.data.dailyJobExecutionTime || '20:00');
        setDailyJobExecutedToday(Boolean(res.data.dailyJobExecutedToday));
        setLastDailyJobExecutionDate(res.data.lastDailyJobExecutionDate ?? null);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavedMessage(null);
    const res = await api.put<SystemSettingsDTO>('/settings', {
      pricePerKm: parseFloat(pricePerKm),
      baseRate: parseFloat(baseRate),
      defaultMotoboyCommissionPercentage: parseFloat(commissionPct),
      dailyJobExecutionTime: dailyJobExecutionTime || '20:00',
    });
    if (res?.data) {
      setDailyJobExecutedToday(Boolean(res.data.dailyJobExecutedToday));
      setLastDailyJobExecutionDate(res.data.lastDailyJobExecutionDate ?? null);
      if (res.data.dailyJobExecutionTime) {
        setDailyJobExecutionTime(res.data.dailyJobExecutionTime);
      }
    }
    setSavedMessage('Configurações globais atualizadas com sucesso!');
  };

  const handleTriggerDailyJob = async () => {
    setJobMessage(null);
    setJobAlertError(null);

    if (dailyJobExecutedToday) {
      const alertText =
        'O fechamento e geração automática de relatórios já foi executado hoje. Não é permitido executá-lo novamente no mesmo dia.';
      setJobAlertError(alertText);
      window.alert(alertText);
      return;
    }

    try {
      const res = await api.post('/reports/run-daily-job');
      const count = Array.isArray(res.data) ? res.data.length : 0;
      setDailyJobExecutedToday(true);
      setJobMessage(
        `Robô de fechamento executado! ${count} relatório(s)/ordem(ns) de pagamento gerado(s). Flag diária marcada como executada hoje.`
      );
    } catch (err: any) {
      const alertText =
        err?.response?.data?.message ||
        'O fechamento e geração automática de relatórios já foi executado hoje. Não é permitido executá-lo novamente no mesmo dia.';
      setDailyJobExecutedToday(true);
      setJobAlertError(alertText);
      window.alert(alertText);
    }
  };

  return (
    <div className="max-w-2xl space-y-5 sm:space-y-6">
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-6">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Parâmetros Globais e Comissão Padrão
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          O percentual de comissão configurado abaixo é aplicado automaticamente no cálculo de
          repasse ao motoboy sempre que um pedido é criado ou editado.
        </p>

        {savedMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-bold">
            {savedMessage}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Comissão Padrão do Motoboy (%) *
            </label>
            <input
              type="number"
              step="0.5"
              min="1"
              max="100"
              required
              value={commissionPct}
              onChange={(e) => setCommissionPct(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-[#D92D3A]"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Taxa Base de Referência (R$)
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                required
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Valor por Km de Referência (R$)
              </label>
              <input
                type="number"
                step="0.10"
                min="0"
                required
                value={pricePerKm}
                onChange={(e) => setPricePerKm(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="daily-job-execution-time"
              className="block text-xs font-bold text-slate-700 mb-1"
            >
              Horário de Execução do Robô de Fechamento Diário (HH:mm) *
            </label>
            <input
              id="daily-job-execution-time"
              type="time"
              required
              value={dailyJobExecutionTime}
              onChange={(e) => setDailyJobExecutionTime(e.target.value)}
              className="w-full sm:w-56 px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-800"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-full bg-[#D92D3A] hover:bg-[#c0222e] text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Salvar Configurações
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/80 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <h3 className="text-sm font-bold text-slate-900">
            {`Robô de Fechamento Diário (Agendado às ${dailyJobExecutionTime || '20:00'})`}
          </h3>
          {dailyJobExecutedToday ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Já executado hoje{lastDailyJobExecutionDate ? ` (${lastDailyJobExecutionDate})` : ''}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-extrabold">
              <Clock className="w-3.5 h-3.5" />
              {`Pendente hoje (Agendado ${dailyJobExecutionTime || '20:00'})`}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">
          {`O job roda automaticamente todos os dias às ${
            dailyJobExecutionTime || '20:00'
          } (America/Sao_Paulo), realizando o fechamento dos clientes elegíveis no ciclo, o fechamento diário dos motoboys e o envio do relatório geral da empresa para o e-mail do Master. Caso já tenha sido executado manualmente hoje, a execução automática das ${
            dailyJobExecutionTime || '20:00'
          } não rodará novamente (e vice-versa).`}
        </p>
        {jobMessage && (
          <div className="mb-4 p-3 rounded-xl bg-blue-50 text-blue-800 text-xs font-bold">
            {jobMessage}
          </div>
        )}
        {jobAlertError && (
          <div
            role="alert"
            className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-[#D92D3A] text-xs font-bold flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{jobAlertError}</span>
          </div>
        )}
        <button
          type="button"
          onClick={handleTriggerDailyJob}
          className="px-4 py-2.5 rounded-full border border-[#D92D3A] text-[#D92D3A] hover:bg-red-50 text-xs font-bold inline-flex items-center gap-2 cursor-pointer"
        >
          <PlayCircle className="w-4 h-4" />
          Executar Fechamento Diário Agora
        </button>
      </div>
    </div>
  );
};
