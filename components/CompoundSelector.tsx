import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";
import { COMMON_COMPOUNDS } from '../constants';

// Internal type to manage image loading states
type CompoundImageState = string | null | 'loading' | 'error';
interface CompoundWithImageState {
    name: string;
    formula: string;
    imageUrl: CompoundImageState;
}

interface CompoundSelectorProps {
    reactant1: string;
    reactant2: string;
    setReactant1: (value: string) => void;
    setReactant2: (value: string) => void;
    isLoading: boolean;
    error: string | null;
}

// Helper to safely check for retryable API errors
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


const fetchCompoundImage = async (name: string, formula: string): Promise<string> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const imagePrompt = `3D ball-and-stick model of the molecule with formula ${formula}. Clean transparent background, soft studio lighting. No text, no labels, no names.`;
    
    const MAX_RETRIES = 3;
    let attempt = 0;
    while (attempt < MAX_RETRIES) {
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: { parts: [{ text: imagePrompt }] },
                config: { responseModalities: [Modality.IMAGE] },
            });
            
            const partWithImageData = response?.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (partWithImageData?.inlineData) {
                return `data:image/png;base64,${partWithImageData.inlineData.data}`;
            }
            
            throw new Error(`No image generated for ${name}`);
        } catch (error: any) {
            attempt++;
            if (isRetryableError(error) && attempt < MAX_RETRIES) {
                const delay = Math.pow(2, attempt) * 10000 + Math.random() * 1000; // Exponential backoff with jitter
                console.warn(`API call failed for ${formula}. Retrying in ${Math.round(delay)}ms... (Attempt ${attempt})`, error);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error(`API call failed for ${formula} after retries or with non-retryable error.`, error);
                throw error;
            }
        }
    }
    throw new Error(`Failed to fetch image for ${name} after ${MAX_RETRIES} attempts.`);
};


interface CompoundCardProps {
    compound: CompoundWithImageState;
    onSelect: () => void;
    isSelected: boolean;
    selectionLabel: string | null;
    onVisible: () => void;
}

const CompoundCard: React.FC<CompoundCardProps> = ({ compound, onSelect, isSelected, selectionLabel, onVisible }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const isLoading = compound.imageUrl === 'loading' || compound.imageUrl === null;
    const hasError = compound.imageUrl === 'error';

    useEffect(() => {
        const currentRef = cardRef.current;
        if (!currentRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    onVisible();
                    observer.unobserve(currentRef);
                }
            },
            { rootMargin: '100px', threshold: 0.1 }
        );

        observer.observe(currentRef);

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [onVisible]);


    return (
        <div
            ref={cardRef}
            className={`relative group bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-xl p-4 text-center transition-all duration-300 transform hover:-translate-y-1 border-2 ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/50' : 'border-slate-200 dark:border-slate-700'}`}
        >
            <div className="h-28 w-28 object-contain mx-auto mb-3 flex items-center justify-center">
                {isLoading ? (
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500"></div>
                ) : hasError ? (
                     <div className="flex flex-col items-center justify-center text-red-500">
                         <span className="text-4xl">⚠️</span>
                         <span className="text-xs font-semibold mt-1">فشل التحميل</span>
                    </div>
                ) : (
                    <img src={compound.imageUrl!} alt={compound.name} className="h-full w-full object-contain" />
                )}
            </div>
            
            <div onClick={onSelect} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }} className="cursor-pointer p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-500" role="button" tabIndex={0}>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 pointer-events-none">{compound.name}</h3>
                <p className="font-mono text-sm text-slate-500 dark:text-slate-400 pointer-events-none">{compound.formula}</p>
            </div>

            {isSelected && selectionLabel && (
                <div className="absolute -top-2 -right-2 bg-cyan-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                    {selectionLabel}
                </div>
            )}
        </div>
    );
};

