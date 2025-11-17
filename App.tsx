

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

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('welcome');
  const [simulationMode, setSimulationMode] = useState<SimulationMode>('atoms');
  const [placedAtoms, setPlacedAtoms] = useState<Atom[]>([]);
  const [foundReactions, setFoundReactions] = useState<Reaction[] | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<Reaction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [compoundReactionResult, setCompoundReactionResult] = useState<CompoundReaction | null>(null);
  const [isCompoundReactionLoading, setIsCompoundReactionLoading] = useState(false);
  const [compoundReactionError, setCompoundReactionError] = useState<string | null>(null);
  const [reactant1, setReactant1] = useState('');
  const [reactant2, setReactant2] = useState('');

  const [organicCompoundInfo, setOrganicCompoundInfo] = useState<OrganicCompoundInfo | null>(null);
  const [isOrganicCompoundLoading, setIsOrganicCompoundLoading] = useState(false);
  const [organicCompoundError, setOrganicCompoundError] = useState<string | null>(null);
  const [comparisonInfo, setComparisonInfo] = useState<{ a: OrganicCompoundInfo; b: OrganicCompoundInfo } | null>(null);

  const [biomoleculeInfo, setBiomoleculeInfo] = useState<BiomoleculeInfo | null>(null);
  const [isBiomoleculeLoading, setIsBiomoleculeLoading] = useState(false);
  const [biomoleculeError, setBiomoleculeError] = useState<string | null>(null);

  const [galvanicCellInfo, setGalvanicCellInfo] = useState<GalvanicCellInfo | null>(null);
  const [isGalvanicCellLoading, setIsGalvanicCellLoading] = useState(false);
  const [galvanicCellError, setGalvanicCellError] = useState<string | null>(null);

  const [thermoChemistryInfo, setThermoChemistryInfo] = useState<ThermoChemistryInfo | null>(null);
  const [isThermoChemistryLoading, setIsThermoChemistryLoading] = useState(false);
  const [thermoChemistryError, setThermoChemistryError] = useState<string | null>(null);
  
  const [solutionChemistryInfo, setSolutionChemistryInfo] = useState<SolutionChemistryInfo | null>(null);
  const [isSolutionChemistryLoading, setIsSolutionChemistryLoading] = useState(false);
  const [solutionChemistryError, setSolutionChemistryError] = useState<string | null>(null);


  const [theme, setTheme] = useState<Theme>('dark');
  
  const atomsRef = useRef(placedAtoms);
  atomsRef.current = placedAtoms;
  const canvasRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const clearCanvas = useCallback(() => {
    // Atom mode
    setPlacedAtoms([]);
    setFoundReactions(null);
    setSelectedReaction(null);
    setError(null);
    setIsLoading(false);
    // Compound mode
    setCompoundReactionResult(null);
    setCompoundReactionError(null);
    setIsCompoundReactionLoading(false);
    setReactant1('');
    setReactant2('');
    // Organic mode
    setOrganicCompoundInfo(null);
    setOrganicCompoundError(null);
    setIsOrganicCompoundLoading(false);
    setComparisonInfo(null);
    // Biochemistry mode
    setBiomoleculeInfo(null);
    setBiomoleculeError(null);
    setIsBiomoleculeLoading(false);
    // Electrochemistry mode
    setGalvanicCellInfo(null);
    setGalvanicCellError(null);
    setIsGalvanicCellLoading(false);
    // Thermochemistry mode
    setThermoChemistryInfo(null);
    setThermoChemistryError(null);
    setIsThermoChemistryLoading(false);
    // Solution Chemistry mode
    setSolutionChemistryInfo(null);
    setSolutionChemistryError(null);
    setIsSolutionChemistryLoading(false);
  }, []);

  useEffect(() => {
    clearCanvas();
  }, [simulationMode, clearCanvas]);

  const addAtom = (atomId: string, x?: number, y?: number) => {
    const atomTemplate = ATOMS.find((a) => a.id === atomId);
    if (!atomTemplate || !canvasRef.current) return;

    const canvasBounds = canvasRef.current.getBoundingClientRect();
    const newAtom: Atom = {
      ...atomTemplate,
      instanceId: Date.now() + Math.random(),
      x: x ? x - canvasBounds.left : Math.random() * (canvasBounds.width - 60) + 30,
      y: y ? y - canvasBounds.top : Math.random() * (canvasBounds.height - 60) + 30,
    };
    setPlacedAtoms((prev) => [...prev, newAtom]);
  };

  const handleAtomClick = (atomId: string) => {
    if (canvasRef.current) {
      const canvasBounds = canvasRef.current.getBoundingClientRect();
      addAtom(atomId, canvasBounds.left + Math.random() * canvasBounds.width, canvasBounds.top + Math.random() * canvasBounds.height);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const atomId = e.dataTransfer.getData('application/react-flow');
    if (atomId) addAtom(atomId, e.clientX, e.clientY);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const checkReaction = useCallback(async () => {
    if (atomsRef.current.length < 1 || foundReactions) return;

    setIsLoading(true);
    setError(null);
    const currentAtoms = atomsRef.current;

    const atomCounts: Record<string, number> = {};
    currentAtoms.forEach(atom => {
      atomCounts[atom.id] = (atomCounts[atom.id] || 0) + 1;
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const atomList = Object.entries(atomCounts).map(([id, count]) => {
        const atomInfo = ATOMS.find(a => a.id === id);
        const valencyInfo = atomInfo?.valency ? ` (Valency: ${atomInfo.valency})` : '';
        return `${count} ${atomInfo?.symbol || id}${valencyInfo}`;
      }).join(', ');

      const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `From the list of atoms/ions (${atomList}), identify ALL plausible chemical compounds that can be formed. Include common, uncommon, and even ionic species if they are stable.
        RULES:
        1. Chemical Neutrality: For molecules, use the provided valency/oxidation states to ensure a net charge of zero.
        2. Output Language: All text values in the JSON response MUST be in ARABIC.
        3. Reactants Array: The 'reactants' field must be a flat array of atom/ion IDs showing the ratio.
        4. No Reaction: If no plausible reactions exist, return an empty JSON array.
        5. List Multiple Products: The top-level response must be a JSON array of all possible products.
        
        For each possible product object in the array, provide:
        - id, name, formula, emoji, reactants, bondType, explanation, molecularDensity, acidBase, applications.
        - commonality: A classification in Arabic (e.g., "شائع جدًا", "شائع", "غير شائع", "نادر").
        - molarMass: Molar mass with units (e.g., "18.015 g/mol").
        - state: Physical state at STP (e.g., "سائل", "صلب", "غاز").
        - molecularGeometry: VSEPR geometry (e.g., "منحني").
        - namingMethod: A step-by-step explanation in Arabic of how the compound is named based on nomenclature rules.
        - safety: An object containing 'warnings' (an array of hazard strings) and 'ghsSymbols' (an array of codes from GHS01-GHS09, or an empty array if none).`,
        config: {
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
            responseSchema: {
              type: Type.ARRAY,
              items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING }, name: { type: Type.STRING }, formula: { type: Type.STRING }, emoji: { type: Type.STRING },
                    reactants: { type: Type.ARRAY, items: { type: Type.STRING } },
                    bondType: { type: Type.STRING }, explanation: { type: Type.STRING }, molecularDensity: { type: Type.STRING, nullable: true },
                    acidBase: { type: Type.STRING, nullable: true }, applications: { type: Type.STRING, nullable: true },
                    commonality: { type: Type.STRING, description: 'Classification of how common the compound is, in Arabic.' },
                    molarMass: { type: Type.STRING, description: 'Molar mass with units (e.g., "18.015 g/mol").' },
                    state: { type: Type.STRING, description: 'Physical state at STP in Arabic.' },
                    molecularGeometry: { type: Type.STRING, description: 'VSEPR molecular geometry in Arabic.' },
                    namingMethod: { type: Type.STRING, description: 'Step-by-step explanation of the chemical nomenclature in Arabic.' },
                    safety: {
                      type: Type.OBJECT,
                      properties: {
                        warnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        ghsSymbols: { type: Type.ARRAY, items: { type: Type.STRING } },
                      },
                      required: ['warnings', 'ghsSymbols'],
                    },
                  },
                  required: ['id', 'name', 'formula', 'emoji', 'reactants', 'bondType', 'explanation', 'molarMass', 'state', 'molecularGeometry', 'safety', 'namingMethod', 'commonality'],
                }
            }
        }
      });
      
      const rawText = response.text.trim();
      if (!rawText) {
          throw new Error("Empty response from API.");
      }
      const result = JSON.parse(rawText);

      if (!Array.isArray(result)) {
        console.error("API returned non-array for reactions:", result);
        throw new Error("Invalid data structure from API.");
      }

      if (result.length > 0) {
        setFoundReactions(result as Reaction[]);
      } else {
        setError('لم يتم العثور على تفاعلات محتملة.');
      }
    } catch (e) {
      console.error(e);
      setError('فشل في تحليل التفاعل. حاول مرة أخرى.');
    } finally {
      setIsLoading(false);
    }
  }, [foundReactions]);

  const handleReactionSelect = (reaction: Reaction) => {
    const currentAtoms = atomsRef.current;
    const atomCounts: Record<string, number> = {};
    currentAtoms.forEach(atom => {
        atomCounts[atom.id] = (atomCounts[atom.id] || 0) + 1;
    });

    const requiredAtomCounts: Record<string, number> = {};
    reaction.reactants.forEach(id => {
        requiredAtomCounts[id] = (requiredAtomCounts[id] || 0) + 1;
    });

    const hasEnoughReactants = Object.entries(requiredAtomCounts).every(
        ([id, requiredCount]) => (atomCounts[id] || 0) >= requiredCount
    );

    if (hasEnoughReactants) {
        setSelectedReaction(reaction);
        const atomsToRemove = { ...requiredAtomCounts };
        const remainingAtoms = currentAtoms.filter(atom => {
            if (atomsToRemove[atom.id] > 0) {
                atomsToRemove[atom.id]--;
                return false;
            }
            return true;
        });
        setPlacedAtoms(remainingAtoms);
    } else {
        setError(`لا توجد ذرات كافية لتكوين ${reaction.formula}.`);
        setFoundReactions(null);
    }
  };


  const handleCompoundReaction = async (reactant1: string, reactant2: string) => {
      if (!reactant1 || !reactant2) {
          setCompoundReactionError('الرجاء إدخال كلا المتفاعلين.');
          return;
      }
      setIsCompoundReactionLoading(true);
      setCompoundReactionError(null);
      setCompoundReactionResult(null); 

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
          const response: GenerateContentResponse = await ai.models.generateContent({
              model: 'gemini-2.5-flash',
              contents: `Simulate the chemical reaction between ${reactant1} and ${reactant2}.
              RULES:
              1. Determine the most likely products.
              2. Provide the fully balanced chemical equation, including states (s, l, g, aq).
              3. Identify the reaction type (e.g., Acid-Base Neutralization, Precipitation, Redox).
              4. Provide a clear, step-by-step explanation of what is happening in the reaction.
              5. Provide any important safety warnings related to the reactants or products.
              6. All text values in the JSON response MUST be in ARABIC.
              7. If no reaction occurs, return a JSON object with id: "none", balancedEquation: "لا يوجد تفاعل", reactionType: "لا يوجد", explanation: "لا يوجد تفاعل كيميائي متوقع بين هذه المواد في الظروف القياسية.", products: [], and safetyNotes: [].
              
              REQUIRED JSON STRUCTURE:
              - id: A unique ID for the reaction, or "none".
              - balancedEquation: The full balanced equation as a string.
              - reactionType: The type of reaction in Arabic.
              - explanation: A detailed explanation in Arabic.
              - products: An array of objects, each with 'name', 'formula', and 'state'.
              - safetyNotes: An array of safety warning strings in Arabic.`,
              config: {
                  responseMimeType: "application/json",
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          id: { type: Type.STRING },
                          balancedEquation: { type: Type.STRING },
                          reactionType: { type: Type.STRING },
                          explanation: { type: Type.STRING },
                          products: {
                              type: Type.ARRAY,
                              items: {
                                  type: Type.OBJECT,
                                  properties: {
                                      name: { type: Type.STRING },
                                      formula: { type: Type.STRING },
                                      state: { type: Type.STRING },
                                  },
                                  required: ['name', 'formula', 'state'],
                              }
                          },
                          safetyNotes: {
                              type: Type.ARRAY,
                              items: { type: Type.STRING }
                          },
                      },
                      required: ['id', 'balancedEquation', 'reactionType', 'explanation', 'products', 'safetyNotes'],
                  }
              }
          });

          const rawText = response.text.trim();
          if (!rawText) {
              throw new Error("Empty response from API.");
          }
          const result = JSON.parse(rawText);

          // Stricter, multi-layer validation to prevent any possibility of a crash
          if (
              !result || typeof result !== 'object' ||
              typeof result.id !== 'string' ||
              typeof result.balancedEquation !== 'string' ||
              typeof result.reactionType !== 'string' ||
              typeof result.explanation !== 'string' ||
              !Array.isArray(result.products) ||
              !Array.isArray(result.safetyNotes)
          ) {
              console.error("Invalid or incomplete data structure:", result);
              throw new Error("Invalid data structure received from API.");
          }
          
          // Validate structure of nested product items
          for (const product of result.products) {
              if (
                  !product || typeof product !== 'object' ||
                  typeof product.name !== 'string' ||
                  typeof product.formula !== 'string' ||
                  typeof product.state !== 'string'
              ) {
                  console.error("Invalid product structure in API response:", product);
                  throw new Error("Invalid product structure received from API.");
              }
          }

          setCompoundReactionResult(result);

      } catch (e: any) {
          console.error("Error during compound reaction:", e);
          setCompoundReactionError('حدث خطأ غير متوقع أثناء معالجة التفاعل. الرجاء المحاولة مرة أخرى.');
      } finally {
          setIsCompoundReactionLoading(false);
      }
  };

  const fetchOrganicCompoundData = async (family: string, carbons: number): Promise<OrganicCompoundInfo> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

    const minCarbons: { [key: string]: number } = {
        'ألكين': 2, 'ألكاين': 2, 'إيثر': 2, 'إستر': 2,
        'ألكان حلقي': 3, 'كيتون': 3,
    };
    if (minCarbons[family] && carbons < minCarbons[family]) {
        throw new Error(`لا يمكن تكوين ${family} بأقل من ${minCarbons[family]} ذرات كربون.`);
    }
     if (family === 'حلقة بنزين' && carbons !== 6) {
        throw new Error(`حلقة البنزين تحتوي على 6 ذرات كربون دائمًا.`);
    }

    const subject = (() => {
      switch (family) {
        case 'حلقة بنزين': return 'the benzene ring molecule (C₆H₆)';
        case 'ألكان حلقي':
          if (carbons === 6) {
            return `the cycloalkane with 6 carbons, which is cyclohexane (C₆H₁₂). Focus on its specific properties, including its chair and boat conformations.`;
          }
          return `the cycloalkane with a carbon count of ${carbons}, mentioning ring strain if significant (e.g., for cyclopropane, cyclobutane).`;
        case 'كحول': return `the primary alcohol with a straight chain of ${carbons} carbons (a simple alkanol)`;
        case 'هاليد الألكيل': return `the primary chloroalkane with a straight chain of ${carbons} carbons`;
        case 'إيثر': return `the simple, symmetrical ether with a total of ${carbons} carbons`;
        case 'أمين': return `the primary amine (amino group on the first carbon) with a straight chain of ${carbons} carbons`;
        case 'ألدهيد': return `the aldehyde with a straight chain of ${carbons} carbons`;
        case 'كيتون': return `the ketone with a straight chain of ${carbons} carbons, with the carbonyl group placed to give the lowest possible number (e.g., on C2 for propanone, butanone, etc.)`;
        case 'حمض كربوكسيلي': return `the carboxylic acid with a straight chain of ${carbons} carbons`;
        case 'إستر': return `the ester with a total of ${carbons} carbons, formed from the simplest possible primary alcohol and carboxylic acid (e.g., for C2, it's methyl methanoate; for C3, it could be ethyl methanoate or methyl ethanoate; prioritize the latter).`;
        case 'أميد': return `the primary amide (derived from ammonia) with a straight chain of ${carbons} carbons`;
        default: return `the hydrocarbon family "${family}" and a carbon count of ${carbons}`;
      }
    })();

    // Step 1: Get textual information
    const infoResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on ${subject}, provide detailed information.
        RULES:
        1. All text values in the JSON response MUST be in ARABIC.
        2. If the requested compound is not possible, the 'id' field should be "impossible".
        3. For the 'family' field, use the provided Arabic family name (e.g., "ألكان حلقي", "كحول").

        REQUIRED JSON STRUCTURE:
        - id, name, formula, family, description, iupacNaming, uses, stateAtSTP
        - boilingPoint: The boiling point at standard pressure, with units (e.g., "-161.5 °C").
        - meltingPoint: The melting point at standard pressure, with units (e.g., "-182.5 °C").`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    formula: { type: Type.STRING },
                    family: { type: Type.STRING },
                    description: { type: Type.STRING },
                    iupacNaming: { type: Type.STRING },
                    uses: { type: Type.STRING },
                    stateAtSTP: { type: Type.STRING },
                    boilingPoint: { type: Type.STRING, description: "Boiling point with units." },
                    meltingPoint: { type: Type.STRING, description: "Melting point with units." },
                },
                required: ['id', 'name', 'formula', 'family', 'description', 'iupacNaming', 'uses', 'stateAtSTP', 'boilingPoint', 'meltingPoint'],
            }
        }
    });

    const rawText = infoResponse.text.trim();
    if (!rawText) {
        throw new Error("Empty response from API for organic compound info.");
    }
    const textResult = JSON.parse(rawText);
    
    if (typeof textResult !== 'object' || textResult === null || typeof textResult.id !== 'string') {
        console.error("Invalid data structure for organic compound:", textResult);
        throw new Error("Invalid data structure received from API.");
    }

    if (textResult.id === 'impossible') {
        throw new Error(`لا يمكن تكوين ${family} بـ ${carbons} ذرة كربون.`);
    }

    // Step 2: Generate Lewis structure image
     const imagePrompt = (family === 'ألكان حلقي' && carbons === 6) 
      ? `Generate a simple, clear, 2D diagram of the chair conformation of cyclohexane (${textResult.formula}). The diagram should be chemically accurate, showing the ring structure clearly. Use a white background and black lines/text for maximum clarity. Do not include any text other than atomic symbols.`
      : `Generate a simple, clear, 2D Lewis structure diagram for the molecule ${textResult.name} (${textResult.formula}). The diagram should be chemically accurate, showing all atoms and covalent bonds as lines (single, double, or triple). Use a white background and black lines/text for maximum clarity. Do not include any text other than the atomic symbols.`;
    
    const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [{
                text: imagePrompt,
            }],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const partWithImageData = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

    if (partWithImageData?.inlineData) {
        const base64ImageBytes: string = partWithImageData.inlineData.data;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        return { ...(textResult as Omit<OrganicCompoundInfo, 'lewisStructureImage'>), lewisStructureImage: imageUrl };
    }
    
    throw new Error("No image data found in response.");
  };


   const handleOrganicCompoundGenerate = async (family: string, carbons: number) => {
    setIsOrganicCompoundLoading(true);
    setOrganicCompoundError(null);
    setOrganicCompoundInfo(null);
    setComparisonInfo(null);

    try {
        const result = await fetchOrganicCompoundData(family, carbons);
        setOrganicCompoundInfo(result);
    } catch (e: any) {
        console.error(e);
        setOrganicCompoundError(e.message || 'فشل في إنشاء معلومات المركب العضوي. حاول مرة أخرى.');
    } finally {
        setIsOrganicCompoundLoading(false);
    }
  };

  const handleOrganicCompoundCompare = async (
    paramsA: { family: string; carbons: number },
    paramsB: { family: string; carbons: number }
  ) => {
    setIsOrganicCompoundLoading(true);
    setOrganicCompoundError(null);
    setOrganicCompoundInfo(null);
    setComparisonInfo(null);

    try {
      const [resultA, resultB] = await Promise.all([
        fetchOrganicCompoundData(paramsA.family, paramsA.carbons),
        fetchOrganicCompoundData(paramsB.family, paramsB.carbons),
      ]);
      setComparisonInfo({ a: resultA, b: resultB });
    } catch (e: any) {
      console.error(e);
      setOrganicCompoundError(e.message || 'فشل في إنشاء مقارنة المركب العضوي. حاول مرة أخرى.');
    } finally {
      setIsOrganicCompoundLoading(false);
    }
  };

  const fetchBiomoleculeData = async (moleculeName: string) => {
    setIsBiomoleculeLoading(true);
    setBiomoleculeError(null);
    setBiomoleculeInfo(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Provide information about the biomolecule "${moleculeName}".
        RULES:
        1. All text values in the JSON response MUST be in ARABIC.
        2. Determine and return the general 'type' of the biomolecule (e.g., "كربوهيدرات", "حمض أميني", "حمض دهني").

        REQUIRED JSON STRUCTURE:
        - id, name, formula, type, description, biologicalFunction`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT, properties: {
              id: { type: Type.STRING }, name: { type: Type.STRING }, formula: { type: Type.STRING },
              type: { type: Type.STRING, description: "The general class of the biomolecule, in Arabic." }, 
              description: { type: Type.STRING }, 
              biologicalFunction: { type: Type.STRING },
            }, required: ['id', 'name', 'formula', 'type', 'description', 'biologicalFunction'],
          }
        }
      });
      const rawText = textResponse.text.trim();
      if (!rawText) {
          throw new Error("Empty response from API for biomolecule info.");
      }
      const textResult = JSON.parse(rawText);

      if (typeof textResult !== 'object' || textResult === null || typeof textResult.id !== 'string') {
          console.error("Invalid data structure for biomolecule:", textResult);
          throw new Error("Invalid data structure received from API.");
      }
      
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Generate a simple, clear, 2D structural diagram for the biomolecule ${textResult.name} (${textResult.formula}). The diagram should ONLY contain the chemical structure with atomic symbols. Do not add any other text, labels, or titles to the image. Use a white background and black lines/text.` }] },
        config: { responseModalities: [Modality.IMAGE] },
      });
      
      const partWithImageData = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (partWithImageData?.inlineData) {
        const imageUrl = `data:image/png;base64,${partWithImageData.inlineData.data}`;
        setBiomoleculeInfo({ ...(textResult as Omit<BiomoleculeInfo, 'structureImage'>), structureImage: imageUrl });
        return;
      }

      throw new Error("No image data found for biomolecule.");
    } catch (e: any) {
      console.error(e);
      setBiomoleculeError(e.message || 'فشل في إنشاء معلومات الجزيء الحيوي.');
    } finally {
      setIsBiomoleculeLoading(false);
    }
  };

  const simulateGalvanicCell = async (metal1: string, metal2: string) => {
    if (metal1 === metal2) {
      setGalvanicCellError("الرجاء اختيار فلزين مختلفين.");
      return;
    }
    setIsGalvanicCellLoading(true);
    setGalvanicCellError(null);
    setGalvanicCellInfo(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Simulate a galvanic (voltaic) cell using ${metal1} and ${metal2} as electrodes.
        RULES:
        1. Determine the anode and cathode based on standard reduction potentials.
        2. Provide the balanced half-reaction for each.
        3. Provide the overall balanced reaction.
        4. Calculate the standard cell potential (E°cell) and return it as a string with units (e.g., "+1.10 V").
        5. Provide a clear explanation of the cell's operation, including electron flow and the function of the salt bridge.
        6. All text values in the JSON response MUST be in ARABIC.
        REQUIRED JSON STRUCTURE:
        - id, anode: { metal, halfReaction }, cathode: { metal, halfReaction }, overallReaction, cellPotential, explanation`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT, properties: {
              id: { type: Type.STRING },
              anode: { type: Type.OBJECT, properties: { metal: { type: Type.STRING }, halfReaction: { type: Type.STRING } }, required: ['metal', 'halfReaction'] },
              cathode: { type: Type.OBJECT, properties: { metal: { type: Type.STRING }, halfReaction: { type: Type.STRING } }, required: ['metal', 'halfReaction'] },
              overallReaction: { type: Type.STRING }, cellPotential: { type: Type.STRING }, explanation: { type: Type.STRING },
            }, required: ['id', 'anode', 'cathode', 'overallReaction', 'cellPotential', 'explanation'],
          }
        }
      });
      const rawText = textResponse.text.trim();
      if (!rawText) {
          throw new Error("Empty response from API for galvanic cell info.");
      }
      const textResult = JSON.parse(rawText);

      if (typeof textResult !== 'object' || textResult === null || typeof textResult.id !== 'string' || !textResult.anode || !textResult.cathode) {
          console.error("Invalid data structure for galvanic cell:", textResult);
          throw new Error("Invalid data structure received from API.");
      }
      
      const imageResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: `Generate a clear, labeled schematic diagram of a galvanic cell with a ${textResult.anode.metal} anode and a ${textResult.cathode.metal} cathode. Show the electrodes in their respective ion solutions, a salt bridge, a voltmeter, and label the direction of electron flow from anode to cathode. The diagram should be simple and educational.` }] },
        config: { responseModalities: [Modality.IMAGE] },
      });
      
      const partWithImageData = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
      if (partWithImageData?.inlineData) {
        const imageUrl = `data:image/png;base64,${partWithImageData.inlineData.data}`;
        setGalvanicCellInfo({ ...(textResult as Omit<GalvanicCellInfo, 'diagramImage'>), diagramImage: imageUrl });
        return;
      }

      throw new Error("No image data found for galvanic cell.");
    } catch (e: any) {
      console.error(e);
      setGalvanicCellError(e.message || 'فشل في محاكاة الخلية الجلفانية.');
    } finally {
      setIsGalvanicCellLoading(false);
    }
  };

  const analyzeThermochemistry = async (equation: string) => {
        setIsThermoChemistryLoading(true);
        setThermoChemistryError(null);
        setThermoChemistryInfo(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            // Step 1: Get textual data
            const textResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Analyze the thermochemistry of the following balanced chemical equation at standard conditions (298K, 1 atm): "${equation}".
                RULES:
                1. Calculate/find the standard enthalpy change (ΔH°), standard entropy change (ΔS°), and standard Gibbs free energy change (ΔG°).
                2. Determine if the reaction is exothermic or endothermic based on ΔH°.
                3. Determine if the reaction is spontaneous or non-spontaneous based on ΔG°.
                4. Provide a clear, concise explanation for the results.
                5. All text values in the JSON response MUST be in ARABIC. Units must be included in the string values.
                
                REQUIRED JSON STRUCTURE:
                - id: A unique ID.
                - equation: The user-provided equation.
                - enthalpyChange: ΔH° as a string with units (e.g., "-571.6 kJ/mol").
                - entropyChange: ΔS° as a string with units (e.g., "-326.6 J/mol·K").
                - gibbsFreeEnergyChange: ΔG° as a string with units (e.g., "-474.2 kJ/mol").
                - isExothermic: A boolean value (true if exothermic).
                - isSpontaneous: A boolean value (true if spontaneous).
                - explanation: The detailed explanation in Arabic.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            id: { type: Type.STRING },
                            equation: { type: Type.STRING },
                            enthalpyChange: { type: Type.STRING },
                            entropyChange: { type: Type.STRING },
                            gibbsFreeEnergyChange: { type: Type.STRING },
                            isExothermic: { type: Type.BOOLEAN },
                            isSpontaneous: { type: Type.BOOLEAN },
                            explanation: { type: Type.STRING },
                        }, required: ['id', 'equation', 'enthalpyChange', 'entropyChange', 'gibbsFreeEnergyChange', 'isExothermic', 'isSpontaneous', 'explanation'],
                    }
                }
            });
            const rawText = textResponse.text.trim();
            if (!rawText) {
                throw new Error("Empty response from API for thermochemistry info.");
            }
            const textResult = JSON.parse(rawText);

            if (typeof textResult !== 'object' || textResult === null || typeof textResult.id !== 'string') {
                console.error("Invalid data structure for thermochemistry:", textResult);
                throw new Error("Invalid data structure received from API.");
            }

            // Step 2: Generate energy profile diagram
            const imagePrompt = `Generate a simple, clear energy profile diagram for the chemical reaction: ${textResult.equation}. 
            The reaction is ${textResult.isExothermic ? 'exothermic' : 'endothermic'} with a ΔH of ${textResult.enthalpyChange}.
            The diagram must:
            - Have a vertical axis labeled "الطاقة" (Energy) and a horizontal axis labeled "مسار التفاعل" (Reaction Progress).
            - Clearly label "المتفاعلات" (Reactants) and "النواتج" (Products) at their respective energy levels.
            - Show and label the activation energy (Ea) as a peak between reactants and products.
            - Show and label the enthalpy change (ΔH) as the difference in energy between products and reactants.
            - Use a clean, educational style with a white background and clear, dark labels.`;

            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const partWithImageData = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (partWithImageData?.inlineData) {
                const imageUrl = `data:image/png;base64,${partWithImageData.inlineData.data}`;
                setThermoChemistryInfo({ ...(textResult as Omit<ThermoChemistryInfo, 'energyProfileImage'>), energyProfileImage: imageUrl });
                return;
            }
            
            throw new Error("No image data found for energy profile diagram.");

        } catch (e: any) {
            console.error(e);
            setThermoChemistryError(e.message || 'فشل في تحليل התفاعل الكيميائي الحراري.');
        } finally {
            setIsThermoChemistryLoading(false);
        }
    };
    
    const analyzeSolution = async (solute: string, solvent: string, concentration: number) => {
        setIsSolutionChemistryLoading(true);
        setSolutionChemistryError(null);
        setSolutionChemistryInfo(null);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
            const textResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `Analyze the process of dissolving ${solute} in ${solvent} to form a ${concentration} M solution.
                RULES:
                1. Identify the solute and solvent names and formulas from the input.
                2. Describe what happens at a molecular level during dissolution (e.g., dissociation, solvation, hydration shells for ionic compounds; intermolecular forces for molecular compounds).
                3. Classify the resulting solution (e.g., strong electrolyte, weak electrolyte, non-electrolyte).
                4. All text values in the JSON response MUST be in ARABIC.

                REQUIRED JSON STRUCTURE:
                - id: A unique ID.
                - soluteName: Arabic name of the solute.
                - soluteFormula: Chemical formula of the solute.
                - solventName: Arabic name of the solvent.
                - concentrationMolarity: The concentration as a string with units (e.g., "${concentration} M").
                - solutionDescription: The detailed molecular-level explanation in Arabic.
                - solutionType: The classification of the solution in Arabic.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT, properties: {
                            id: { type: Type.STRING },
                            soluteName: { type: Type.STRING },
                            soluteFormula: { type: Type.STRING },
                            solventName: { type: Type.STRING },
                            concentrationMolarity: { type: Type.STRING },
                            solutionDescription: { type: Type.STRING },
                            solutionType: { type: Type.STRING },
                        }, required: ['id', 'soluteName', 'soluteFormula', 'solventName', 'concentrationMolarity', 'solutionDescription', 'solutionType'],
                    }
                }
            });
            const rawText = textResponse.text.trim();
            if (!rawText) {
                throw new Error("Empty response from API for solution chemistry info.");
            }
            const textResult = JSON.parse(rawText);

            if (typeof textResult !== 'object' || textResult === null || typeof textResult.id !== 'string') {
                console.error("Invalid data structure for solution chemistry:", textResult);
                throw new Error("Invalid data structure received from API.");
            }

            const imagePrompt = `Generate a clear, microscopic-view diagram showing the dissolution of ${textResult.soluteName} (${textResult.soluteFormula}) in ${textResult.solventName}.
            - If the solute is ionic, show the positive and negative ions dissociated and surrounded by solvent molecules (hydration/solvation shells).
            - If the solute is molecular, show individual solute molecules dispersed among solvent molecules, interacting via intermolecular forces.
            - The diagram should be educational, clearly labeled in Arabic ("أيون موجب", "أيون سالب", "جزيء المذيب", "جزيء المذاب"), and visually appealing.`;

            const imageResponse = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const partWithImageData = imageResponse?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
            if (partWithImageData?.inlineData) {
                const imageUrl = `data:image/png;base64,${partWithImageData.inlineData.data}`;
                setSolutionChemistryInfo({ ...(textResult as Omit<SolutionChemistryInfo, 'solutionImage'>), solutionImage: imageUrl });
                return;
            }

            throw new Error("No image data found for solution diagram.");

        } catch (e: any) {
            console.error(e);
            setSolutionChemistryError(e.message || 'فشل في تحليل المحلول.');
        } finally {
            setIsSolutionChemistryLoading(false);
        }
    };


  if (appState === 'welcome') {
    return <WelcomeScreen onStart={() => setAppState('simulation')} />;
  }

  const isAtomInteractionPaused = !!foundReactions || !!selectedReaction || isLoading;
  
  const renderMainContent = () => {
    switch (simulationMode) {
        case 'atoms':
            return (
                <>
                    <ReactionCanvas 
                        atoms={placedAtoms}
                        isPaused={isAtomInteractionPaused}
                        pauseText={isLoading ? "...يتم التحليل" : (foundReactions ? "تم العثور على تفاعلات!" : null) }
                        canvasRef={canvasRef}
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    />
                    <div className="absolute bottom-4 left-4 z-10 flex gap-2">
                        <button 
                            onClick={clearCanvas}
                            className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                            disabled={placedAtoms.length === 0 && !foundReactions && !selectedReaction}
                        >
                            تفاعل جديد
                        </button>
                         <button 
                            onClick={checkReaction}
                            className="bg-green-500 hover:bg-green-600 dark:bg-green-600 dark:hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition-colors disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed"
                            disabled={placedAtoms.length < 1 || isLoading || !!foundReactions || !!selectedReaction}
                        >
                            تأكيد التفاعل
                        </button>
                        {isLoading && <div className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white font-bold py-2 px-4 rounded-lg shadow-lg animate-pulse">...يتم التحليل</div>}
                        {error && <div className="bg-yellow-400 text-black font-bold py-2 px-4 rounded-lg shadow-lg">{error}</div>}
                    </div>
                    {foundReactions && !selectedReaction && (
                        <ReactionSelection
                          reactions={foundReactions}
                          onSelect={handleReactionSelect}
                          onCancel={clearCanvas}
                        />
                    )}
                    {selectedReaction && (
                        <MoleculeInfoCard 
                            reaction={selectedReaction} 
                            onNewReaction={clearCanvas}
                        />
                    )}
                </>
            );
        case 'compounds':
             return (
                <div className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid p-4 flex items-center justify-center">
                    {compoundReactionResult ? (
                         <CompoundReactionResult reaction={compoundReactionResult} onNewReaction={clearCanvas} />
                    ) : (
                        <CompoundSelector 
                            reactant1={reactant1}
                            reactant2={reactant2}
                            setReactant1={setReactant1}
                            setReactant2={setReactant2}
                            isLoading={isCompoundReactionLoading}
                            error={compoundReactionError}
                        />
                    )}
                </div>
            );
        case 'organic':
            return (
                 <div className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid p-4 flex items-center justify-center">
                    {isOrganicCompoundLoading && <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg"><p className="text-2xl font-bold animate-pulse text-white">...جاري إنشاء المركب العضوي</p></div>}
                    {organicCompoundError && <div className="bg-yellow-400 text-black font-bold py-3 px-5 rounded-lg shadow-lg">{organicCompoundError}</div>}
                    {comparisonInfo && <OrganicCompoundComparisonCard infoA={comparisonInfo.a} infoB={comparisonInfo.b} onNew={clearCanvas} onNewComparison={handleOrganicCompoundCompare} />}
                    {organicCompoundInfo && !comparisonInfo && <OrganicCompoundInfoCard info={organicCompoundInfo} onNew={clearCanvas} />}
                    {!isOrganicCompoundLoading && !organicCompoundInfo && !comparisonInfo && !organicCompoundError &&
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <h2 className="text-2xl font-bold mb-2">مستكشف الكيمياء العضوية</h2>
                            <p>استخدم الشريط الجانبي لاختيار وإنشاء مركب عضوي.</p>
                        </div>
                    }
                </div>
            );
        case 'biochemistry':
            return (
                 <div className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid p-4 flex items-center justify-center">
                    {isBiomoleculeLoading && <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg"><p className="text-2xl font-bold animate-pulse text-white">...جاري إنشاء الجزيء الحيوي</p></div>}
                    {biomoleculeError && <div className="bg-yellow-400 text-black font-bold py-3 px-5 rounded-lg shadow-lg">{biomoleculeError}</div>}
                    {biomoleculeInfo && <BiomoleculeInfoCard info={biomoleculeInfo} onNew={clearCanvas} />}
                    {!isBiomoleculeLoading && !biomoleculeInfo && !biomoleculeError &&
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <h2 className="text-2xl font-bold mb-2">مستكشف الكيمياء الحيوية</h2>
                            <p>استخدم الشريط الجانبي للبحث عن جزيء حيوي أو اختر واحدًا من القوائم لاستكشافه.</p>
                        </div>
                    }
                </div>
            );
        case 'electrochemistry':
            return (
                 <div className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid p-4 flex items-center justify-center">
                    {isGalvanicCellLoading && <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg"><p className="text-2xl font-bold animate-pulse text-white">...جاري محاكاة الخلية</p></div>}
                    {galvanicCellError && <div className="bg-yellow-400 text-black font-bold py-3 px-5 rounded-lg shadow-lg">{galvanicCellError}</div>}
                    {galvanicCellInfo && <GalvanicCellCard info={galvanicCellInfo} onNew={clearCanvas} />}
                    {!isGalvanicCellLoading && !galvanicCellInfo && !galvanicCellError &&
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <h2 className="text-2xl font-bold mb-2">محاكي الكيمياء الكهربائية</h2>
                            <p>استخدم الشريط الجانبي لبناء خلية جلفانية.</p>
                        </div>
                    }
                </div>
            );
        case 'thermochemistry':
            return (
                 <div className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid p-4 flex items-center justify-center">
                    {isThermoChemistryLoading && <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg"><p className="text-2xl font-bold animate-pulse text-white">...جاري تحليل الطاقة</p></div>}
                    {thermoChemistryError && <div className="bg-yellow-400 text-black font-bold py-3 px-5 rounded-lg shadow-lg">{thermoChemistryError}</div>}
                    {thermoChemistryInfo && <ThermoChemistryCard info={thermoChemistryInfo} onNew={clearCanvas} />}
                    {!isThermoChemistryLoading && !thermoChemistryInfo && !thermoChemistryError &&
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <h2 className="text-2xl font-bold mb-2">محاكي الكيمياء الحرارية</h2>
                            <p>استخدم الشريط الجانبي لتحليل طاقة تفاعل كيميائي.</p>
                        </div>
                    }
                </div>
            );
         case 'solution':
            return (
                 <div className="flex-grow bg-slate-100 dark:bg-slate-800/50 relative overflow-hidden bg-grid dark:dark:bg-grid p-4 flex items-center justify-center">
                    {isSolutionChemistryLoading && <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg"><p className="text-2xl font-bold animate-pulse text-white">...جاري تحليل المحلول</p></div>}
                    {solutionChemistryError && <div className="bg-yellow-400 text-black font-bold py-3 px-5 rounded-lg shadow-lg">{solutionChemistryError}</div>}
                    {solutionChemistryInfo && <SolutionChemistryCard info={solutionChemistryInfo} onNew={clearCanvas} />}
                    {!isSolutionChemistryLoading && !solutionChemistryInfo && !solutionChemistryError &&
                        <div className="text-center text-slate-500 dark:text-slate-400">
                            <h2 className="text-2xl font-bold mb-2">مستكشف كيمياء المحاليل</h2>
                            <p>استخدم الشريط الجانبي لتحليل عملية الذوبان.</p>
                        </div>
                    }
                </div>
            );
        default:
            return null;
    }
  }


  return (
    <div className="flex flex-col h-screen font-sans">
      <Header theme={theme} setTheme={setTheme} />
      <main className="flex flex-grow overflow-hidden">
        <div className="flex-grow flex flex-col relative">
           {renderMainContent()}
        </div>
        <Sidebar 
            atoms={ATOMS} 
            onAtomClick={handleAtomClick}
            onModeChange={setSimulationMode}
            currentMode={simulationMode}
            onCompoundReact={handleCompoundReaction}
            isCompoundLoading={isCompoundReactionLoading}
            reactant1={reactant1}
            setReactant1={setReactant1}
            reactant2={reactant2}
            setReactant2={setReactant2}
            onOrganicCompoundGenerate={handleOrganicCompoundGenerate}
            onOrganicCompoundCompare={handleOrganicCompoundCompare}
            isOrganicCompoundLoading={isOrganicCompoundLoading}
            onBiomoleculeGenerate={fetchBiomoleculeData}
            isBiomoleculeLoading={isBiomoleculeLoading}
            onGalvanicCellSimulate={simulateGalvanicCell}
            isGalvanicCellLoading={isGalvanicCellLoading}
            onThermoAnalyze={analyzeThermochemistry}
            isThermoLoading={isThermoChemistryLoading}
            onSolutionAnalyze={analyzeSolution}
            isSolutionLoading={isSolutionChemistryLoading}
        />
      </main>
    </div>
  );
};

export default App;