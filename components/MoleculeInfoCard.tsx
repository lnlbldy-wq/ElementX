
import React, { useState } from 'react';
import type { Reaction } from '../types';
import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";

interface MoleculeInfoCardProps {
  reaction: Reaction;
  onNewReaction: () => void;
}

interface ElectronConfigInfo {
    atomSymbol: string;
    atomName: string;
    configuration: string;
    bondingExplanation: string;
}

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
        message.includes('xhr error') // Handle generic network errors
    );
};

// FIX: Changed async arrow function to a function declaration to avoid TypeScript parsing issues in .tsx files.
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
    // This part should not be reachable if the loop logic is correct, but as a fallback:
    throw new Error(`API call failed after ${MAX_RETRIES} attempts.`);
};


const InfoRow: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="flex justify-between items-start py-3 border-b border-slate-300 dark:border-slate-700 last:border-b-0">
            <dt className="text-md text-cyan-600 dark:text-cyan-400 font-semibold">{label}</dt>
            <dd className="text-md text-slate-700 dark:text-slate-200 text-left">{value}</dd>
        </div>
    );
};

const GHSPictogram: React.FC<{ symbol: string }> = ({ symbol }) => {
    // FIX: Corrected GHS symbols to use standard emojis for better visual representation.
    const symbolMap: Record<string, { emoji: string, title: string }> = {
        'GHS01': { emoji: '💣', title: 'Explosive' },
        'GHS02': { emoji: '🔥', title: 'Flammable' },
        'GHS03': { emoji: '💥', title: 'Oxidizing' },
        'GHS04': { emoji: '💨', title: 'Compressed Gas' },
        'GHS05': { emoji: '🧪', title: 'Corrosive' },
        'GHS06': { emoji: '💀', title: 'Toxic' },
        'GHS07': { emoji: '!', title: 'Harmful' },
        'GHS08': { emoji: '⚕️', title: 'Health Hazard' },
        'GHS09': { emoji: '🌳', title: 'Environmental Hazard' },
    };
    const item = symbolMap[symbol];
    if (!item) return null;
    return (
        <div title={item.title} className="text-4xl p-2 bg-white border-2 border-red-600 rounded-md">
            {item.emoji}
        </div>
    );
};


