import React from 'react';

interface WelcomeScreenProps {
  onStart: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onStart }) => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white dark:bg-slate-900 text-center p-8 animate-fade-in">
      <div className="text-8xl mb-6">🔬</div>
      <h1 className="text-5xl font-bold text-cyan-600 dark:text-cyan-300 mb-4">
      
      ElementX 
      </h1>
      <p className="text-lg max-w-2xl text-slate-600 dark:text-slate-300 mb-8">
        أطلق العنان للكيميائي بداخلك! استكشف عالم الذرات، شاهد تفاعلات المركبات، اغوص في عوالم الكيمياء العضوية والحيوية والكهربائية، اكشف عن طاقة التفاعلات الحرارية، وحلل كيمياء المحاليل. أداة تفاعلية شاملة بين يديك.
      </p>
      <button
        onClick={onStart}
        className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-8 rounded-lg shadow-lg transition-transform transform hover:scale-105 text-xl"
      >
        ابدأ الاستكشاف
      </button>
       <div className="absolute bottom-4 text-sm text-slate-500 dark:text-slate-400">
        بناء بواسطة لانا البلادي
      </div>
    </div>
  );
};