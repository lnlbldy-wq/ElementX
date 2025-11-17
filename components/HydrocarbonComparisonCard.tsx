import React, { useState } from 'react';
import type { OrganicCompoundInfo } from '../types';

interface OrganicCompoundComparisonCardProps {
  infoA: OrganicCompoundInfo;
  infoB: OrganicCompoundInfo;
  onNew: () => void;
  onNewComparison: (
    paramsA: { family: string; carbons: number },
    paramsB: { family: string; carbons: number }
  ) => void;
}

const ComparisonRow: React.FC<{ label: string; valueA?: string; valueB?: string }> = ({ label, valueA, valueB }) => (
    <tr className="border-b border-slate-200 dark:border-slate-700">
        <th className="p-3 text-right font-semibold text-cyan-600 dark:text-cyan-400 bg-slate-50 dark:bg-slate-800/50">{label}</th>
        <td className="p-3 text-center">{valueA ?? '-'}</td>
        <td className="p-3 text-center">{valueB ?? '-'}</td>
    </tr>
);

const ComparisonSection: React.FC<{ title: string, contentA: React.ReactNode, contentB: React.ReactNode }> = ({ title, contentA, contentB }) => (
    <div className="mt-6">
        <h3 className="text-xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-3">{title}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700">{contentA}</div>
            <div className="p-4 rounded-lg bg-white/50 dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700">{contentB}</div>
        </div>
    </div>
);

export const OrganicCompoundComparisonCard: React.FC<OrganicCompoundComparisonCardProps> = ({ infoA, infoB, onNew, onNewComparison }) => {
  const [newCarbonCountA, setNewCarbonCountA] = useState(1);
  const [newCarbonCountB, setNewCarbonCountB] = useState(2);

  return (
    <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-4xl m-4 text-slate-800 dark:text-white relative flex flex-col animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-hide">
      <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-300 mb-6 text-center">مقارنة بين المركبات العضوية</h2>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-md">
            <thead>
                <tr className="border-b-2 border-slate-300 dark:border-slate-600">
                    <th className="p-3 text-right">الخاصية</th>
                    <th className="p-3 text-center font-bold">{infoA.name} <span className="font-mono text-sm text-slate-500 block">{infoA.formula}</span></th>
                    <th className="p-3 text-center font-bold">{infoB.name} <span className="font-mono text-sm text-slate-500 block">{infoB.formula}</span></th>
                </tr>
            </thead>
            <tbody>
                <ComparisonRow label="العائلة" valueA={infoA.family} valueB={infoB.family} />
                <ComparisonRow label="الحالة (STP)" valueA={infoA.stateAtSTP} valueB={infoB.stateAtSTP} />
                <ComparisonRow label="نقطة الغليان" valueA={infoA.boilingPoint} valueB={infoB.boilingPoint} />
                <ComparisonRow label="نقطة الانصهار" valueA={infoA.meltingPoint} valueB={infoB.meltingPoint} />
            </tbody>
        </table>
      </div>

      <ComparisonSection 
        title="تركيب لويس"
        contentA={<img src={infoA.lewisStructureImage} alt={`Lewis structure for ${infoA.name}`} className="max-w-full h-auto mx-auto" />}
        contentB={<img src={infoB.lewisStructureImage} alt={`Lewis structure for ${infoB.name}`} className="max-w-full h-auto mx-auto" />}
      />

      <ComparisonSection 
        title="الوصف"
        contentA={<p className="leading-relaxed text-slate-700 dark:text-slate-300">{infoA.description}</p>}
        contentB={<p className="leading-relaxed text-slate-700 dark:text-slate-300">{infoB.description}</p>}
      />

      <ComparisonSection 
        title="الاستخدامات الشائعة"
        contentA={<p className="leading-relaxed text-slate-700 dark:text-slate-300">{infoA.uses}</p>}
        contentB={<p className="leading-relaxed text-slate-700 dark:text-slate-300">{infoB.uses}</p>}
      />

      <div className="w-full mt-8 p-4 border-t-2 border-slate-300 dark:border-slate-600">
          <h3 className="text-xl font-bold text-center text-cyan-600 dark:text-cyan-400 mb-4">
              قارن كحولين آخرين
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
              <div>
                  <label htmlFor="alcoholA" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      الكحول 1: <span className="font-bold">{newCarbonCountA}</span> ذرات كربون
                  </label>
                  <input
                      id="alcoholA"
                      type="range"
                      min="1"
                      max="10"
                      value={newCarbonCountA}
                      onChange={(e) => setNewCarbonCountA(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
              </div>
              <div>
                  <label htmlFor="alcoholB" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      الكحول 2: <span className="font-bold">{newCarbonCountB}</span> ذرات كربون
                  </label>
                  <input
                      id="alcoholB"
                      type="range"
                      min="1"
                      max="10"
                      value={newCarbonCountB}
                      onChange={(e) => setNewCarbonCountB(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                  />
              </div>
          </div>
          <button
              onClick={() => onNewComparison(
                  { family: 'كحول', carbons: newCarbonCountA },
                  { family: 'كحول', carbons: newCarbonCountB }
              )}
              disabled={newCarbonCountA === newCarbonCountB}
              className="mt-6 w-full bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
          >
              قارن الآن
          </button>
      </div>
      
      <div className="w-full mt-8 flex flex-col gap-3">
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