export const MoleculeInfoCard: React.FC<MoleculeInfoCardProps> = ({ reaction, onNewReaction }) => {
  const [balancedEquation, setBalancedEquation] = useState<string | null>(null);
  const [balancingSteps, setBalancingSteps] = useState<string[] | null>(null);
  const [isBalancing, setIsBalancing] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);
  
  const [showDetails, setShowDetails] = useState(false);
  const [electronConfigs, setElectronConfigs] = useState<ElectronConfigInfo[] | null>(null);
  const [isFetchingConfig, setIsFetchingConfig] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  const [lewisImage, setLewisImage] = useState<string | null>(null);
  const [isFetchingImage, setIsFetchingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);


  const handleBalanceEquation = async () => {
    setIsBalancing(true);
    setBalanceError(null);
    try {
      // FIX: Removed non-null assertion from API_KEY access.
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const reactantsList = reaction.reactants || [];
      const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Given the reactants that form the product ${reaction.formula}, provide a balanced chemical equation and a step-by-step guide on how to balance it. The reactants involved are typically composed of: ${reactantsList.join(', ') || 'constituent atoms'}. Assume standard states for reactants (e.g., Oxygen is O₂, Hydrogen is H₂). The response must be entirely in ARABIC.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              balancedEquation: { 
                type: Type.STRING, 
                description: "The final balanced chemical equation as a string, e.g., '2H₂ + O₂ → 2H₂O'." 
              },
              steps: { 
                type: Type.ARRAY, 
                items: { type: Type.STRING },
                description: "An array of strings, where each string is a step in the balancing process." 
              }
            },
            required: ["balancedEquation", "steps"]
          }
        }
      }));
      
      const rawText = response.text.trim();
      if (!rawText) {
          throw new Error("Empty response from API for equation balancing.");
      }
      const result = JSON.parse(rawText);

      if (typeof result !== 'object' || result === null || typeof result.balancedEquation !== 'string' || !Array.isArray(result.steps)) {
          console.error("Invalid data structure for equation balancing:", result);
          setBalanceError('فشل في الحصول على شرح للموازنة.');
          return;
      }

      setBalancedEquation(result.balancedEquation);
      setBalancingSteps(result.steps);

    } catch (e) {
      console.error("Error balancing equation:", e);
      setBalanceError('حدث خطأ أثناء موازنة المعادلة.');
    } finally {
      setIsBalancing(false);
    }
  };

   const fetchElectronConfig = async () => {
        setIsFetchingConfig(true);
        setConfigError(null);
        try {
            // FIX: Removed non-null assertion from API_KEY access.
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: `For the molecule ${reaction.name} (${reaction.formula}), provide the ground-state electron configuration for each unique type of atom in the molecule. Also, briefly explain how the valence electrons of each atom type participate in bonding to form this molecule. The entire response must be in ARABIC.`,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            configurations: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        atomSymbol: { type: Type.STRING, description: "The chemical symbol of the atom (e.g., 'C', 'O')." },
                                        atomName: { type: Type.STRING, description: "The Arabic name of the atom (e.g., 'كربون')." },
                                        configuration: { type: Type.STRING, description: "The full electron configuration (e.g., '1s² 2s² 2p²')." },
                                        bondingExplanation: { type: Type.STRING, description: "A brief explanation in Arabic about its valence electrons and bonding." }
                                    },
                                    required: ["atomSymbol", "atomName", "configuration", "bondingExplanation"]
                                }
                            }
                        },
                        required: ["configurations"]
                    }
                }
            }));

            const rawText = response.text.trim();
            if (!rawText) {
                throw new Error("Empty response from API for electron config.");
            }
            const result = JSON.parse(rawText);

            if (typeof result !== 'object' || result === null || !Array.isArray(result.configurations)) {
                console.error("Invalid data structure for electron config:", result);
                setConfigError('فشل في الحصول على التوزيع الإلكتروني.');
                return;
            }

            setElectronConfigs(result.configurations);

        } catch (e) {
            console.error("Error fetching electron configuration:", e);
            setConfigError('حدث خطأ أثناء جلب التوزيع الإلكتروني.');
        } finally {
            setIsFetchingConfig(false);
        }
    };

    const fetchLewisImage = async () => {
      setIsFetchingImage(true);
      setImageError(null);
      try {
          // FIX: Removed non-null assertion from API_KEY access.
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          // Improved prompt for clarity and English labels
          const response: GenerateContentResponse = await callApiWithRetry(() => ai.models.generateContent({
              model: 'gemini-2.5-flash-image',
              contents: {
                  parts: [
                      {
                          text: `Create a pristine, high-resolution, academic-textbook quality 2D Lewis structure diagram for the molecule ${reaction.formula}. 
                          - The background must be pure white.
                          - Lines for bonds must be sharp and black.
                          - Valence electrons (dots) must be clearly visible and distinct.
                          - Use standard English chemical symbols (e.g., H, C, O, N, Cl) for the atoms.
                          - Do NOT use any Arabic text, labels, or non-standard annotations.
                          - The diagram should be chemically precise and easy to read.`,
                      },
                  ],
              },
              config: {
                  responseModalities: [Modality.IMAGE],
              },
          }));

          const partWithImageData = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

          if (partWithImageData?.inlineData) {
              const base64ImageBytes: string = partWithImageData.inlineData.data;
              const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
              setLewisImage(imageUrl);
          } else {
             throw new Error("No image data found in response.");
          }
      } catch (e) {
          console.error("Error generating Lewis structure image:", e);
          setImageError('فشل في إنشاء صورة تركيب لويس.');
      } finally {
          setIsFetchingImage(false);
      }
    };

    const handleShowDetails = async () => {
        setShowDetails(true);
        if (!lewisImage && !isFetchingImage) {
            await fetchLewisImage();
        }
        if (!electronConfigs && !isFetchingConfig) {
            await fetchElectronConfig();
        }
    };


  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30 animate-fade-in">
      <div className="bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl shadow-2xl p-6 w-full max-w-2xl m-4 text-slate-800 dark:text-white relative flex flex-col items-center text-center animate-slide-up max-h-[90vh] overflow-y-auto scrollbar-hide">
        
        <div className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 hidden md:block">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
        </div>
        
        <div className="text-6xl mb-4">{reaction.emoji}</div>
        <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-300 mb-2">{reaction.name}</h2>
        <p className="text-xl font-mono text-slate-600 dark:text-slate-300 mb-6">{reaction.formula}</p>

        <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
            <dl>
                <InfoRow label="نوع الرابطة" value={reaction.bondType} />
                <InfoRow label="الكتلة المولية" value={reaction.molarMass} />
                <InfoRow label="الحالة (STP)" value={reaction.state} />
                <InfoRow label="الهندسة الجزيئية" value={reaction.molecularGeometry} />
                <InfoRow label="حمض/قاعدة" value={reaction.acidBase} />
                <InfoRow label="الكثافة" value={reaction.molecularDensity} />
            </dl>
        </div>
        
        {reaction.safety && (reaction.safety.warnings.length > 0 || reaction.safety.ghsSymbols.length > 0) && (
            <div className="w-full text-right bg-red-100 dark:bg-red-900/50 border border-red-300 dark:border-red-700 p-4 rounded-lg mb-4">
                <h3 className="text-lg text-red-700 dark:text-red-400 font-semibold mb-3">معلومات السلامة</h3>
                <p className="text-md text-red-800 dark:text-red-200 leading-relaxed text-right mb-4">
                    {reaction.safety.warnings.join('، ')}
                </p>
                <div className="flex gap-4 justify-end flex-wrap">
                    {reaction.safety.ghsSymbols.map(symbol => <GHSPictogram key={symbol} symbol={symbol} />)}
                </div>
            </div>
        )}

        {reaction.namingMethod && (
          <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
              <h3 className="text-lg text-cyan-600 dark:text-cyan-400 font-semibold mb-2">طريقة التسمية</h3>
              <p className="text-md text-slate-700 dark:text-slate-300 leading-relaxed text-right whitespace-pre-wrap">{reaction.namingMethod}</p>
          </div>
        )}
        
        {showDetails && (
          <div className="w-full text-right bg-indigo-50 dark:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-700 p-4 rounded-lg mb-4 animate-fade-in">
            <h3 className="text-lg text-indigo-700 dark:text-indigo-400 font-semibold mb-2">تركيب لويس</h3>
             <div className="bg-white dark:bg-slate-900 p-4 rounded-md shadow-inner text-slate-800 dark:text-slate-200 flex justify-center items-center min-h-[150px]">
                {isFetchingImage && <p className="animate-pulse text-slate-500 dark:text-slate-400">...جاري إنشاء الصورة</p>}
                {imageError && <p className="text-red-500">{imageError}</p>}
                {lewisImage && <img src={lewisImage} alt={`Lewis structure for ${reaction.name}`} className="max-w-full h-auto bg-white" />}
            </div>
            
            <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-600">
                <h4 className="text-md text-indigo-700 dark:text-indigo-400 font-semibold mb-2">التوزيع الإلكتروني</h4>
                {isFetchingConfig && <p className="text-slate-500 dark:text-slate-400 animate-pulse text-center">...جاري التحميل</p>}
                {configError && <p className="text-red-500 text-sm text-center">{configError}</p>}
                {electronConfigs && (
                    <div className="space-y-4 text-right">
                        {electronConfigs.map((config, index) => (
                            <div key={index} className="p-2 bg-white/50 dark:bg-slate-800/50 rounded-md border border-slate-200 dark:border-slate-700">
                                <p className="font-bold text-slate-800 dark:text-slate-200">{config.atomName} ({config.atomSymbol})</p>
                                <p dir="ltr" className="font-mono text-left text-base text-slate-600 dark:text-slate-300 my-1">{config.configuration}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">{config.bondingExplanation}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        )}

        {balancedEquation && balancingSteps && (
          <div className="w-full text-right bg-emerald-50 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 p-4 rounded-lg mb-4 animate-fade-in">
            <h3 className="text-lg text-emerald-700 dark:text-emerald-400 font-semibold mb-3">المعادلة الموزونة</h3>
            <p dir="ltr" className="text-xl font-mono text-center py-2 text-emerald-800 dark:text-emerald-200">{balancedEquation}</p>
            <h4 className="text-md text-emerald-700 dark:text-emerald-400 font-semibold mt-4 mb-2">خطوات الوزن</h4>
            <ol className="list-decimal list-inside text-md text-emerald-800 dark:text-emerald-300 leading-relaxed space-y-2">
              {balancingSteps.map((step, index) => <li key={index}>{step}</li>)}
            </ol>
          </div>
        )}

        {reaction.applications && (
           <div className="w-full text-right bg-white/50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-300 dark:border-slate-700 mb-4">
              <h3 className="text-lg text-cyan-600 dark:text-cyan-400 font-semibold mb-2">الاستعمالات والاستخدامات</h3>
              <p className="text-md text-slate-700 dark:text-slate-300 leading-relaxed text-right">{reaction.applications}</p>
          </div>
        )}
        
        <div className="w-full mt-4 flex flex-col gap-3">
            <div className="flex flex-col md:flex-row gap-3">
              {!showDetails && (
                  <button
                      onClick={handleShowDetails}
                      className="flex-1 bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors w-full text-lg"
                  >
                     عرض تركيب لويس والتحليل الإلكتروني
                  </button>
              )}
              {!balancedEquation && (
                  <button
                      onClick={handleBalanceEquation}
                      disabled={isBalancing}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors w-full text-lg disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-wait"
                  >
                      {isBalancing ? '...يتم الوزن' : 'وزن المعادلة'}
                  </button>
              )}
            </div>
            {balanceError && <p className="text-red-500 text-sm mt-2">{balanceError}</p>}
            <button 
                onClick={onNewReaction}
                className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transition-colors w-full text-lg mt-2"
            >
                تفاعل جديد
            </button>
        </div>

      </div>
    </div>
  );
};
