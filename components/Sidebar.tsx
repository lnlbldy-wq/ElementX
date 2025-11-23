import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { Atom } from '../types';
import { AtomIcon } from './AtomIcon';
import { COMMON_COMPOUNDS } from '../constants';

type SimulationMode = 'atoms' | 'compounds' | 'organic' | 'biochemistry' | 'electrochemistry' | 'thermochemistry' | 'solution';

interface SidebarProps {
  atoms: Omit<Atom, 'instanceId' | 'x' | 'y'>[];
  onAtomClick: (atomId: string) => void;
  onModeChange: (mode: SimulationMode) => void;
  currentMode: SimulationMode;
  onCompoundReact: (reactant1: string, reactant2: string) => void;
  isCompoundLoading: boolean;
  reactant1: string;
  setReactant1: (value: string) => void;
  reactant2: string;
  setReactant2: (value: string) => void;
  onOrganicCompoundGenerate: (family: string, carbons: number) => void;
  onOrganicCompoundCompare: (
    paramsA: { family: string; carbons: number },
    paramsB: { family: string; carbons: number }
  ) => void;
  isOrganicCompoundLoading: boolean;
  onBiomoleculeGenerate: (moleculeName: string) => void;
  isBiomoleculeLoading: boolean;
  onGalvanicCellSimulate: (metal1: string, metal2: string) => void;
  isGalvanicCellLoading: boolean;
  onThermoAnalyze: (equation: string) => void;
  isThermoLoading: boolean;
  onSolutionAnalyze: (solute: string, solvent: string, concentration: number) => void;
  isSolutionLoading: boolean;
}

const modes = [
  { mode: 'atoms', label: 'الذرات', emoji: '⚛️' },
  { mode: 'compounds', label: 'المركبات', emoji: '🧪' },
  { mode: 'organic', label: 'العضوية', emoji: '🌿' },
  { mode: 'biochemistry', label: 'الحيوية', emoji: '🧬' },
  { mode: 'electrochemistry', label: 'الكهربائية', emoji: '⚡️' },
  { mode: 'thermochemistry', label: 'الحرارية', emoji: '🔥' },
  { mode: 'solution', label: 'المحاليل', emoji: '💧' },
] as const;

// FIX: Define NavButton as a React.FC with a props interface to correctly handle React's special 'key' prop.
interface NavButtonProps {
    mode: SimulationMode;
    label: string;
    emoji: string;
    currentMode: SimulationMode;
    onModeChange: (mode: SimulationMode) => void;
}

const NavButton: React.FC<NavButtonProps> = ({ mode, label, emoji, currentMode, onModeChange }) => (
    <button
        onClick={() => onModeChange(mode)}
        className={`flex flex-col items-center justify-center gap-1 p-2 w-full rounded-lg transition-all duration-200 text-xs font-bold ${currentMode === mode ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow-md scale-105' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700/50'}`}
        title={label}
    >
      <span className="text-2xl mb-1">{emoji}</span>
      <span>{label}</span>
    </button>
);


const easeInOutQuad = (t: number): number => {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
};

const smoothScrollBy = (element: HTMLElement, amount: number, duration: number) => {
  const start = element.scrollTop;
  let startTime: number | null = null;

  const animateScroll = (currentTime: number) => {
    if (startTime === null) startTime = currentTime;
    const timeElapsed = currentTime - startTime;
    const progress = Math.min(timeElapsed / duration, 1);
    const easedProgress = easeInOutQuad(progress);
    element.scrollTop = start + amount * easedProgress;
    if (timeElapsed < duration) {
      requestAnimationFrame(animateScroll);
    }
  };
  requestAnimationFrame(animateScroll);
};

// Moved the biomolecules constant outside the component to prevent it from being recreated on every render.
// This improves performance and fixes a TypeScript type inference issue.
// Explicitly type the 'biomolecules' constant as 'Record<string, string[]>' to resolve a TypeScript type inference issue.
const biomolecules: Record<string, string[]> = {
    'كربوهيدرات': ['جلوكوز', 'فركتوز', 'سكروز', 'نشا', 'سليلوز'],
    'بروتينات (أحماض أمينية)': ['جلايسين', 'ألانين', 'فالين', 'فينيل ألانين', 'تربتوفان'],
    'دهون وأشباهها': ['ثلاثي الغليسريد', 'كوليسترول', 'حمض البالمتيك'],
};

