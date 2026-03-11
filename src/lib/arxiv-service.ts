import ZAI from 'z-ai-web-dev-sdk';
import type { ArxivSearchResult } from './types';

export class ArxivService {
  private zai: Awaited<ReturnType<typeof ZAI.create>> | null = null;

  async initialize() {
    if (!this.zai) {
      this.zai = await ZAI.create();
    }
    return this.zai;
  }

  /**
   * Search arXiv for articles matching the topic
   */
  async searchArxiv(topic: string, maxResults: number = 10): Promise<ArxivSearchResult[]> {
    await this.initialize();
    
    // Use web search to find arXiv articles
    const searchQuery = `site:arxiv.org ${topic}`;
    
    console.log('[ArxivService] Searching with query:', searchQuery);
    
    const searchResults = await this.zai!.functions.invoke('web_search', {
      query: searchQuery,
      num: maxResults * 2
    });

    console.log('[ArxivService] Search completed, processing results...');

    // Handle different response formats
    let results: any[] = [];
    if (Array.isArray(searchResults)) {
      results = searchResults;
    } else if (searchResults && typeof searchResults === 'object') {
      if (Array.isArray((searchResults as any).data)) {
        results = (searchResults as any).data;
      } else if (Array.isArray((searchResults as any).results)) {
        results = (searchResults as any).results;
      }
    }

    console.log(`[ArxivService] Found ${results.length} total results`);

    // Filter and process arXiv results
    const arxivResults: ArxivSearchResult[] = [];
    const seenIds = new Set<string>();

    for (const result of results) {
      const url = result.url || result.link || '';
      const arxivInfo = this.extractArxivInfo(url);
      
      if (arxivInfo && !seenIds.has(arxivInfo.id)) {
        seenIds.add(arxivInfo.id);
        
        arxivResults.push({
          id: arxivInfo.id,
          title: result.name || result.title || 'Untitled',
          authors: [],
          abstract: result.snippet || result.description || '',
          pdfUrl: `https://arxiv.org/pdf/${arxivInfo.id}.pdf`,
          arxivUrl: `https://arxiv.org/abs/${arxivInfo.id}`,
          publishedDate: result.date || result.publishedDate || '',
          summary: result.snippet || result.description || ''
        });

        if (arxivResults.length >= maxResults) break;
      }
    }

    console.log(`[ArxivService] Extracted ${arxivResults.length} arXiv articles`);
    return arxivResults;
  }

  /**
   * Fetch detailed information about an arXiv article
   */
  async fetchArticleDetails(arxivUrl: string): Promise<Partial<ArxivSearchResult>> {
    await this.initialize();

    try {
      console.log('[ArxivService] Fetching details for:', arxivUrl);
      
      const pageResult = await this.zai!.functions.invoke('page_reader', {
        url: arxivUrl
      });

      // Handle nested data structure
      const data = (pageResult as any).data || pageResult;
      const html = data?.html || '';
      
      // Extract authors from the page
      const authors = this.extractAuthors(html);
      
      // Extract abstract
      const abstract = this.extractAbstract(html);
      
      // Extract published date
      const publishedDate = this.extractPublishedDate(html);

      console.log(`[ArxivService] Extracted ${authors.length} authors, abstract length: ${abstract.length}`);

      return {
        authors,
        abstract: abstract || '',
        publishedDate
      };
    } catch (error) {
      console.error('[ArxivService] Error fetching article details:', error);
      return {};
    }
  }

  /**
   * Extract arXiv ID from URL
   */
  private extractArxivInfo(url: string): { id: string } | null {
    if (!url) return null;
    
    // Match various arXiv URL formats
    const patterns = [
      /arxiv\.org\/abs\/(\d+\.\d+)/i,
      /arxiv\.org\/pdf\/(\d+\.\d+)/i,
      /arxiv\.org\/abs\/([a-z-]+\/\d+)/i,
      /arxiv\.org\/pdf\/([a-z-]+\/\d+)/i
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { id: match[1] };
      }
    }

    return null;
  }

  /**
   * Extract authors from arXiv page HTML
   */
  private extractAuthors(html: string): string[] {
    const authors: string[] = [];
    
    // Match citation_author meta tags (most reliable)
    const authorPattern = /<meta name="citation_author" content="([^"]+)"/g;
    let match;
    
    while ((match = authorPattern.exec(html)) !== null) {
      const author = match[1].trim();
      if (author && !authors.includes(author)) {
        authors.push(author);
      }
    }

    return authors;
  }

  /**
   * Extract abstract from arXiv page HTML
   */
  private extractAbstract(html: string): string {
    // Try citation_abstract meta tag first (most reliable)
    const abstractPattern = /<meta name="citation_abstract" content="([^"]+)"/;
    const match = html.match(abstractPattern);
    
    if (match) {
      return match[1]
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    return '';
  }

  /**
   * Extract published date from arXiv page HTML
   */
  private extractPublishedDate(html: string): string {
    // Try citation_date meta tag
    const datePattern = /<meta name="citation_date" content="([^"]+)"/;
    const match = html.match(datePattern);
    
    if (match) {
      return match[1].trim();
    }

    // Try to find submission date
    const submittedPattern = /\[Submitted on ([^\]]+)\]/;
    const submittedMatch = html.match(submittedPattern);
    if (submittedMatch) {
      return submittedMatch[1].trim();
    }

    return '';
  }
}

// Singleton instance
export const arxivService = new ArxivService();