export const CompoundSelector: React.FC<CompoundSelectorProps> = ({ reactant1, reactant2, setReactant1, setReactant2, isLoading: isReactionLoading, error }) => {
    const [compounds, setCompounds] = useState<CompoundWithImageState[]>(
        COMMON_COMPOUNDS.map(c => ({ ...c, imageUrl: null }))
    );
    const imageQueue = useRef<string[]>([]);
    const isWorkerRunning = useRef(false);
    const loadingImagesRef = useRef(new Set<string>());

    const processQueue = useCallback(async () => {
        if (imageQueue.current.length === 0) {
            isWorkerRunning.current = false;
            return;
        }

        isWorkerRunning.current = true;
        const formula = imageQueue.current.shift();

        if (formula && !loadingImagesRef.current.has(formula)) {
            const compoundInfo = COMMON_COMPOUNDS.find(c => c.formula === formula);
            if (compoundInfo) {
                try {
                    loadingImagesRef.current.add(formula);
                    setCompounds(prev => prev.map(p => p.formula === formula ? { ...p, imageUrl: 'loading' } : p));
                    const imageUrl = await fetchCompoundImage(compoundInfo.name, compoundInfo.formula);
                    setCompounds(prev => prev.map(p => p.formula === formula ? { ...p, imageUrl } : p));
                } catch (err) {
                    console.error(`Failed to load image for ${formula}:`, err);
                    setCompounds(prev => prev.map(p => p.formula === formula ? { ...p, imageUrl: 'error' } : p));
                } finally {
                    loadingImagesRef.current.delete(formula);
                }
            }
        }
        
        // Wait 3 seconds before processing the next item to avoid rate limiting
        setTimeout(processQueue, 3000); 
    }, []);

    const scheduleImageLoad = useCallback((formula: string) => {
        const compoundState = compounds.find(c => c.formula === formula);
        // Only queue if it's not already loaded, errored, loading, or in the queue
        if (compoundState?.imageUrl === null && !imageQueue.current.includes(formula)) {
            imageQueue.current.push(formula);
        }

        if (!isWorkerRunning.current) {
            processQueue();
        }
    }, [compounds, processQueue]);
    
    const handleSelect = (formula: string) => {
        const isR1 = reactant1 === formula;
        const isR2 = reactant2 === formula;

        if (isR1) {
            setReactant1(reactant2);
            setReactant2('');
        } else if (isR2) {
            setReactant2('');
        } else if (!reactant1) {
            setReactant1(formula);
        } else if (!reactant2) {
            setReactant2(formula);
        } else {
            // If both are selected, replace the second one
            setReactant2(formula);
        }
    };
    
    const selectionMap = useMemo(() => {
        const map = new Map<string, string>();
        if(reactant1) map.set(reactant1, "المتفاعل 1");
        if(reactant2) map.set(reactant2, "المتفاعل 2");
        return map;
    }, [reactant1, reactant2]);


    if (isReactionLoading) {
         return <div className="text-center bg-black/60 backdrop-blur-sm p-6 rounded-xl shadow-lg"><p className="text-2xl font-bold animate-pulse text-white">...يتم تحليل التفاعل</p></div>;
    }

    if (error) {
        return <div className="bg-yellow-400 text-black font-bold py-3 px-5 rounded-lg shadow-lg">{error}</div>;
    }

    return (
        <div className="w-full h-full p-4 flex flex-col">
            <div className="text-center mb-4 flex-shrink-0">
                <h2 className="text-3xl font-bold text-cyan-600 dark:text-cyan-400 mb-2">مكتبة المركبات</h2>
                <p className="text-slate-600 dark:text-slate-300">اختر مركبين للتفاعل. يتم تحميل نماذج المركبات عند ظهورها.</p>
            </div>
            <div className="flex-grow overflow-y-auto scrollbar-hide pr-2">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {compounds.map(compound => (
                        <CompoundCard 
                            key={compound.formula} 
                            compound={compound}
                            onSelect={() => handleSelect(compound.formula)}
                            isSelected={selectionMap.has(compound.formula)}
                            selectionLabel={selectionMap.get(compound.formula) || null}
                            onVisible={() => {
                                scheduleImageLoad(compound.formula);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};