export const Sidebar: React.FC<SidebarProps> = ({ 
    atoms, 
    onAtomClick, 
    onModeChange, 
    currentMode, 
    onCompoundReact, 
    isCompoundLoading,
    reactant1,
    setReactant1,
    reactant2,
    setReactant2,
    onOrganicCompoundGenerate,
    onOrganicCompoundCompare,
    isOrganicCompoundLoading,
    onBiomoleculeGenerate,
    isBiomoleculeLoading,
    onGalvanicCellSimulate,
    isGalvanicCellLoading,
    onThermoAnalyze,
    isThermoLoading,
    onSolutionAnalyze,
    isSolutionLoading,
 }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const compoundInputRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeInput, setActiveInput] = useState<'reactant1' | 'reactant2' | null>('reactant1');
  const [suggestions, setSuggestions] = useState<{ name: string; formula: string }[]>([]);


  // Organic compound state
  const [organicFamilyA, setOrganicFamilyA] = useState('ألكان');
  const [carbonCountA, setCarbonCountA] = useState(1);
  const [organicFamilyB, setOrganicFamilyB] = useState('ألكان');
  const [carbonCountB, setCarbonCountB] = useState(2);
  const [isComparisonMode, setIsComparisonMode] = useState(false);

  // Electrochemistry state
  const [electrode1, setElectrode1] = useState('Zn');
  const [electrode2, setElectrode2] = useState('Cu');
  
  // Thermochemistry state
  const [thermoEquation, setThermoEquation] = useState('2H₂(g) + O₂(g) → 2H₂O(l)');

  // Solution Chemistry state
  const [solute, setSolute] = useState('NaCl');
  const [solvent, setSolvent] = useState('H₂O');
  const [concentration, setConcentration] = useState(1.0);
  
  const handleDragStart = (e: React.DragEvent, atomId: string) => {
    e.dataTransfer.setData('application/react-flow', atomId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollUp(el.scrollTop > 0);
      setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight);
    }
  }, []);
  
  useEffect(() => {
    checkScrollability();
    const el = scrollContainerRef.current;
    el?.addEventListener('scroll', checkScrollability);
    window.addEventListener('resize', checkScrollability);
    return () => {
      el?.removeEventListener('scroll', checkScrollability);
      window.removeEventListener('resize', checkScrollability);
    };
  }, [checkScrollability, currentMode]);

  const handleScroll = (direction: 'up' | 'down') => {
    const el = scrollContainerRef.current;
    if (el) {
      const scrollAmount = direction === 'up' ? -el.clientHeight * 0.8 : el.clientHeight * 0.8;
      smoothScrollBy(el, scrollAmount, 300);
    }
  };

  const filteredAtoms = useMemo(() => {
      if (!searchTerm) return atoms;
      const lowerCaseSearchTerm = searchTerm.toLowerCase();
      return atoms.filter(atom => 
        atom.name.toLowerCase().includes(lowerCaseSearchTerm) ||
        atom.symbol.toLowerCase().includes(lowerCaseSearchTerm)
      );
  }, [atoms, searchTerm]);

  const handleSuggestionClick = (compound: { name: string; formula: string }) => {
    if (activeInput === 'reactant1') {
        setReactant1(compound.formula);
        setActiveInput('reactant2');
    } else if (activeInput === 'reactant2') {
        setReactant2(compound.formula);
        setActiveInput(null);
    }
    setSuggestions([]);
  };

  useEffect(() => {
    const currentActiveInput = activeInput === 'reactant1' ? reactant1 : reactant2;
    if (currentActiveInput && currentActiveInput.length > 0) {
        const lowerCaseInput = currentActiveInput.toLowerCase();
        const filtered = COMMON_COMPOUNDS.filter(c =>
            c.name.toLowerCase().includes(lowerCaseInput) ||
            c.formula.toLowerCase().replace(/[^a-z0-9]/g, '').includes(lowerCaseInput.replace(/[^a-z0-9]/g, ''))
        ).slice(0, 5);
        setSuggestions(filtered);
    } else {
        setSuggestions([]);
    }
  }, [reactant1, reactant2, activeInput]);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (compoundInputRef.current && !compoundInputRef.current.contains(event.target as Node)) {
            setActiveInput(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const renderAtomModeContent = () => (
     <>
        <div className="p-4 flex-shrink-0">
          <input
            type="text"
            placeholder="بحث بالاسم أو الرمز..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="relative flex-grow">
          {canScrollUp && (
            <button
              onClick={() => handleScroll('up')}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-b from-slate-100 dark:from-slate-800 to-transparent z-10 flex items-start justify-center text-slate-500 dark:text-slate-400"
              aria-label="Scroll up"
            >
              ▲
            </button>
          )}

          <div ref={scrollContainerRef} className="h-full overflow-y-auto p-4 scrollbar-hide">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {filteredAtoms.map((atom) => (
                <div
                  key={atom.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, atom.id)}
                  onClick={() => onAtomClick(atom.id)}
                  className="flex flex-col items-center p-2 rounded-lg bg-slate-200 dark:bg-slate-700/50 hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer transition-colors"
                >
                  <AtomIcon atom={atom} />
                  <span className="mt-2 text-xs font-bold text-center text-slate-700 dark:text-slate-200">
                    {atom.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {canScrollDown && (
            <button
              onClick={() => handleScroll('down')}
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3/4 h-8 bg-gradient-to-t from-slate-100 dark:from-slate-800 to-transparent z-10 flex items-end justify-center text-slate-500 dark:text-slate-400"
              aria-label="Scroll down"
            >
              ▼
            </button>
          )}
        </div>
    </>
  );

  const organicFamilies = ['ألكان', 'ألكين', 'ألكاين', 'ألكان حلقي', 'حلقة بنزين', 'كحول', 'هاليد الألكيل', 'إيثر', 'أمين', 'ألدهيد', 'كيتون', 'حمض كربوكسيلي', 'إستر', 'أميد'];
  const electrodes = ['Zn', 'Cu', 'Fe', 'Pb', 'Ag', 'Ni', 'Al', 'Mg'];
  const solutes = ['NaCl', 'KCl', 'C₆H₁₂O₆', 'HCl', 'NaOH', 'CH₃COOH'];
  const solvents = ['H₂O', 'C₂H₅OH'];
  
  const renderCompoundModeContent = () => (
    <div ref={compoundInputRef} className="p-4 h-full flex flex-col justify-center relative">
        <h3 className="text-xl font-bold text-center mb-4">تفاعل المركبات</h3>
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
            اختر مركبين من المكتبة على اليسار أو اكتب صيغتيهما لبدء التفاعل.
        </p>
        
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المتفاعل 1</label>
                <input
                    type="text"
                    placeholder="e.g., HCl"
                    value={reactant1}
                    onChange={(e) => setReactant1(e.target.value)}
                    onFocus={() => setActiveInput('reactant1')}
                    className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المتفاعل 2</label>
                <input
                    type="text"
                    placeholder="e.g., NaOH"
                    value={reactant2}
                    onChange={(e) => setReactant2(e.target.value)}
                    onFocus={() => setActiveInput('reactant2')}
                    className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono"
                />
            </div>
        </div>

        {activeInput && suggestions.length > 0 && (
            <div className="absolute left-4 right-4 mt-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                {suggestions.map(s => (
                    <div
                        key={s.formula}
                        onClick={() => handleSuggestionClick(s)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer flex justify-between"
                    >
                        <span>{s.name}</span>
                        <span className="font-mono text-slate-500 dark:text-slate-400">{s.formula}</span>
                    </div>
                ))}
            </div>
        )}

        <button 
            onClick={() => onCompoundReact(reactant1, reactant2)}
            disabled={!reactant1 || !reactant2 || isCompoundLoading}
            className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isCompoundLoading ? '...جاري التفاعل' : 'بدء التفاعل'}
        </button>
    </div>
  );
  
  const renderOrganicModeContent = () => (
     <div className="p-4 h-full flex flex-col justify-center">
        <h3 className="text-xl font-bold text-center mb-4">الكيمياء العضوية</h3>
        
        <div className="flex justify-center mb-4">
            <div className="bg-slate-200 dark:bg-slate-700 p-1 rounded-full flex text-sm">
                <button
                    onClick={() => setIsComparisonMode(false)}
                    className={`px-4 py-1 rounded-full ${!isComparisonMode ? 'bg-white dark:bg-slate-600 shadow' : ''}`}
                >
                    فردي
                </button>
                <button
                    onClick={() => setIsComparisonMode(true)}
                    className={`px-4 py-1 rounded-full ${isComparisonMode ? 'bg-white dark:bg-slate-600 shadow' : ''}`}
                >
                    مقارنة
                </button>
            </div>
        </div>
        
        {/* Compound A */}
        <div className={`p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50 mb-4 transition-all duration-300 ${!isComparisonMode ? 'opacity-100' : 'opacity-70'}`}>
            <h4 className="font-bold text-center mb-2">{isComparisonMode ? 'المركب أ' : 'اختر المركب'}</h4>
            <div className="space-y-3">
                <div>
                    <label htmlFor="familyA" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العائلة</label>
                    <select id="familyA" value={organicFamilyA} onChange={(e) => setOrganicFamilyA(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                        {organicFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                    </select>
                </div>
                 <div>
                    <label htmlFor="carbonsA" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      عدد ذرات الكربون: <span className="font-bold">{carbonCountA}</span>
                    </label>
                    <input
                      id="carbonsA"
                      type="range"
                      min="1"
                      max="10"
                      value={carbonCountA}
                      onChange={(e) => setCarbonCountA(parseInt(e.target.value, 10))}
                      className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </div>
        </div>
        
        {/* Compound B - Comparison Mode Only */}
        {isComparisonMode && (
             <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-100/50 dark:bg-slate-800/50 mb-4 animate-fade-in">
                 <h4 className="font-bold text-center mb-2">المركب ب</h4>
                <div className="space-y-3">
                    <div>
                        <label htmlFor="familyB" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">العائلة</label>
                        <select id="familyB" value={organicFamilyB} onChange={(e) => setOrganicFamilyB(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                            {organicFamilies.map(f => <option key={f} value={f}>{f}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="carbonsB" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                          عدد ذرات الكربون: <span className="font-bold">{carbonCountB}</span>
                        </label>
                        <input
                          id="carbonsB"
                          type="range"
                          min="1"
                          max="10"
                          value={carbonCountB}
                          onChange={(e) => setCarbonCountB(parseInt(e.target.value, 10))}
                          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>
        )}
        
        <button 
            onClick={
              isComparisonMode 
                ? () => onOrganicCompoundCompare({ family: organicFamilyA, carbons: carbonCountA }, { family: organicFamilyB, carbons: carbonCountB })
                : () => onOrganicCompoundGenerate(organicFamilyA, carbonCountA)
            }
            disabled={isOrganicCompoundLoading || (isComparisonMode && organicFamilyA === organicFamilyB && carbonCountA === carbonCountB)}
            className="w-full mt-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isOrganicCompoundLoading ? '...جاري التحميل' : (isComparisonMode ? 'قارن الآن' : 'إنشاء المركب')}
        </button>
    </div>
  );

   const renderBioModeContent = () => (
     <div className="p-4 h-full flex flex-col justify-center">
        <h3 className="text-xl font-bold text-center mb-4">الكيمياء الحيوية</h3>
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
            اختر جزيئًا حيويًا شائعًا من القوائم أدناه لعرض معلومات مفصلة عنه.
        </p>

        <div className="space-y-4">
            {Object.entries(biomolecules).map(([category, molecules]) => (
                <div key={category}>
                    <h4 className="font-semibold text-slate-700 dark:text-slate-300 mb-2">{category}</h4>
                    <div className="flex flex-wrap gap-2">
                        {molecules.map(molecule => (
                            <button
                                key={molecule}
                                onClick={() => onBiomoleculeGenerate(molecule)}
                                disabled={isBiomoleculeLoading}
                                className="px-3 py-1 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-full text-sm hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                            >
                                {molecule}
                            </button>
                        ))}
                    </div>
                </div>
            ))}
        </div>
         {isBiomoleculeLoading && <div className="text-center mt-4 text-sm text-slate-500 animate-pulse">...جاري التحميل</div>}
    </div>
  );
  
  const renderElectroModeContent = () => (
     <div className="p-4 h-full flex flex-col justify-center">
        <h3 className="text-xl font-bold text-center mb-4">الكيمياء الكهربائية</h3>
         <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
            اختر قطبين لبناء خلية جلفانية ومحاكاة عملها.
        </p>
        <div className="space-y-4">
            <div>
                <label htmlFor="electrode1" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القطب 1 (المصعد المحتمل)</label>
                <select id="electrode1" value={electrode1} onChange={(e) => setElectrode1(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {electrodes.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="electrode2" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القطب 2 (المهبط المحتمل)</label>
                <select id="electrode2" value={electrode2} onChange={(e) => setElectrode2(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {electrodes.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
            </div>
        </div>
        <button 
            onClick={() => onGalvanicCellSimulate(electrode1, electrode2)}
            disabled={isGalvanicCellLoading || electrode1 === electrode2}
            className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isGalvanicCellLoading ? '...جاري المحاكاة' : 'بناء الخلية'}
        </button>
    </div>
  );

  const renderThermoModeContent = () => (
     <div className="p-4 h-full flex flex-col justify-center">
        <h3 className="text-xl font-bold text-center mb-4">الكيمياء الحرارية</h3>
         <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
            أدخل معادلة كيميائية موزونة لتحليل تغيرات الطاقة المصاحبة لها.
        </p>
        <div className="space-y-4">
            <div>
                <label htmlFor="thermoEquation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المعادلة الكيميائية</label>
                <textarea
                    id="thermoEquation"
                    rows={3}
                    placeholder="e.g., CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l)"
                    value={thermoEquation}
                    onChange={(e) => setThermoEquation(e.target.value)}
                    className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 font-mono text-left"
                    dir="ltr"
                />
            </div>
        </div>
        <button 
            onClick={() => onThermoAnalyze(thermoEquation)}
            disabled={isThermoLoading || !thermoEquation}
            className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isThermoLoading ? '...جاري التحليل' : 'تحليل التفاعل'}
        </button>
    </div>
  );

  const renderSolutionModeContent = () => (
     <div className="p-4 h-full flex flex-col justify-center">
        <h3 className="text-xl font-bold text-center mb-4">كيمياء المحاليل</h3>
         <p className="text-sm text-center text-slate-500 dark:text-slate-400 mb-6">
            اختر مذابًا ومذيبًا وحدد التركيز لتحليل عملية الذوبان.
        </p>
        <div className="space-y-4">
            <div>
                <label htmlFor="solute" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المذاب</label>
                <select id="solute" value={solute} onChange={(e) => setSolute(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {solutes.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="solvent" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المذيب</label>
                <select id="solvent" value={solvent} onChange={(e) => setSolvent(e.target.value)} className="w-full p-2 rounded-lg bg-slate-200 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500">
                    {solvents.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="concentration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      التركيز (مولار): <span className="font-bold">{concentration.toFixed(2)} M</span>
                </label>
                <input
                  id="concentration"
                  type="range"
                  min="0.1"
                  max="5.0"
                  step="0.1"
                  value={concentration}
                  onChange={(e) => setConcentration(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
        </div>
        <button 
            onClick={() => onSolutionAnalyze(solute, solvent, concentration)}
            disabled={isSolutionLoading}
            className="w-full mt-6 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isSolutionLoading ? '...جاري التحليل' : 'تحليل المحلول'}
        </button>
    </div>
  );


  const renderContent = () => {
    switch(currentMode) {
      case 'atoms': return renderAtomModeContent();
      case 'compounds': return renderCompoundModeContent();
      case 'organic': return renderOrganicModeContent();
      case 'biochemistry': return renderBioModeContent();
      case 'electrochemistry': return renderElectroModeContent();
      case 'thermochemistry': return renderThermoModeContent();
      case 'solution': return renderSolutionModeContent();
      default: return null;
    }
  }

  return (
    <aside className="w-80 bg-slate-100 dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 flex flex-col z-10 shadow-lg">
      <nav className="p-2 grid grid-cols-4 gap-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          {modes.slice(0, 4).map(m => <NavButton key={m.mode} {...m} currentMode={currentMode} onModeChange={onModeChange} />)}
      </nav>
      <nav className="p-2 grid grid-cols-3 gap-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
           {modes.slice(4).map(m => <NavButton key={m.mode} {...m} currentMode={currentMode} onModeChange={onModeChange} />)}
      </nav>
      <div className="flex-grow flex flex-col overflow-hidden">
        {renderContent()}
      </div>
    </aside>
  );
};