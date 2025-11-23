
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ReactionCanvas } from './components/ReactionCanvas';
import { MoleculeInfoCard } from './components/MoleculeInfoCard';
import { CompoundReactionResult } from './components/CompoundReactionResult';
import { WelcomeScreen } from './components/WelcomeScreen';
import { ReactionSelection } from './components/ReactionSelection';
import { OrganicCompoundInfoCard } from './components/HydrocarbonInfoCard';
import { OrganicCompoundComparisonCard } from './components/HydrocarbonComparisonCard';
import { BiomoleculeInfoCard } from './components/BiomoleculeInfoCard';
import { GalvanicCellCard } from './components/GalvanicCellCard';
import { ThermoChemistryCard } from './components/ThermoChemistryCard';
import { SolutionChemistryCard } from './components/SolutionChemistryCard';
import { CompoundSelector } from './components/CompoundSelector';
import { ATOMS } from './constants';
import type { Atom, Reaction, CompoundReaction, OrganicCompoundInfo, BiomoleculeInfo, GalvanicCellInfo, ThermoChemistryInfo, SolutionChemistryInfo } from './types';

type AppState = 'welcome' | 'simulation';
type SimulationMode = 'atoms' | 'compounds' | 'organic' | 'biochemistry' | 'electrochemistry' | 'thermochemistry' | 'solution';
type Theme = 'light' | 'dark';

const isRetryableError = (error: any): boolean => {
    if (!error) return false;

    const code = error?.error?.code;
    if (code === 429 || code === 500 || code === 503) {
        return true;
    }

    const status = (error?.error?.status || '').toUpperCase();
    if (status === 'RESOURCE_EXHAUSTED' || status === 'UNAVAILABLE' || status === 'UNKNOWN') {
        return true;
    }
    
    const message = (error.message || error.toString() || '').toLowerCase();
    return (
        message.includes('429') ||
        message.includes('500') ||
        message.includes('503') ||
        message.includes('quota') ||
        message.includes('rate limit') ||
        message.includes('resource_exhausted') ||
        message.includes('service unavailable') ||
        message.includes('xhr error')
    );
};

async function callApiWithRetry<T>(apiCall: () => Promise<T>): Promise<T> {
    const MAX_RETRIES = 3;
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            return await apiCall();
        } catch (error: any) {
            attempt++;
            if (isRetryableError(error) && attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt) * 10000 + Math.random() * 1000;
                console.warn(`API call failed. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt})`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("API call failed after retries or with non-retryable error.", error);
                throw error;
            }
        }
    }
    throw new Error(`API call failed after ${MAX_RETRIES} attempts.`);
};

// Helper for image generation to keep main component cleaner
async function generateImage(prompt: string): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
        config: { responseModalities: [Modality.IMAGE] }
    });
    const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (part?.inlineData?.data) {
        return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error('No image data generated');
}


