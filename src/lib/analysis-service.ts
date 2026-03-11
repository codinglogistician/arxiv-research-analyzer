import ZAI from 'z-ai-web-dev-sdk';
import type { ArxivSearchResult } from './types';
import type { Language } from './language-context';

export interface ArticleAnalysis {
  articleId: string;
  relevanceScore: number;
  keyPoints: string[];
  methodology: string;
  findings: string[];
}

export interface ResearchAnalysis {
  sessionId: string;
  summary: string;
  keyFindings: string[];
  methodology: string;
  conclusions: string;
  recommendations: string;
  articleAnalyses: ArticleAnalysis[];
}

export class AnalysisService {
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  async initialize() {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
    return this.zai;
  }

  private parseJsonFromResponse(response: string): any {
    try {
      return JSON.parse(response);
    } catch {}

    const jsonBlockMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonBlockMatch) {
      try {
        return JSON.parse(jsonBlockMatch[1].trim());
      } catch {}
    }

    const jsonObjectMatch = response.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]);
      } catch {}
    }

    return null;
  }

  async analyzeArticle(
    article: ArxivSearchResult,
    focusArea: string,
    language: Language = 'pl'
  ): Promise<ArticleAnalysis> {
    await this.initialize();

    const isPolish = language === 'pl';
    const prompt = isPolish
      ? `Przeanalizuj artykuł w kontekście: "${focusArea}"

Tytuł: ${article.title}
Autorzy: ${article.authors?.join?.(', ') || 'Nieznani'}
Abstrakt: ${article.abstract?.substring(0, 500) || 'Brak'}

Podaj:
1. Trafność 0-100
2. 3-5 kluczowych punktów
3. Metodologia (jeśli możliwa)
4. Wnioski (jeśli możliwe)

Tylko JSON: {\"relevanceScore\": 75, \"keyPoints\": [\"p1\", \"p2\"], \"methodology\": \"opis\", \"findings\": [\"f1\", \"f2\"]}`
      : `Analyze article in context of: \"${focusArea}\"

Title: ${article.title}
Authors: ${article.authors?.join?.(', ') || 'Unknown'}
Abstract: ${article.abstract?.substring(0, 500) || 'Not available'}

Provide:
1. Relevance score 0-100
2. 3-5 key points
3. Methodology (if determinable)
4. Findings (if determinable)

Only JSON: {"relevanceScore": 75, "keyPoints": ["p1", "p2"], "methodology": "desc", "findings": ["f1", "f2"]}
`;

    try {
      const completion = await this.zai!.chat.completions.create({
        messages: [
          { role: 'assistant', content: isPolish 
            ? 'Jesteś ekspertem analizy artykułów naukowych. Odpowiadaj TYLKO JSON bez dodatkowego tekstu.'
            : 'You are an expert academic paper analyst. Respond ONLY with JSON, no additional text.'
          },
          { role: 'user', content: prompt }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = this.parseJsonFromResponse(response);
      
      if (parsed) {
        return {
          articleId: article.id,
          relevanceScore: parsed.relevanceScore || 50,
          keyPoints: parsed.keyPoints || [isPolish ? 'Analiza niedostępna' : 'Analysis unavailable'],
          methodology: parsed.methodology || (isPolish ? 'Nie określono' : 'Not determined'),
          findings: parsed.findings || []
        };
      }
    } catch (error) {
      console.error('[AnalysisService] Error:', error);
    }

    return {
      articleId: article.id,
      relevanceScore: 50,
      keyPoints: [isPolish ? 'Nie udało się wygenerować analizy' : 'Analysis generation failed'],
      methodology: isPolish ? 'Nie określono' : 'Not determined',
      findings: []
    };
  }

  async generateResearchAnalysis(
    articles: (ArxivSearchResult & { analysis?: ArticleAnalysis })[],
    topic: string,
    focusArea: string,
    language: Language = 'pl'
  ): Promise<Omit<ResearchAnalysis, 'sessionId'>> {
    await this.initialize();

    const isPolish = language === 'pl';
    const articleSummaries = articles.map((a, i) => ({
      index: i + 1,
      title: a.title,
      authors: a.authors?.slice(0, 3).join(', ') + ((a.authors?.length || 0) > 3 ? ' et al.' : ''),
      relevance: a.analysis?.relevanceScore || 50,
      keyPoints: a.analysis?.keyPoints?.slice(0, 3) || [],
      abstract: a.abstract?.substring(0, 300) || ''
    }));

    const prompt = isPolish
      ? `Analizujesz ${articles.length} artykułów o "${topic}" ze skupieniem na "${focusArea}".

Artykuły: ${JSON.stringify(articleSummaries, null, 2)}

Wygeneruj kompleksową analizę:
1. Podsumowanie badań
2. 3-5 kluczowych wniosków
3. Metodologie
4. Konkluzje
5. Rekomendacje dla dalszych badań

Tylko JSON: {"summary": "tekst", "keyFindings": ["f1", "f2"], "methodology": "tekst", "conclusions": "tekst", "recommendations": "tekst"}`
      : `You are analyzing ${articles.length} articles about "${topic}" focusing on "${focusArea}".

Articles: ${JSON.stringify(articleSummaries, null, 2)}

Generate comprehensive analysis:
1. Summary of research
2. 3-5 key findings
3. Methodologies used
4. Conclusions
5. Recommendations for further research

Only JSON: {"summary": "text", "keyFindings": ["f1", "f2"], "methodology": "text", "conclusions": "text", "recommendations": "text"}`;

    try {
      const completion = await this.zai!.chat.completions.create({
        messages: [
          { role: 'assistant', content: isPolish 
            ? 'Jesteś ekspertem syntezy badań naukowych. Odpowiadaj TYLKO JSON bez dodatkowego tekstu.'
            : 'You are an expert research synthesizer. Respond ONLY with JSON, no additional text.'
          },
          { role: 'user', content: prompt }
        ],
        thinking: { type: 'disabled' }
      });

      const response = completion.choices[0]?.message?.content || '{}';
      const parsed = this.parseJsonFromResponse(response);
      
      if (parsed) {
        return {
          sessionId: '',
          summary: parsed.summary || (isPolish ? 'Brak podsumowania' : 'No summary'),
          keyFindings: parsed.keyFindings || [isPolish ? 'Brak wniosków' : 'No findings'],
          methodology: parsed.methodology || (isPolish ? 'Nie określono' : 'Not determined'),
          conclusions: parsed.conclusions || (isPolish ? 'Brak konkluzji' : 'No conclusions'),
          recommendations: parsed.recommendations || (isPolish ? 'Brak rekomendacji' : 'No recommendations'),
          articleAnalyses: articles.map(a => a.analysis!).filter(Boolean)
        };
      }
    } catch (error) {
      console.error('[AnalysisService] Research analysis error:', error);
    }

    return {
      sessionId: '',
      summary: isPolish ? 'Nie udało się wygenerować analizy. Spróbuj ponownie.' : 'Failed to generate analysis. Please try again.',
      keyFindings: [isPolish ? 'Błąd generowania' : 'Generation error'],
      methodology: isPolish ? 'Nie określono' : 'Not determined',
      conclusions: isPolish ? 'Brak danych' : 'Not available',
      recommendations: isPolish ? 'Spróbuj ponownie z innym tematem' : 'Try again with different parameters',
      articleAnalyses: articles.map(a => a.analysis!).filter(Boolean)
    };
  }
}

export const analysisService = new AnalysisService();
