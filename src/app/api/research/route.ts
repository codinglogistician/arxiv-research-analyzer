import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// Maximum duration for this API route (Vercel/Next.js config)
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topic, focusArea, maxArticles = 5, language = 'pl' } = body;

    if (!topic || !focusArea) {
      return NextResponse.json(
        { success: false, error: 'Topic and focus area are required' },
        { status: 400 }
      );
    }

    // Create a new research session
    const session = await db.researchSession.create({
      data: {
        topic,
        focusArea,
        status: 'searching'
      }
    });

    // Start the research process
    const researchPromise = processResearch(session.id, topic, focusArea, maxArticles, language as 'pl' | 'en');
    
    researchPromise.catch((err) => {
      console.error(`[${session.id}] Unhandled research error:`, err);
    });

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        status: 'searching',
        message: 'Research started. Poll for updates.'
      }
    });
  } catch (error) {
    console.error('Research error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to start research' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { success: false, error: 'Session ID is required' },
        { status: 400 }
      );
    }

    const session = await db.researchSession.findUnique({
      where: { id: sessionId },
      include: {
        articles: true,
        analysis: true
      }
    });

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: session
    });
  } catch (error) {
    console.error('Fetch session error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}

// Background processing function
async function processResearch(
  sessionId: string,
  topic: string,
  focusArea: string,
  maxArticles: number,
  language: 'pl' | 'en'
) {
  console.log(`[${sessionId}] Starting research process (${language})`);
  console.log(`[${sessionId}] Topic: ${topic}`);
  console.log(`[${sessionId}] Focus: ${focusArea}`);
  
  try {
    // Dynamic import to avoid bundling issues
    const { arxivService } = await import('@/lib/arxiv-service');
    const { analysisService } = await import('@/lib/analysis-service');
    
    // Step 1: Search arXiv
    console.log(`[${sessionId}] Step 1: Searching arXiv...`);
    
    let searchResults;
    try {
      searchResults = await arxivService.searchArxiv(topic, maxArticles);
      console.log(`[${sessionId}] Search returned ${searchResults?.length || 0} results`);
    } catch (searchError: any) {
      console.error(`[${sessionId}] Search error:`, searchError?.message || searchError);
      
      // Try with simplified query
      const simplifiedTopic = topic.split(' ').slice(0, 3).join(' ');
      console.log(`[${sessionId}] Retrying with simplified query: ${simplifiedTopic}`);
      
      try {
        searchResults = await arxivService.searchArxiv(simplifiedTopic, maxArticles);
        console.log(`[${sessionId}] Retry returned ${searchResults?.length || 0} results`);
      } catch (retryError: any) {
        console.error(`[${sessionId}] Retry also failed:`, retryError?.message || retryError);
        searchResults = [];
      }
    }

    if (!searchResults || searchResults.length === 0) {
      console.log(`[${sessionId}] No articles found, updating status to error`);
      await db.researchSession.update({
        where: { id: sessionId },
        data: { status: 'error' }
      });
      return;
    }

    // Step 2: Update status to analyzing
    console.log(`[${sessionId}] Step 2: Analyzing ${searchResults.length} articles...`);
    await db.researchSession.update({
      where: { id: sessionId },
      data: { status: 'analyzing' }
    });

    // Step 3: Process each article
    const analyzedArticles = [];
    for (let i = 0; i < searchResults.length; i++) {
      const article = searchResults[i];
      console.log(`[${sessionId}] Processing article ${i + 1}/${searchResults.length}: ${article.id}`);

      try {
        // Fetch more details
        const details = await arxivService.fetchArticleDetails(article.arxivUrl);
        const enrichedArticle = { ...article, ...details };

        // Analyze the article with language support
        const analysis = await analysisService.analyzeArticle(enrichedArticle, focusArea, language);
        console.log(`[${sessionId}] Article ${article.id} analysis: relevance=${analysis.relevanceScore}`);

        // Save to database
        const savedArticle = await db.article.create({
          data: {
            arxivId: article.id,
            title: article.title,
            authors: enrichedArticle.authors?.join(', ') || 'Unknown',
            abstract: enrichedArticle.abstract || article.abstract || '',
            pdfUrl: article.pdfUrl,
            arxivUrl: article.arxivUrl,
            publishedDate: article.publishedDate,
            sessionId
          }
        });

        analyzedArticles.push({
          ...enrichedArticle,
          id: savedArticle.id,
          analysis
        });
      } catch (articleError: any) {
        console.error(`[${sessionId}] Error processing article ${article.id}:`, articleError?.message || articleError);
      }
    }

    if (analyzedArticles.length === 0) {
      console.log(`[${sessionId}] No articles were successfully processed`);
      await db.researchSession.update({
        where: { id: sessionId },
        data: { status: 'error' }
      });
      return;
    }

    // Step 4: Generate comprehensive analysis with language support
    console.log(`[${sessionId}] Step 3: Generating comprehensive analysis (${language})...`);
    
    try {
      const researchAnalysis = await analysisService.generateResearchAnalysis(
        analyzedArticles,
        topic,
        focusArea,
        language
      );

      // Save analysis
      await db.analysis.create({
        data: {
          sessionId,
          summary: researchAnalysis.summary,
          keyFindings: JSON.stringify(researchAnalysis.keyFindings),
          methodology: researchAnalysis.methodology,
          conclusions: researchAnalysis.conclusions,
          recommendations: researchAnalysis.recommendations
        }
      });

      // Update session status
      await db.researchSession.update({
        where: { id: sessionId },
        data: { status: 'completed' }
      });

      console.log(`[${sessionId}] Research completed successfully!`);
    } catch (analysisError: any) {
      console.error(`[${sessionId}] Analysis generation failed:`, analysisError?.message || analysisError);
      
      const errorMsg = language === 'pl' 
        ? 'Analiza nie została w pełni ukończona z powodu błędu podczas generowania.'
        : 'Analysis was not fully completed due to an error during generation.';
      
      const findingsDefault = language === 'pl'
        ? 'Wystąpił błąd podczas generowania pełnej analizy'
        : 'An error occurred while generating the full analysis';
      
      // Save partial results
      await db.analysis.create({
        data: {
          sessionId,
          summary: errorMsg,
          keyFindings: JSON.stringify([findingsDefault]),
          methodology: language === 'pl' ? 'Dane częściowe' : 'Partial data',
          conclusions: language === 'pl' ? 'Sprawdź poszczególne artykuły' : 'Check individual articles',
          recommendations: language === 'pl' ? 'Spróbuj ponownie z innymi parametrami' : 'Try again with different parameters'
        }
      });
      
      await db.researchSession.update({
        where: { id: sessionId },
        data: { status: 'completed' }
      });
    }
  } catch (error: any) {
    console.error(`[${sessionId}] Research failed:`, error?.message || error);
    console.error(`[${sessionId}] Stack:`, error?.stack);
    
    try {
      await db.researchSession.update({
        where: { id: sessionId },
        data: { status: 'error' }
      });
    } catch (dbError: any) {
      console.error(`[${sessionId}] Failed to update status:`, dbError?.message || dbError);
    }
  }
}
