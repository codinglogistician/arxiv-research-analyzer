'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'pl' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<Language, Record<string, string>> = {
  pl: {
    // Header
    'app.title': 'arXiv Research Analyzer',
    'app.subtitle': 'Automatyczne pobieranie i analiza artykułów naukowych z wykorzystaniem AI',
    
    // Navigation
    'nav.newResearch': 'Nowe Badanie',
    'nav.results': 'Wyniki',
    'nav.history': 'Historia',
    
    // Search Tab
    'search.title': 'Parametry Badania',
    'search.description': 'Zdefiniuj temat i kąt analizy artykułów z arXiv',
    'search.topicLabel': 'Temat badania',
    'search.topicPlaceholder': 'np. machine learning, quantum computing, neural networks',
    'search.topicHint': 'Wprowadź temat lub słowa kluczowe do wyszukania na arXiv',
    'search.focusLabel': 'Kąt analizy',
    'search.focusPlaceholder': 'np. Zanalizuj pod kątem zastosowań w medycynie, skup się na metodach uczenia nadzorowanego...',
    'search.focusHint': 'Określ aspekt, pod którym artykuły mają być przeanalizowane',
    'search.maxArticlesLabel': 'Liczba artykułów do analizy',
    'search.startButton': 'Rozpocznij Badanie',
    'search.starting': 'Rozpoczynanie...',
    
    // How it works
    'howItWorks.title': 'Jak to działa?',
    'howItWorks.step1.title': '1. Wyszukiwanie',
    'howItWorks.step1.desc': 'System przeszukuje arXiv w poszukiwaniu artykułów pasujących do tematu',
    'howItWorks.step2.title': '2. Pobieranie',
    'howItWorks.step2.desc': 'Pobierane są szczegóły artykułów: tytuły, autorzy, abstrakty',
    'howItWorks.step3.title': '3. Analiza AI',
    'howItWorks.step3.desc': 'Model LLM analizuje każdy artykuł pod zadanym kątem',
    'howItWorks.step4.title': '4. Synteza',
    'howItWorks.step4.desc': 'Generowany jest kompleksowy raport z wnioskami i rekomendacjami',
    'howItWorks.tip': 'Wskazówka: Im bardziej precyzyjny kąt analizy, tym bardziej trafne i użyteczne wnioski otrzymasz.',
    
    // Status
    'status.pending': 'Oczekuje',
    'status.searching': 'Wyszukiwanie',
    'status.analyzing': 'Analizowanie',
    'status.completed': 'Zakończono',
    'status.error': 'Błąd',
    'status.searchingMessage': 'Wyszukiwanie artykułów na arXiv...',
    'status.analyzingMessage': 'Analizowanie artykułów...',
    'status.focusLabel': 'Kąt analizy:',
    'status.articlesCount': 'artykułów',
    
    // Analysis
    'analysis.title': 'Analiza Badawcza',
    'analysis.summary': 'Podsumowanie',
    'analysis.keyFindings': 'Kluczowe Wnioski',
    'analysis.methodology': 'Metodologia',
    'analysis.conclusions': 'Wnioski',
    'analysis.recommendations': 'Rekomendacje',
    'analysis.articles': 'Przeanalizowane Artykuły',
    
    // History
    'history.title': 'Historia Badań',
    'history.refresh': 'Odśwież',
    'history.view': 'Zobacz',
    'history.empty': 'Brak historii badań',
    'history.emptyHint': 'Rozpocznij pierwsze badanie!',
    
    // Results
    'results.empty': 'Brak wyników do wyświetlenia',
    'results.emptyHint': 'Rozpocznij nowe badanie lub załaduj sesję z historii',
    
    // Footer
    'footer.createdBy': 'Stworzony przez',
    'footer.poweredBy': 'Powered by AI',
    
    // Errors
    'error.fillFields': 'Proszę wypełnić temat i kąt analizy',
    'error.startResearch': 'Wystąpił błąd podczas rozpoczynania badania',
    'error.loadSession': 'Nie udało się załadować sesji',
    'error.deleteSession': 'Nie udało się usunąć sesji',
    
    // Success
    'success.researchStarted': 'Badanie rozpoczęte!',
    'success.sessionDeleted': 'Sesja usunięta',
  },
  en: {
    // Header
    'app.title': 'arXiv Research Analyzer',
    'app.subtitle': 'Automated fetching and analysis of academic papers with AI',
    
    // Navigation
    'nav.newResearch': 'New Research',
    'nav.results': 'Results',
    'nav.history': 'History',
    
    // Search Tab
    'search.title': 'Research Parameters',
    'search.description': 'Define the topic and analysis focus for arXiv articles',
    'search.topicLabel': 'Research Topic',
    'search.topicPlaceholder': 'e.g. machine learning, quantum computing, neural networks',
    'search.topicHint': 'Enter a topic or keywords to search on arXiv',
    'search.focusLabel': 'Analysis Focus',
    'search.focusPlaceholder': 'e.g. Analyze for medical applications, focus on supervised learning methods...',
    'search.focusHint': 'Specify the aspect under which articles should be analyzed',
    'search.maxArticlesLabel': 'Number of articles to analyze',
    'search.startButton': 'Start Research',
    'search.starting': 'Starting...',
    
    // How it works
    'howItWorks.title': 'How it works?',
    'howItWorks.step1.title': '1. Search',
    'howItWorks.step1.desc': 'The system searches arXiv for articles matching the topic',
    'howItWorks.step2.title': '2. Fetch',
    'howItWorks.step2.desc': 'Article details are fetched: titles, authors, abstracts',
    'howItWorks.step3.title': '3. AI Analysis',
    'howItWorks.step3.desc': 'LLM model analyzes each article from the specified perspective',
    'howItWorks.step4.title': '4. Synthesis',
    'howItWorks.step4.desc': 'A comprehensive report with conclusions and recommendations is generated',
    'howItWorks.tip': 'Tip: The more precise your analysis focus, the more relevant and useful insights you will receive.',
    
    // Status
    'status.pending': 'Pending',
    'status.searching': 'Searching',
    'status.analyzing': 'Analyzing',
    'status.completed': 'Completed',
    'status.error': 'Error',
    'status.searchingMessage': 'Searching for articles on arXiv...',
    'status.analyzingMessage': 'Analyzing articles...',
    'status.focusLabel': 'Analysis focus:',
    'status.articlesCount': 'articles',
    
    // Analysis
    'analysis.title': 'Research Analysis',
    'analysis.summary': 'Summary',
    'analysis.keyFindings': 'Key Findings',
    'analysis.methodology': 'Methodology',
    'analysis.conclusions': 'Conclusions',
    'analysis.recommendations': 'Recommendations',
    'analysis.articles': 'Analyzed Articles',
    
    // History
    'history.title': 'Research History',
    'history.refresh': 'Refresh',
    'history.view': 'View',
    'history.empty': 'No research history',
    'history.emptyHint': 'Start your first research!',
    
    // Results
    'results.empty': 'No results to display',
    'results.emptyHint': 'Start a new research or load a session from history',
    
    // Footer
    'footer.createdBy': 'Created by',
    'footer.poweredBy': 'Powered by AI',
    
    // Errors
    'error.fillFields': 'Please fill in the topic and analysis focus',
    'error.startResearch': 'An error occurred while starting the research',
    'error.loadSession': 'Failed to load session',
    'error.deleteSession': 'Failed to delete session',
    
    // Success
    'success.researchStarted': 'Research started!',
    'success.sessionDeleted': 'Session deleted',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Initialize from localStorage if available
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      if (saved && (saved === 'pl' || saved === 'en')) {
        return saved;
      }
    }
    return 'pl';
  });

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export type { Language };