const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('atoms');
  const [theme, setTheme] = useState<Theme>('light');
  
  // Atoms Mode State
  const [placedAtoms, setPlacedAtoms] = useState<Atom[]>([]);
  const [foundReactions, setFoundReactions] = useState<Reaction[] | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Compounds Mode State
  const [compoundReactionResult, setCompoundReactionResult] = useState<CompoundReaction | null>(null);
  const [isCompoundReactionLoading, setIsCompoundReactionLoading] = useState(false);
  const [compoundReactionError, setCompoundReactionError] = useState<string | null>(null);
  const [reactant1, setReactant1] = useState('');
  const [reactant2, setReactant2] = useState('');

  // Organic Mode State
  const [organicCompoundInfo, setOrganicCompoundInfo] = useState<OrganicCompoundInfo | null>(null);
  const [isOrganicCompoundLoading, setIsOrganicCompoundLoading] = useState(false);
  const [organicCompoundError, setOrganicCompoundError] = useState<string | null>(null);
  const [comparisonInfo, setComparisonInfo] = useState<{ a: OrganicCompoundInfo; b: OrganicCompoundInfo } | null>(null);

  // Biomolecule Mode State
  const [biomoleculeInfo, setBiomoleculeInfo] = useState<BiomoleculeInfo | null>(null);
  const [isBiomoleculeLoading, setIsBiomoleculeLoading] = useState(false);
  const [biomoleculeError, setBiomoleculeError] = useState<string | null>(null);

  // Galvanic Cell Mode State
  const [galvanicCellInfo, setGalvanicCellInfo] = useState<GalvanicCellInfo | null>(null);
  const [isGalvanicCellLoading, setIsGalvanicCellLoading] = useState(false);
  const [galvanicCellError, setGalvanicCellError] = useState<string | null>(null);

  // Thermo Chemistry Mode State
  const [thermoInfo, setThermoInfo] = useState<ThermoChemistryInfo | null>(null);
  const [isThermoLoading, setIsThermoLoading] = useState(false);
  const [thermoError, setThermoError] = useState<string | null>(null);

  // Solution Chemistry Mode State
  const [solutionInfo, setSolutionInfo] = useState<SolutionChemistryInfo | null>(null);
  const [isSolutionLoading, setIsSolutionLoading] = useState(false);
  const [solutionError, setSolutionError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // --- ATOM MODE LOGIC ---
  const handleAtomDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const atomId = e.dataTransfer.getData('application/react-flow');
    const atom = ATOMS.find((a) => a.id === atomId);
    
    if (atom) {
      const rect = (e.target as Element).getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newAtom: Atom = {
        ...atom,
        instanceId: Date.now(),
        x,
        y,
      };
      setPlacedAtoms((prev) => [...prev, newAtom]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAnalyzeAtoms = async () => {
    if (placedAtoms.length < 2) return;
    
    setIsLoading(true);
    setError(null);
    setFoundReactions(null);
    setSelectedReaction(null);
    
    try {
        const atomCounts = placedAtoms.reduce((acc, atom) => {
            acc[atom.symbol] = (acc[atom.symbol] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        
        const atomString = Object.entries(atomCounts).map(([sym, count]) => `${count} ${sym}`).join(', ');

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Identify up to 3 possible chemical reactions or molecules formed by exactly these atoms: ${atomString}. If the atoms can form a stable molecule (e.g., 2 H and 1 O form water), return it. Response must be valid JSON array. All text in Arabic.`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: {type: Type.STRING},
                            name: {type: Type.STRING},
                            formula: {type: Type.STRING},
                            emoji: {type: Type.STRING},
                            reactants: {type: Type.ARRAY, items: {type: Type.STRING}, description: "List of reactant formulas or symbols involved."},
                            bondType: {type: Type.STRING},
                            explanation: {type: Type.STRING},
                            molecularDensity: {type: Type.STRING},
                            acidBase: {type: Type.STRING},
                            applications: {type: Type.STRING},
                            commonality: {type: Type.STRING},
                            molarMass: {type: Type.STRING},
                            state: {type: Type.STRING},
                            molecularGeometry: {type: Type.STRING},
                            safety: {
                                type: Type.OBJECT,
                                properties: {
                                    warnings: {type: Type.ARRAY, items: {type: Type.STRING}},
                                    ghsSymbols: {type: Type.ARRAY, items: {type: Type.STRING}}
                                }
                            },
                            namingMethod: {type: Type.STRING},
                        },
                         required: ["id", "name", "formula", "emoji", "bondType", "explanation", "reactants"]
                    }
                }
            }
        }));
        
        const rawText = response.text;
        if (rawText) {
            const result = JSON.parse(rawText);
            if (Array.isArray(result) && result.length > 0) {
                 setFoundReactions(result);
            } else {
                setFoundReactions(null);
                setError("لم يتم العثور على تفاعلات مستقرة لهذه الذرات.");
            }
        }
    } catch (e) {
        console.error("Reaction check failed", e);
        setError('حدث خطأ أثناء تحليل التفاعل.');
    } finally {
        setIsLoading(false);
    }
  };


  // --- COMPOUND MODE LOGIC ---
  const handleCompoundReaction = async (r1: string, r2: string) => {
    setIsCompoundReactionLoading(true);
    setCompoundReactionError(null);
    setCompoundReactionResult(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Simulate the chemical reaction between ${r1} and ${r2}. Provide balanced equation, type, explanation, products, and safety notes. If no reaction occurs, indicate that. Response in Arabic JSON.`,
             config: {
                    responseMimeType: 'application/json',
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            id: {type: Type.STRING},
                            balancedEquation: {type: Type.STRING},
                            reactionType: {type: Type.STRING},
                            explanation: {type: Type.STRING},
                            products: {
                                type: Type.ARRAY, 
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: {type: Type.STRING},
                                        formula: {type: Type.STRING},
                                        state: {type: Type.STRING},
                                    }
                                }
                            },
                            safetyNotes: {type: Type.ARRAY, items: {type: Type.STRING}},
                        },
                        required: ["id", "balancedEquation", "reactionType", "explanation"]
                    }
             }
        }));

         const rawText = response.text;
         if (rawText) {
             setCompoundReactionResult(JSON.parse(rawText));
         }

    } catch (e) {
        setCompoundReactionError("فشل في محاكاة التفاعل. حاول مرة أخرى.");
    } finally {
        setIsCompoundReactionLoading(false);
    }
  };

  // --- ORGANIC MODE LOGIC ---
  const handleOrganicGeneration = async (family: string, carbons: number) => {
      setIsOrganicCompoundLoading(true);
      setOrganicCompoundError(null);
      setOrganicCompoundInfo(null);
      setComparisonInfo(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const textResponsePromise = callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Generate detailed information for a ${family} with ${carbons} carbon atoms. Provide name, formula, description, uses, properties. Response in Arabic JSON.`,
              config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                         id: {type: Type.STRING},
                         name: {type: Type.STRING},
                         formula: {type: Type.STRING},
                         family: {type: Type.STRING},
                         description: {type: Type.STRING},
                         uses: {type: Type.STRING},
                         stateAtSTP: {type: Type.STRING},
                         iupacNaming: {type: Type.STRING},
                         boilingPoint: {type: Type.STRING},
                         meltingPoint: {type: Type.STRING},
                    },
                    required: ["name", "formula", "description"]
                }
              }
          }));

          // Updated Prompt for very clear, English-only academic structure
          const imageResponsePromise = generateImage(`Pristine, high-resolution, academic-textbook quality 2D skeletal chemical structure diagram for a ${family} molecule with ${carbons} carbon atoms. 
          - Pure white background.
          - Sharp black lines.
          - Standard English chemical symbols (e.g., OH, NH2).
          - No text labels other than element symbols.
          - No Arabic text.`);
          
          const [textResponse, imageBase64] = await Promise.all([textResponsePromise, imageResponsePromise]);
          
          const rawText = textResponse.text;
          if (rawText) {
              const info = JSON.parse(rawText);
              info.lewisStructureImage = imageBase64;
              setOrganicCompoundInfo(info);
          }

      } catch (e) {
          setOrganicCompoundError("فشل في توليد بيانات المركب العضوي.");
      } finally {
          setIsOrganicCompoundLoading(false);
      }
  };

  const handleOrganicComparison = async (paramsA: { family: string; carbons: number }, paramsB: { family: string; carbons: number }) => {
      setIsOrganicCompoundLoading(true);
      setOrganicCompoundError(null);
      setOrganicCompoundInfo(null); // Clear single view

      try {
           const fetchData = async (family: string, carbons: number) => {
               const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
               const textResp = await callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
                   model: 'gemini-2.5-flash',
                   contents: `Generate info for ${family} with ${carbons} carbons. Arabic JSON.`,
                    config: { responseMimeType: 'application/json', responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                             id: {type: Type.STRING},
                             name: {type: Type.STRING},
                             formula: {type: Type.STRING},
                             family: {type: Type.STRING},
                             description: {type: Type.STRING},
                             uses: {type: Type.STRING},
                             stateAtSTP: {type: Type.STRING},
                             iupacNaming: {type: Type.STRING},
                             boilingPoint: {type: Type.STRING},
                             meltingPoint: {type: Type.STRING},
                        }, required: ["name", "formula"]
                    }}
               }));
               // Updated prompt
               const imgResp = await generateImage(`Pristine, high-resolution, academic-textbook quality 2D skeletal chemical structure diagram for a ${family} with ${carbons} carbons. White background, black lines. English symbols only.`);
               const data = JSON.parse(textResp.text);
               data.lewisStructureImage = imgResp;
               return data;
           };

           const [infoA, infoB] = await Promise.all([
               fetchData(paramsA.family, paramsA.carbons),
               fetchData(paramsB.family, paramsB.carbons)
           ]);
           
           setComparisonInfo({ a: infoA, b: infoB });

      } catch (e) {
           setOrganicCompoundError("فشل في مقارنة المركبات.");
      } finally {
          setIsOrganicCompoundLoading(false);
      }
  };

  // --- BIOMOLECULE MODE LOGIC ---
  const handleBiomoleculeGenerate = async (moleculeName: string) => {
      setIsBiomoleculeLoading(true);
      setBiomoleculeError(null);
      setBiomoleculeInfo(null);
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const textPromise = callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Detailed biochemistry info for ${moleculeName}. Arabic JSON.`,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          id: {type: Type.STRING},
                          name: {type: Type.STRING},
                          formula: {type: Type.STRING},
                          type: {type: Type.STRING},
                          description: {type: Type.STRING},
                          biologicalFunction: {type: Type.STRING},
                      }, required: ["name", "formula", "description"]
                  }
              }
          }));

          // Updated prompt
          const imagePromise = generateImage(`High-quality scientific 3D structure representation of ${moleculeName} biomolecule. Clean white background. No text labels.`);
          
          const [textResp, imgBase64] = await Promise.all([textPromise, imagePromise]);
          const data = JSON.parse(textResp.text);
          data.structureImage = imgBase64;
          setBiomoleculeInfo(data);

      } catch(e) {
          setBiomoleculeError("فشل في تحميل بيانات الجزيء الحيوي.");
      } finally {
          setIsBiomoleculeLoading(false);
      }
  };

  // --- GALVANIC CELL MODE LOGIC ---
  const handleGalvanicCellSimulate = async (metal1: string, metal2: string) => {
      setIsGalvanicCellLoading(true);
      setGalvanicCellError(null);
      setGalvanicCellInfo(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const textPromise = callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Simulate galvanic cell with ${metal1} and ${metal2} electrodes. Identify anode/cathode, reactions, potential. Arabic JSON.`,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          id: {type: Type.STRING},
                          anode: {type: Type.OBJECT, properties: {metal: {type: Type.STRING}, halfReaction: {type: Type.STRING}}},
                          cathode: {type: Type.OBJECT, properties: {metal: {type: Type.STRING}, halfReaction: {type: Type.STRING}}},
                          overallReaction: {type: Type.STRING},
                          cellPotential: {type: Type.STRING},
                          explanation: {type: Type.STRING},
                      }, required: ["anode", "cathode", "cellPotential"]
                  }
              }
          }));

          // Updated prompt
          const imagePromise = generateImage(`Clear educational diagram of a galvanic cell with ${metal1} and ${metal2} electrodes. White background. Clearly labeled in English: Anode, Cathode, Salt Bridge, Voltmeter. No Arabic text.`);
          
          const [textResp, imgBase64] = await Promise.all([textPromise, imagePromise]);
          const data = JSON.parse(textResp.text);
          data.diagramImage = imgBase64;
          setGalvanicCellInfo(data);

      } catch(e) {
          setGalvanicCellError("فشل في محاكاة الخلية الجلفانية.");
      } finally {
          setIsGalvanicCellLoading(false);
      }
  };

  // --- THERMOCHEMISTRY MODE LOGIC ---
  const handleThermoAnalyze = async (equation: string) => {
      setIsThermoLoading(true);
      setThermoError(null);
      setThermoInfo(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const textPromise = callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Analyze thermodynamics of: ${equation}. Calculate Delta H, S, G. Determine spontaneity. Arabic JSON.`,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          id: {type: Type.STRING},
                          equation: {type: Type.STRING},
                          enthalpyChange: {type: Type.STRING},
                          entropyChange: {type: Type.STRING},
                          gibbsFreeEnergyChange: {type: Type.STRING},
                          isExothermic: {type: Type.BOOLEAN},
                          isSpontaneous: {type: Type.BOOLEAN},
                          explanation: {type: Type.STRING},
                      }, required: ["enthalpyChange", "isExothermic", "explanation"]
                  }
              }
          }));

          // Updated prompt
          const imagePromise = generateImage(`Scientific energy profile diagram for reaction: ${equation}. White background. Clearly labeled axes in English (Potential Energy vs Reaction Coordinate). Mark Reactants, Products, Activation Energy, Delta H.`);

          const [textResp, imgBase64] = await Promise.all([textPromise, imagePromise]);
          const data = JSON.parse(textResp.text);
          data.energyProfileImage = imgBase64;
          setThermoInfo(data);

      } catch (e) {
          setThermoError("فشل في تحليل التفاعل الحراري.");
      } finally {
          setIsThermoLoading(false);
      }
  };

  // --- SOLUTION CHEMISTRY MODE LOGIC ---
  const handleSolutionAnalyze = async (solute: string, solvent: string, concentration: number) => {
      setIsSolutionLoading(true);
      setSolutionError(null);
      setSolutionInfo(null);

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const textPromise = callApiWithRetry<GenerateContentResponse>(() => ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Analyze solution of ${solute} in ${solvent} at ${concentration}M. Describe dissolution, type. Arabic JSON.`,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          id: {type: Type.STRING},
                          soluteName: {type: Type.STRING},
                          soluteFormula: {type: Type.STRING},
                          solventName: {type: Type.STRING},
                          concentrationMolarity: {type: Type.STRING},
                          solutionDescription: {type: Type.STRING},
                          solutionType: {type: Type.STRING},
                      }, required: ["solutionDescription", "solutionType"]
                  }
              }
          }));

          // Updated prompt
          const imagePromise = generateImage(`Educational diagram showing microscopic view of ${solute} molecules dissolving in ${solvent}. White background. Clear English labels.`);
          
          const [textResp, imgBase64] = await Promise.all([textPromise, imagePromise]);
          const data = JSON.parse(textResp.text);
          data.solutionImage = imgBase64;
          setSolutionInfo(data);

      } catch (e) {
          setSolutionError("فشل في تحليل المحلول.");
      } finally {
          setIsSolutionLoading(false);
      }
  };


  if (appState === 'welcome') {
    return <WelcomeScreen onStart={() => setAppState('simulation')} />;
  }

  return (
    <div className={`flex h-screen w-full bg-white dark:bg-gray-900 text-slate-900 dark:text-white transition-colors duration-300 overflow-hidden ${theme}`}>
      <Sidebar 
        atoms={ATOMS}
        onAtomClick={(id) => {
             const atom = ATOMS.find(a => a.id === id);
             if(atom) setPlacedAtoms(prev => [...prev, {...atom, instanceId: Date.now(), x: 100, y: 100}]);
        }}
        onModeChange={(mode) => setSimulationMode(mode)}
        currentMode={simulationMode}
        onCompoundReact={handleCompoundReaction}
        isCompoundLoading={isCompoundReactionLoading}
        reactant1={reactant1}
        setReactant1={setReactant1}
        reactant2={reactant2}
        setReactant2={setReactant2}
        onOrganicCompoundGenerate={handleOrganicGeneration}
        onOrganicCompoundCompare={handleOrganicComparison}
        isOrganicCompoundLoading={isOrganicCompoundLoading}
        onBiomoleculeGenerate={handleBiomoleculeGenerate}
        isBiomoleculeLoading={isBiomoleculeLoading}
        onGalvanicCellSimulate={handleGalvanicCellSimulate}
        isGalvanicCellLoading={isGalvanicCellLoading}
        onThermoAnalyze={handleThermoAnalyze}
        isThermoLoading={isThermoLoading}
        onSolutionAnalyze={handleSolutionAnalyze}
        isSolutionLoading={isSolutionLoading}
      />
      
      <main className="flex-grow flex flex-col relative h-full">
        <Header theme={theme} setTheme={setTheme} />
        
        {simulationMode === 'atoms' && (
          <>
            <ReactionCanvas 
              atoms={placedAtoms}
              isPaused={isLoading} // Pausing triggers the convergence animation in useAtomAnimation
              pauseText={null}
              canvasRef={canvasRef}
              onDrop={handleAtomDrop}
              onDragOver={handleDragOver}
            />
             {/* Floating Controls for Atom Mode */}
             <div className="absolute top-20 right-4 flex flex-col gap-2 z-10">
                <button 
                  onClick={() => { setPlacedAtoms([]); setFoundReactions(null); setSelectedReaction(null); setError(null); }}
                  className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-full shadow-lg transition-transform hover:scale-110"
                  title="مسح الكل"
                >
                  🗑️
                </button>
             </div>
             
             {/* Start Reaction Button */}
             {placedAtoms.length >= 2 && !isLoading && !foundReactions && !selectedReaction && (
               <button 
                 onClick={handleAnalyzeAtoms}
                 className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-transform transform hover:scale-105 z-10 flex items-center gap-2"
               >
                 <span>🧪</span>
                 <span>بدء التفاعل</span>
               </button>
             )}
             
             {isLoading && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-sm z-20 pointer-events-none">
                 <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-xl flex items-center gap-3">
                   <div className="animate-spin h-6 w-6 border-4 border-cyan-500 border-t-transparent rounded-full"></div>
                   <span className="font-bold">جاري تحليل التفاعل...</span>
                 </div>
               </div>
             )}
             
             {error && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 bg-red-100 dark:bg-red-900/80 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded-lg shadow-lg z-20">
                    <p>{error}</p>
                </div>
             )}

            {foundReactions && !selectedReaction && (
              <ReactionSelection 
                reactions={foundReactions}
                onSelect={setSelectedReaction}
                onCancel={() => { setFoundReactions(null); setPlacedAtoms([]); }}
              />
            )}

            {selectedReaction && (
              <MoleculeInfoCard 
                reaction={selectedReaction}
                onNewReaction={() => {
                  setSelectedReaction(null);
                  setFoundReactions(null);
                  setPlacedAtoms([]);
                }}
              />
            )}
          </>
        )}

        {simulationMode === 'compounds' && (
             compoundReactionResult ? (
                 <CompoundReactionResult 
                    reaction={compoundReactionResult} 
                    onNewReaction={() => { setCompoundReactionResult(null); setReactant1(''); setReactant2(''); }} 
                 />
             ) : (
                 <CompoundSelector 
                    reactant1={reactant1}
                    reactant2={reactant2}
                    setReactant1={setReactant1}
                    setReactant2={setReactant2}
                    isLoading={isCompoundReactionLoading}
                    error={compoundReactionError}
                 />
             )
        )}

        {simulationMode === 'organic' && (
            comparisonInfo ? (
                <OrganicCompoundComparisonCard 
                    infoA={comparisonInfo.a}
                    infoB={comparisonInfo.b}
                    onNew={() => setComparisonInfo(null)}
                    onNewComparison={handleOrganicComparison}
                />
            ) : organicCompoundInfo ? (
                <OrganicCompoundInfoCard 
                    info={organicCompoundInfo} 
                    onNew={() => setOrganicCompoundInfo(null)} 
                />
            ) : (
                // Placeholder when no data is loaded yet
                <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 bg-grid dark:bg-grid">
                     <div className="text-center p-8 max-w-lg">
                        <div className="text-6xl mb-4">🌿</div>
                        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-2">مختبر الكيمياء العضوية</h2>
                        <p className="text-slate-600 dark:text-slate-400">استخدم القائمة الجانبية لتوليد أو مقارنة المركبات العضوية المختلفة.</p>
                        {isOrganicCompoundLoading && <p className="mt-4 animate-pulse text-cyan-500">جاري التحضير...</p>}
                        {organicCompoundError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded">{organicCompoundError}</p>}
                     </div>
                </div>
            )
        )}

        {simulationMode === 'biochemistry' && (
            biomoleculeInfo ? (
                <BiomoleculeInfoCard 
                    info={biomoleculeInfo} 
                    onNew={() => setBiomoleculeInfo(null)} 
                />
            ) : (
                 <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 bg-grid dark:bg-grid">
                     <div className="text-center p-8 max-w-lg">
                        <div className="text-6xl mb-4">🧬</div>
                        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-2">مختبر الكيمياء الحيوية</h2>
                        <p className="text-slate-600 dark:text-slate-400">اختر جزيئاً حيوياً من القائمة الجانبية لاستكشافه.</p>
                        {isBiomoleculeLoading && <p className="mt-4 animate-pulse text-cyan-500">جاري التحميل...</p>}
                        {biomoleculeError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded">{biomoleculeError}</p>}
                     </div>
                </div>
            )
        )}

        {simulationMode === 'electrochemistry' && (
            galvanicCellInfo ? (
                <GalvanicCellCard 
                    info={galvanicCellInfo}
                    onNew={() => setGalvanicCellInfo(null)}
                />
            ) : (
                <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 bg-grid dark:bg-grid">
                     <div className="text-center p-8 max-w-lg">
                        <div className="text-6xl mb-4">⚡</div>
                        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-2">مختبر الكيمياء الكهربائية</h2>
                        <p className="text-slate-600 dark:text-slate-400">حدد الأقطاب في القائمة الجانبية لبناء خلية جلفانية.</p>
                        {isGalvanicCellLoading && <p className="mt-4 animate-pulse text-cyan-500">جاري بناء الخلية...</p>}
                        {galvanicCellError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded">{galvanicCellError}</p>}
                     </div>
                </div>
            )
        )}

        {simulationMode === 'thermochemistry' && (
            thermoInfo ? (
                <ThermoChemistryCard 
                    info={thermoInfo}
                    onNew={() => setThermoInfo(null)}
                />
            ) : (
                 <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 bg-grid dark:bg-grid">
                     <div className="text-center p-8 max-w-lg">
                        <div className="text-6xl mb-4">🔥</div>
                        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-2">مختبر الكيمياء الحرارية</h2>
                        <p className="text-slate-600 dark:text-slate-400">أدخل معادلة كيميائية في القائمة الجانبية لتحليل طاقتها.</p>
                        {isThermoLoading && <p className="mt-4 animate-pulse text-cyan-500">جاري الحساب...</p>}
                        {thermoError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded">{thermoError}</p>}
                     </div>
                </div>
            )
        )}

        {simulationMode === 'solution' && (
            solutionInfo ? (
                <SolutionChemistryCard 
                    info={solutionInfo}
                    onNew={() => setSolutionInfo(null)}
                />
            ) : (
                 <div className="flex-grow flex items-center justify-center bg-slate-100 dark:bg-slate-800/50 bg-grid dark:bg-grid">
                     <div className="text-center p-8 max-w-lg">
                        <div className="text-6xl mb-4">💧</div>
                        <h2 className="text-2xl font-bold text-cyan-600 dark:text-cyan-300 mb-2">مختبر المحاليل</h2>
                        <p className="text-slate-600 dark:text-slate-400">حدد المذاب والمذيب والتركيز لبدء التحليل.</p>
                        {isSolutionLoading && <p className="mt-4 animate-pulse text-cyan-500">جاري التحليل...</p>}
                         {solutionError && <p className="mt-4 text-red-500 bg-red-100 dark:bg-red-900/20 p-2 rounded">{solutionError}</p>}
                     </div>
                </div>
            )
        )}

      </main>
    </div>
  );
};

export default App;
