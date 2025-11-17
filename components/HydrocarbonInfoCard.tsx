import React from 'react';
import type { OrganicCompoundInfo } from '../types';

interface OrganicCompoundInfoCardProps {
  info: OrganicCompoundInfo;
  onNew: () => void;
}

const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between items-start py-3 border-b border-slate-300 dark:border-slate-700 last:border-b-0">
            <dt className="text-md text-cyan-600 dark:text-cyan-400 font-semibold">{label}</dt>
            <dd className="text-md text-slate-700 dark:text-slate-200 text-left">{value}</dd>
        </div>
    );
};

export const OrganicCompoundInfoCard: React.FC<OrganicCompoundInfoCardProps> = ({ info, onNew }) => {
  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-3xl m-4 text-slate-800 dark:text-white relative flex flex-col animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-hide">
      <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-300 mb-2 text-center">{info.name}</h2>
      <p className="text-xl font-mono text-slate-600 dark:text-slate-300 mb-6 text-center">{info.formula}</p>

      <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
        <h3 className="text-lg text-cyan-600 dark:text-cyan-400 font-semibold mb-2">تركيب لويس</h3>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-md shadow-inner flex justify-center items-center min-h-[200px]">
            {info.lewisStructureImage ? (
                <img src={info.lewisStructureImage} alt={`Lewis structure for ${info.name}`} className="max-w-full h-auto" />
            ) : (
                <p className="animate-pulse text-slate-500 dark:text-slate-400">...جاري تحميل الصورة</p>
            )}
        </div>
      </div>
      
       <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
            <dl>
                <InfoRow label="العائلة" value={info.family} />
                <InfoRow label="الحالة (STP)" value={info.stateAtSTP} />
                <InfoRow label="نقطة الغليان" value={info.boilingPoint} />
                <InfoRow label="نقطة الانصهار" value={info.meltingPoint} />
            </dl>
        </div>

      <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
        <h3 className="text-lg text-cyan-600 dark:text-cyan-400 font-semibold mb-2">الوصف</h3>
        <p className="text-md text-slate-700 dark:text-slate-300 leading-relaxed">{info.description}</p>
      </div>

      <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
        <h3 className="text-lg text-cyan-600 dark:text-cyan-400 font-semibold mb-2">طريقة التسمية (IUPAC)</h3>
        <p className="text-md text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{info.iupacNaming}</p>
      </div>
      
       <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
        <h3 className="text-lg text-cyan-600 dark:text-cyan-400 font-semibold mb-2">الاستخدامات الشائعة</h3>
        <p className="text-md text-slate-700 dark:text-slate-300 leading-relaxed">{info.uses}</p>
      </div>

      <div className="w-full mt-4 flex flex-col gap-3">
        <button 
            onClick={onNew}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors w-full text-lg mt-2"
        >
            استكشاف جديد
        </button>
      </div>
    </div>
  );
};
