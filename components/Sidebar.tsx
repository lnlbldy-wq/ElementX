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

  // Biochemistry state
  const [bioSearchTerm, setBioSearchTerm] = useState('');


  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, atomId: string) => {
    e.dataTransfer.setData('application/react-flow', atomId);
    e.dataTransfer.effectAllowed = 'move';
  };
  
  const handleReactClick = () => {
    onCompoundReact(reactant1, reactant2);
  }

  const handleOrganicCompoundClick = () => {
    if (isComparisonMode) {
      onOrganicCompoundCompare(
        { family: organicFamilyA, carbons: carbonCountA },
        { family: organicFamilyB, carbons: carbonCountB }
      );
    } else {
      onOrganicCompoundGenerate(organicFamilyA, carbonCountA);
    }
  }

  const handleSuggestionClick = (formula: string) => {
    if (activeInput === 'reactant1') {
        setReactant1(formula);
    } else if (activeInput === 'reactant2') {
        setReactant2(formula);
    }
    setSuggestions([]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, reactantSetter: React.Dispatch<React.SetStateAction<string>>) => {
      const value = e.target.value;
      reactantSetter(value);

      if (value.trim()) {
          const lowerCaseValue = value.toLowerCase();
          const filtered = COMMON_COMPOUNDS.filter(
              c => c.formula.toLowerCase().includes(lowerCaseValue) || c.name.toLowerCase().includes(lowerCaseValue)
          );
          setSuggestions(filtered);
      } else {
          setSuggestions([]);
      }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compoundInputRef.current && !compoundInputRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setActiveInput(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // Reset biochemistry search term when mode changes for better UX
    if (currentMode !== 'biochemistry') {
      setBioSearchTerm('');
    }
  }, [currentMode]);

  const filteredBiomolecules = useMemo(() => {
    const lowercasedFilter = bioSearchTerm.trim().toLowerCase();
    if (!lowercasedFilter) {
        return biomolecules;
    }

    const filtered: Record<string, string[]> = {};
    for (const [category, molecules] of Object.entries(biomolecules)) {
        const matchingMolecules = molecules.filter(molecule =>
            molecule.toLowerCase().includes(lowercasedFilter)
        );
        if (matchingMolecules.length > 0) {
            filtered[category] = matchingMolecules;
        }
    }
    return filtered;
  }, [bioSearchTerm]);

  const filteredAtoms = useMemo(() => {
    const cleanedSearchTerm = searchTerm.trim().toLowerCase();
    if (!cleanedSearchTerm) {
      return atoms;
    }
    return atoms.filter(atom =>
      atom.name.toLowerCase().includes(cleanedSearchTerm) ||
      atom.symbol.toLowerCase().includes(cleanedSearchTerm) ||
      atom.id.toLowerCase().includes(cleanedSearchTerm) // Also search by ID (e.g., 'H', 'Na', 'SO4')
    );
  }, [atoms, searchTerm]);

  const checkScrollability = useCallback(() => {
    const el = scrollContainerRef.current;
    if (el) {
      setCanScrollUp(el.scrollTop > 0);
      const isScrollable = el.scrollHeight > el.clientHeight;
      const isAtBottom = Math.abs(el.scrollHeight - el.clientHeight - el.scrollTop) < 1;
      setCanScrollDown(isScrollable && !isAtBottom);
    }
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    checkScrollability();
    const resizeObserver = new ResizeObserver(checkScrollability);
    resizeObserver.observe(el);
    el.addEventListener('scroll', checkScrollability);
    return () => {
      resizeObserver.disconnect();
      el.removeEventListener('scroll', checkScrollability);
    };
  }, [filteredAtoms, checkScrollability, currentMode]);

  const scroll = (direction: 'up' | 'down') => {
    if (scrollContainerRef.current) {
      smoothScrollBy(scrollContainerRef.current, direction === 'up' ? -200 : 200, 400);
    }
  };
  
  const renderAtomsView = () => {
    // Separate atoms and ions based on their designated color for grouping
    const elements = filteredAtoms.filter(atom => atom.color !== 'bg-cyan-600');
    const polyatomicIons = filteredAtoms.filter(atom => atom.color === 'bg-cyan-600');

    const renderAtomList = (list: Omit<Atom, 'instanceId' | 'x' | 'y'>[]) => (
      list.map((atom) => (
        <div
          key={atom.id}
          className="flex flex-col items-center cursor-grab active:cursor-grabbing transform hover:scale-110 transition-transform duration-200"
          draggable
          onDragStart={(e) => handleDragStart(e, atom.id)}
          onClick={() => onAtomClick(atom.id)}
        >
          <AtomIcon atom={atom as Atom} />
          <span className="text-sm mt-2 text-slate-700 dark:text-slate-300">{atom.name}</span>
        </div>
      ))
    );

    return (
      <div className="w-full flex flex-col items-center h-full">
        <div className="w-full p-2 flex-shrink-0">
          <input
              type="text"
              placeholder="🔍 ابحث عن عنصر أو أيون..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          />
        </div>
        
        <button 
          onClick={() => scroll('up')}
          className="mb-2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-500 dark:text-cyan-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Scroll up"
          disabled={!canScrollUp}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>
        </button>

        <div ref={scrollContainerRef} className="flex-grow w-full overflow-y-auto scroll-smooth scrollbar-hide">
          <div className="flex flex-col gap-5 items-center w-full py-2">
              {renderAtomList(elements)}

              {polyatomicIons.length > 0 && (
                <>
                  <div className="w-11/12 pt-4 mt-4 border-t-2 border-slate-300 dark:border-slate-600">
                    <h3 className="text-md font-semibold text-cyan-600 dark:text-cyan-400 text-center">
                      الأيونات متعددة الذرات
                    </h3>
                  </div>
                  {renderAtomList(polyatomicIons)}
                </>
              )}

              {filteredAtoms.length === 0 && (
                  <div className="text-center text-slate-500 dark:text-slate-400 p-4">
                      لا توجد عناصر أو أيونات مطابقة
                  </div>
              )}
          </div>
        </div>
        
        <button 
          onClick={() => scroll('down')}
          className="mt-2 p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-cyan-500 dark:text-cyan-400 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
          aria-label="Scroll down"
          disabled={!canScrollDown}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
        </button>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (suggestions.length === 0 || activeInput === null) return null;

    return (
        <div className="absolute left-0 right-0 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-lg z-20 max-h-48 overflow-y-auto scrollbar-hide">
            {suggestions.map((s) => (
                <div
                    key={s.formula}
                    onClick={() => handleSuggestionClick(s.formula)}
                    className="p-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between items-center"
                >
                    <span className="font-mono text-slate-800 dark:text-slate-200">{s.formula}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{s.name}</span>
                </div>
            ))}
        </div>
    );
  }

  const renderCompoundsView = () => (
    <div className="p-4 w-full flex flex-col gap-4 flex-grow" ref={compoundInputRef}>
        <h2 className="text-lg font-bold text-center text-cyan-600 dark:text-cyan-400">تفاعل مركبين</h2>
        
        <div className="relative">
            <label htmlFor="reactant1" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المتفاعل الأول</label>
            <input
                type="text"
                id="reactant1"
                placeholder="e.g., HCl"
                value={reactant1}
                onChange={(e) => handleInputChange(e, setReactant1)}
                onFocus={() => setActiveInput('reactant1')}
                autoComplete="off"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            {activeInput === 'reactant1' && renderSuggestions()}
        </div>

        <div className="relative">
            <label htmlFor="reactant2" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المتفاعل الثاني</label>
            <input
                type="text"
                id="reactant2"
                placeholder="e.g., NaOH"
                value={reactant2}
                onChange={(e) => handleInputChange(e, setReactant2)}
                onFocus={() => setActiveInput('reactant2')}
                autoComplete="off"
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
            {activeInput === 'reactant2' && renderSuggestions()}
        </div>

        <div className="pt-2">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-2 text-center">أو اختر من المركبات الشائعة</h3>
            <div className="grid grid-cols-3 gap-2">
                {COMMON_COMPOUNDS.slice(0, 6).map(compound => (
                    <button
                        key={compound.formula}
                        onClick={() => {
                           if (activeInput === 'reactant1') {
                               setReactant1(compound.formula);
                           } else if (activeInput === 'reactant2') {
                               setReactant2(compound.formula);
                           } else {
                               if (!reactant1) setReactant1(compound.formula);
                               else if (!reactant2) setReactant2(compound.formula);
                           }
                           setSuggestions([]);
                        }}
                        title={compound.name}
                        className="px-2 py-2 text-sm font-mono bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-md whitespace-nowrap hover:bg-cyan-200 dark:hover:bg-cyan-800 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all text-center"
                    >
                        {compound.formula}
                    </button>
                ))}
            </div>
        </div>

        <button
            onClick={handleReactClick}
            disabled={isCompoundLoading || !reactant1 || !reactant2}
            className="mt-auto w-full bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isCompoundLoading ? '...يتم التحليل' : 'بدء التفاعل'}
        </button>
    </div>
  );
  
  const OrganicCompoundGenerator: React.FC<{
    title: string;
    family: string;
    onFamilyChange: (family: string) => void;
    carbonCount: number;
    onCarbonCountChange: (count: number) => void;
  }> = ({ title, family, onFamilyChange, carbonCount, onCarbonCountChange }) => {
    
    const minCarbons = useMemo(() => {
        switch (family) {
            case 'ألكين': case 'ألكاين': case 'إيثر': case 'إستر': return 2;
            case 'ألكان حلقي': case 'كيتون': return 3;
            default: return 1; // ألكان، كحول، هاليد، أمين، ألدهيد، حمض كربوكسيلي، أميد
        }
    }, [family]);

    useEffect(() => {
        if (carbonCount < minCarbons) {
            onCarbonCountChange(minCarbons);
        }
    }, [family, minCarbons, carbonCount, onCarbonCountChange]);
    
    const handleFamilyChange = (newFamily: string) => {
      onFamilyChange(newFamily);
      if (newFamily === 'حلقة بنزين') {
        onCarbonCountChange(6);
      }
    };

    const families = [
        'ألكان', 'ألكين', 'ألكاين', 'ألكان حلقي', 'حلقة بنزين', 'كحول', 
        'هاليد الألكيل', 'إيثر', 'أمين', 'ألدهيد', 'كيتون', 
        'حمض كربوكسيلي', 'إستر', 'أميد'
    ];

    return (
    <div className="p-3 rounded-lg border border-slate-300 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50">
        {title && <h3 className="text-md font-bold text-center text-slate-700 dark:text-slate-300 mb-3">{title}</h3>}
        <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">العائلة / المجموعة الوظيفية</label>
            <div className="grid grid-cols-3 gap-1 bg-slate-200 dark:bg-slate-900/50 rounded-lg p-1 text-sm">
                {families.map(f => (
                    <button key={f} onClick={() => handleFamilyChange(f)}
                        className={`flex-1 py-1 px-1.5 my-0.5 rounded-md transition-colors text-xs ${family === f ? 'bg-white dark:bg-slate-700 text-cyan-600 dark:text-cyan-300 shadow' : 'text-slate-600 dark:text-slate-400'}`}>
                        {f}
                    </button>
                ))}
            </div>
        </div>
        <div className="mt-3">
             <label htmlFor={`carbonCount-${title}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                ذرات الكربون: <span className="font-bold text-cyan-600 dark:text-cyan-400">{carbonCount}</span>
            </label>
            <input type="range" id={`carbonCount-${title}`} min={minCarbons} max="10" value={carbonCount}
                onChange={(e) => onCarbonCountChange(parseInt(e.target.value, 10))}
                disabled={family === 'حلقة بنزين'}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" />
        </div>
        {family === 'ألكان حلقي' && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2 text-center">أمثلة شائعة</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <button onClick={() => onCarbonCountChange(3)} className="py-1 px-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-800 transition-colors">بروبان حلقي</button>
              <button onClick={() => onCarbonCountChange(4)} className="py-1 px-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-800 transition-colors">بيوتان حلقي</button>
              <button onClick={() => onCarbonCountChange(5)} className="py-1 px-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-800 transition-colors">بنتان حلقي</button>
              <button onClick={() => onCarbonCountChange(6)} className="py-1 px-2 rounded-md bg-slate-200 dark:bg-slate-700 hover:bg-cyan-100 dark:hover:bg-cyan-800 transition-colors">هكسان حلقي</button>
            </div>
          </div>
        )}
    </div>
  )};

  const renderOrganicView = () => (
    <div className="p-2 w-full flex flex-col gap-3 flex-grow overflow-y-auto scrollbar-hide">
        <h2 className="text-lg font-bold text-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">استكشف المركبات العضوية</h2>
        
        <div className="flex items-center justify-center gap-2 flex-shrink-0">
            <span className={`text-sm font-medium ${!isComparisonMode ? 'text-cyan-600 dark:text-cyan-400' : 'text-slate-500'}`}>مركب واحد</span>
            <button onClick={() => setIsComparisonMode(!isComparisonMode)} className={`relative inline-flex items-center h-6 rounded-full w-11 transition-colors ${isComparisonMode ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${isComparisonMode ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
            <span className={`text-sm font-medium ${isComparisonMode ? 'text-indigo-500 dark:text-indigo-400' : 'text-slate-500'}`}>وضع المقارنة</span>
        </div>

        {isComparisonMode ? (
          <>
            <OrganicCompoundGenerator 
              title="المركب 1"
              family={organicFamilyA}
              onFamilyChange={setOrganicFamilyA}
              carbonCount={carbonCountA}
              onCarbonCountChange={setCarbonCountA}
            />
            <OrganicCompoundGenerator 
              title="المركب 2"
              family={organicFamilyB}
              onFamilyChange={setOrganicFamilyB}
              carbonCount={carbonCountB}
              onCarbonCountChange={setCarbonCountB}
            />
          </>
        ) : (
           <OrganicCompoundGenerator
              title=""
              family={organicFamilyA}
              onFamilyChange={setOrganicFamilyA}
              carbonCount={carbonCountA}
              onCarbonCountChange={setCarbonCountA}
            />
        )}
        
        <button
            onClick={handleOrganicCompoundClick}
            disabled={isOrganicCompoundLoading}
            className="mt-auto flex-shrink-0 w-full bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isOrganicCompoundLoading ? '...جاري التحميل' : (isComparisonMode ? 'مقارنة' : 'إنشاء')}
        </button>
    </div>
  );

  const renderBiochemistryView = () => {
    return (
        <div className="p-2 w-full flex flex-col gap-3 flex-grow overflow-y-auto scrollbar-hide">
            <h2 className="text-lg font-bold text-center text-cyan-600 dark:text-cyan-400 flex-shrink-0">استكشاف الكيمياء الحيوية</h2>
            <div className="w-full px-2 flex-shrink-0">
                <input
                    type="text"
                    placeholder="🔍 ابحث عن جزيء حيوي..."
                    value={bioSearchTerm}
                    onChange={(e) => setBioSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
            </div>
            <div className="flex flex-col gap-4 p-2">
                {Object.entries(filteredBiomolecules).map(([category, molecules]) => (
                    <div key={category}>
                        <h3 className="text-md font-semibold text-slate-700 dark:text-slate-300 mb-2 border-b-2 border-cyan-500/50 pb-1">{category}</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {molecules.map(molecule => (
                                <button 
                                    key={molecule} 
                                    onClick={() => onBiomoleculeGenerate(molecule)}
                                    disabled={isBiomoleculeLoading}
                                    className="w-full text-sm bg-slate-200 dark:bg-slate-700/80 hover:bg-cyan-200 dark:hover:bg-cyan-800/80 text-slate-800 dark:text-slate-200 font-medium py-2 px-2 rounded-lg shadow-sm transition-colors disabled:bg-slate-400/50 dark:disabled:bg-slate-600/50 disabled:cursor-not-allowed"
                                >
                                    {molecule}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
                {Object.keys(filteredBiomolecules).length === 0 && (
                    <p className="text-center text-slate-500 dark:text-slate-400 mt-4">
                        لا توجد نتائج مطابقة.
                    </p>
                )}
            </div>
        </div>
    );
};


  const renderElectrochemistryView = () => {
    const metals = [
        { symbol: 'Cu', name: 'نحاس' }, { symbol: 'Zn', name: 'زنك' }, { symbol: 'Ag', name: 'فضة' },
        { symbol: 'Mg', name: 'مغنيسيوم' }, { symbol: 'Ni', name: 'نيكل' }, { symbol: 'Fe', name: 'حديد' },
        { symbol: 'Al', name: 'ألومنيوم' }, { symbol: 'Pb', name: 'رصاص' }
    ];
    return (
        <div className="p-4 w-full flex flex-col gap-4 flex-grow">
            <h2 className="text-lg font-bold text-center text-cyan-600 dark:text-cyan-400">الكيمياء الكهربائية</h2>
            <p className="text-sm text-center text-slate-600 dark:text-slate-400 -mt-2 mb-2">بناء خلية جلفانية.</p>
            <div>
                <label htmlFor="electrode1" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القطب الأول</label>
                <select id="electrode1" value={electrode1} onChange={e => setElectrode1(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    {metals.map(m => <option key={m.symbol} value={m.symbol}>{m.name} ({m.symbol})</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="electrode2" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">القطب الثاني</label>
                <select id="electrode2" value={electrode2} onChange={e => setElectrode2(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    {metals.map(m => <option key={m.symbol} value={m.symbol}>{m.name} ({m.symbol})</option>)}
                </select>
            </div>
            <button
                onClick={() => onGalvanicCellSimulate(electrode1, electrode2)}
                disabled={isGalvanicCellLoading || electrode1 === electrode2}
                className="mt-auto w-full bg-purple-500 hover:bg-purple-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                {isGalvanicCellLoading ? "...جاري المحاكاة" : "محاكاة الخلية"}
            </button>
        </div>
    );
  };

   const renderThermochemistryView = () => (
    <div className="p-4 w-full flex flex-col gap-4 flex-grow">
        <h2 className="text-lg font-bold text-center text-cyan-600 dark:text-cyan-400">الكيمياء الحرارية</h2>
        <p className="text-sm text-center text-slate-600 dark:text-slate-400 -mt-2 mb-2">حلل طاقة التفاعلات الكيميائية.</p>
        <div>
            <label htmlFor="thermoEquation" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                أدخل معادلة كيميائية موزونة
            </label>
            <textarea
                id="thermoEquation"
                placeholder="e.g., CH₄(g) + 2O₂(g) → CO₂(g) + 2H₂O(l)"
                value={thermoEquation}
                onChange={(e) => setThermoEquation(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono"
            />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2">
            تأكد من تضمين حالات المادة (g, l, s, aq) للحصول على أدق النتائج.
        </p>
        <button
            onClick={() => onThermoAnalyze(thermoEquation)}
            disabled={isThermoLoading || !thermoEquation.trim()}
            className="mt-auto w-full bg-orange-500 hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
        >
            {isThermoLoading ? "...جاري التحليل" : "تحليل التفاعل"}
        </button>
    </div>
  );

  const renderSolutionView = () => {
    const solutes = [
        { name: 'ملح الطعام', formula: 'NaCl' },
        { name: 'سكر المائدة', formula: 'C₁₂H₂₂O₁₁' },
        { name: 'هيدروكسيد الصوديوم', formula: 'NaOH' },
        { name: 'حمض الهيدروكلوريك', formula: 'HCl' },
        { name: 'نترات الفضة', formula: 'AgNO₃' },
    ];
    const solvents = [
        { name: 'ماء', formula: 'H₂O' },
        { name: 'إيثانول', formula: 'C₂H₅OH' },
        { name: 'هكسان', formula: 'C₆H₁₄' },
    ];

    return (
        <div className="p-4 w-full flex flex-col gap-4 flex-grow">
            <h2 className="text-lg font-bold text-center text-cyan-600 dark:text-cyan-400">كيمياء المحاليل</h2>
            <p className="text-sm text-center text-slate-600 dark:text-slate-400 -mt-2 mb-2">محاكاة عملية الذوبان.</p>
            <div>
                <label htmlFor="solute" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المذاب</label>
                <select id="solute" value={solute} onChange={e => setSolute(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    {solutes.map(s => <option key={s.formula} value={s.formula}>{s.name} ({s.formula})</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="solvent" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المذيب</label>
                <select id="solvent" value={solvent} onChange={e => setSolvent(e.target.value)} className="w-full px-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    {solvents.map(s => <option key={s.formula} value={s.formula}>{s.name} ({s.formula})</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="concentration" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    التركيز (مول/لتر): <span className="font-bold text-cyan-600 dark:text-cyan-400">{concentration.toFixed(1)} M</span>
                </label>
                <input
                    type="range"
                    id="concentration"
                    min="0.1"
                    max="2.0"
                    step="0.1"
                    value={concentration}
                    onChange={(e) => setConcentration(parseFloat(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
                />
            </div>
            <button
                onClick={() => onSolutionAnalyze(solute, solvent, concentration)}
                disabled={isSolutionLoading}
                className="mt-auto w-full bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
            >
                {isSolutionLoading ? "...جاري التحليل" : "تحليل المحلول"}
            </button>
        </div>
    );
  };

  const renderContent = () => {
    switch(currentMode) {
      case 'atoms': return renderAtomsView();
      case 'compounds': return renderCompoundsView();
      case 'organic': return renderOrganicView();
      case 'biochemistry': return renderBiochemistryView();
      case 'electrochemistry': return renderElectrochemistryView();
      case 'thermochemistry': return renderThermochemistryView();
      case 'solution': return renderSolutionView();
      default: return null;
    }
  }

  return (
    <aside className="w-80 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur-sm border-l border-slate-200 dark:border-slate-700 flex flex-col z-10 shadow-xl">
        <div className="p-2 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
            <div className="grid grid-cols-3 gap-2">
                {/* FIX: Pass props explicitly to avoid TypeScript error with spread syntax and key prop. */}
                {modes.map((m) => (
                    <NavButton 
                        key={m.mode}
                        mode={m.mode}
                        label={m.label}
                        emoji={m.emoji}
                        currentMode={currentMode}
                        onModeChange={onModeChange}
                    />
                ))}
            </div>
        </div>
        <div className="flex-grow flex flex-col overflow-y-auto scrollbar-hide">
            {renderContent()}
        </div>
    </aside>
  );
};