'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  FileText, 
  Brain, 
  Clock, 
  ExternalLink, 
  Download, 
  Trash2, 
  RefreshCw,
  BookOpen,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Target,
  BarChart3,
  ChevronRight,
  History,
  Languages,
  User,
  LogIn,
  LogOut
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { toast } from 'sonner';
import { LanguageProvider, useLanguage } from '@/lib/language-context';
import type { Language } from '@/lib/language-context';

interface Article {
  id: string;
  arxivId: string | null;
  title: string;
  authors: string;
  abstract: string | null;
  pdfUrl: string | null;
  arxivUrl: string | null;
  publishedDate: string | null;
  createdAt: string;
}

interface Analysis {
  id: string;
  summary: string;
  keyFindings: string;
  methodology: string | null;
  conclusions: string | null;
  recommendations: string | null;
}

interface ResearchSession {
  id: string;
  topic: string;
  focusArea: string;
  status: string;
  createdAt: string;
  articles: Article[];
  analysis: Analysis | null;
}

interface SessionListItem {
  id: string;
  topic: string;
  focusArea: string;
  status: string;
  createdAt: string;
  _count: { articles: number };
}

function HomePageContent() {
  const { language, setLanguage, t } = useLanguage();
  const [topic, setTopic] = useState('');
  const [focusArea, setFocusArea] = useState('');
  const [maxArticles, setMaxArticles] = useState(5);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState<ResearchSession | null>(null);
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [activeTab, setActiveTab] = useState('search');
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/sessions?limit=20');
      const data = await response.json();
      if (data.success) {
        setSessions(data.data.sessions);
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    }
  }, []);

  useEffect(() => {
    fetchSessions();
    // Check for user session
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      })
      .catch(() => {});
  }, [fetchSessions]);

  useEffect(() => {
    if (!currentSession || currentSession.status === 'completed' || currentSession.status === 'error') {
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/research?sessionId=${currentSession.id}`);
        const data = await response.json();
        if (data.success) {
          setCurrentSession(data.data);
          if (data.data.status === 'completed' || data.data.status === 'error') {
            fetchSessions();
          }
        }
      } catch (error) {
        console.error('Failed to poll session:', error);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentSession, fetchSessions]);

  const startResearch = async () => {
    if (!topic.trim() || !focusArea.trim()) {
      toast.error(t('error.fillFields'));
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, focusArea, maxArticles, language })
      });

      const data = await response.json();
      if (data.success) {
        setCurrentSession({
          id: data.data.sessionId,
          topic,
          focusArea,
          status: 'searching',
          createdAt: new Date().toISOString(),
          articles: [],
          analysis: null
        });
        setActiveTab('results');
        toast.success(t('success.researchStarted'));
      } else {
        toast.error(data.error || t('error.startResearch'));
      }
    } catch (error) {
      console.error('Research error:', error);
      toast.error(t('error.startResearch'));
    } finally {
      setIsLoading(false);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/research?sessionId=${sessionId}`);
      const data = await response.json();
      if (data.success) {
        setCurrentSession(data.data);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      toast.error(t('error.loadSession'));
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      if (data.success) {
        setSessions(prev => prev.filter(s => s.id !== sessionId));
        if (currentSession?.id === sessionId) {
          setCurrentSession(null);
        }
        toast.success(t('success.sessionDeleted'));
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
      toast.error(t('error.deleteSession'));
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode; text: string }> = {
      pending: { variant: 'secondary', icon: <Clock className="w-3 h-3" />, text: t('status.pending') },
      searching: { variant: 'default', icon: <Search className="w-3 h-3" />, text: t('status.searching') },
      analyzing: { variant: 'default', icon: <Brain className="w-3 h-3" />, text: t('status.analyzing') },
      completed: { variant: 'default', icon: <CheckCircle2 className="w-3 h-3" />, text: t('status.completed') },
      error: { variant: 'destructive', icon: <XCircle className="w-3 h-3" />, text: t('status.error') }
    };
    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className="gap-1">
        {config.icon}
        {config.text}
      </Badge>
    );
  };

  const getProgressValue = (status: string, articlesCount: number) => {
    if (status === 'searching') return 25;
    if (status === 'analyzing') return 50 + Math.min(articlesCount * 10, 45);
    if (status === 'completed') return 100;
    if (status === 'error') return 0;
    return 0;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/icon.png" 
                alt="arXiv Research Analyzer Logo" 
                className="w-12 h-12 rounded-lg"
              />
              <div>
                <h1 className="text-2xl font-bold">{t('app.title')}</h1>
                <p className="text-sm text-muted-foreground">
                  {t('app.subtitle')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLanguage(language === 'pl' ? 'en' : 'pl')}
                className="gap-2"
              >
                <Languages className="w-4 h-4" />
                {language === 'pl' ? 'EN' : 'PL'}
              </Button>
              
              {/* Auth Button */}
              {user ? (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4" />
                  <span>{user.name || user.email}</span>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="gap-2" asChild>
                  <a href="/signin">
                    <LogIn className="w-4 h-4" />
                    {language === 'pl' ? 'Zaloguj się' : 'Sign in'}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="search" className="gap-2">
              <Search className="w-4 h-4" />
              {t('nav.newResearch')}
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-2" disabled={!currentSession}>
              <FileText className="w-4 h-4" />
              {t('nav.results')}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-2">
              <History className="w-4 h-4" />
              {t('nav.history')} ({sessions.length})
            </TabsTrigger>
          </TabsList>

          {/* Search Tab */}
          <TabsContent value="search">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" />
                    {t('search.title')}
                  </CardTitle>
                  <CardDescription>
                    {t('search.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="topic">{t('search.topicLabel')}</Label>
                    <Input
                      id="topic"
                      placeholder={t('search.topicPlaceholder')}
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('search.topicHint')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="focusArea">{t('search.focusLabel')}</Label>
                    <Textarea
                      id="focusArea"
                      placeholder={t('search.focusPlaceholder')}
                      value={focusArea}
                      onChange={(e) => setFocusArea(e.target.value)}
                      rows={3}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t('search.focusHint')}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxArticles">{t('search.maxArticlesLabel')}</Label>
                    <Input
                      id="maxArticles"
                      type="number"
                      min={1}
                      max={10}
                      value={maxArticles}
                      onChange={(e) => setMaxArticles(parseInt(e.target.value) || 5)}
                    />
                  </div>

                  <Button 
                    onClick={startResearch} 
                    disabled={isLoading || !topic.trim() || !focusArea.trim()}
                    className="w-full"
                    size="lg"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {t('search.starting')}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        {t('search.startButton')}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    {t('howItWorks.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {['step1', 'step2', 'step3', 'step4'].map((step, i) => {
                      const icons = [Search, FileText, Brain, Target];
                      const Icon = icons[i];
                      return (
                        <div key={step} className="flex items-start gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium">{t(`howItWorks.${step}.title`)}</h4>
                            <p className="text-sm text-muted-foreground">
                              {t(`howItWorks.${step}.desc`)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Separator className="my-4" />

                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {t('howItWorks.tip')}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results">
            {currentSession ? (
              <div className="space-y-6">
                {/* Status Card */}
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{currentSession.topic}</CardTitle>
                      {getStatusBadge(currentSession.status)}
                    </div>
                    <CardDescription>
                      {t('status.focusLabel')} {currentSession.focusArea}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {currentSession.status !== 'completed' && currentSession.status !== 'error' && (
                      <div className="space-y-2">
                        <Progress value={getProgressValue(currentSession.status, currentSession.articles.length)} />
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {currentSession.status === 'searching' 
                            ? t('status.searchingMessage') 
                            : t('status.analyzingMessage')}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Analysis Results */}
                {currentSession.analysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        {t('analysis.title')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[500px] pr-4">
                        <div className="space-y-6">
                          {/* Summary */}
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{t('analysis.summary')}</h3>
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown>
                                {currentSession.analysis.summary}
                              </ReactMarkdown>
                            </div>
                          </div>

                          <Separator />

                          {/* Key Findings */}
                          <div>
                            <h3 className="font-semibold text-lg mb-3">{t('analysis.keyFindings')}</h3>
                            <div className="space-y-2">
                              {(() => {
                                try {
                                  const findings = JSON.parse(currentSession.analysis.keyFindings);
                                  return findings.map((finding: string, i: number) => (
                                    <div key={i} className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                                      <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                                      <span>{finding}</span>
                                    </div>
                                  ));
                                } catch {
                                  return <p className="text-muted-foreground">{currentSession.analysis.keyFindings}</p>;
                                }
                              })()}
                            </div>
                          </div>

                          <Separator />

                          {/* Methodology */}
                          {currentSession.analysis.methodology && (
                            <>
                              <div>
                                <h3 className="font-semibold text-lg mb-2">{t('analysis.methodology')}</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown>
                                    {currentSession.analysis.methodology}
                                  </ReactMarkdown>
                                </div>
                              </div>
                              <Separator />
                            </>
                          )}

                          {/* Conclusions */}
                          {currentSession.analysis.conclusions && (
                            <>
                              <div>
                                <h3 className="font-semibold text-lg mb-2">{t('analysis.conclusions')}</h3>
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown>
                                    {currentSession.analysis.conclusions}
                                  </ReactMarkdown>
                                </div>
                              </div>
                              <Separator />
                            </>
                          )}

                          {/* Recommendations */}
                          {currentSession.analysis.recommendations && (
                            <div>
                              <h3 className="font-semibold text-lg mb-2">{t('analysis.recommendations')}</h3>
                              <div className="prose prose-sm dark:prose-invert max-w-none">
                                  <ReactMarkdown>
                                    {currentSession.analysis.recommendations}
                                  </ReactMarkdown>
                              </div>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}

                {/* Articles List */}
                {currentSession.articles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-primary" />
                        {t('analysis.articles')} ({currentSession.articles.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="h-[400px] pr-4">
                        <div className="space-y-4">
                          {currentSession.articles.map((article, index) => (
                            <div key={article.id} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline">{index + 1}</Badge>
                                    {article.arxivId && (
                                      <Badge variant="secondary">arXiv:{article.arxivId}</Badge>
                                    )}
                                  </div>
                                  <h4 className="font-medium mb-1">{article.title}</h4>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {article.authors}
                                  </p>
                                  {article.abstract && (
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {article.abstract}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                  {article.arxivUrl && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={article.arxivUrl} target="_blank" rel="noopener noreferrer">
                                        <ExternalLink className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                  {article.pdfUrl && (
                                    <Button variant="outline" size="sm" asChild>
                                      <a href={article.pdfUrl} target="_blank" rel="noopener noreferrer">
                                        <Download className="w-4 h-4" />
                                      </a>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center text-muted-foreground">
                    <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('results.empty')}</p>
                    <p className="text-sm">{t('results.emptyHint')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-primary" />
                    {t('history.title')}
                  </CardTitle>
                  <Button variant="outline" size="sm" onClick={fetchSessions}>
                    <RefreshCw className="w-4 h-4" />
                    {t('history.refresh')}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {sessions.length > 0 ? (
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div 
                          key={session.id} 
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(session.status)}
                              <span className="text-sm text-muted-foreground">
                                {new Date(session.createdAt).toLocaleString(language === 'pl' ? 'pl-PL' : 'en-US')}
                              </span>
                            </div>
                            <h4 className="font-medium">{session.topic}</h4>
                            <p className="text-sm text-muted-foreground">
                              {t('status.focusLabel')} {session.focusArea}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {session._count.articles} {t('status.articlesCount')}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => loadSession(session.id)}
                              disabled={session.status === 'pending' || session.status === 'searching' || session.status === 'analyzing'}
                            >
                              <FileText className="w-4 h-4" />
                              {t('history.view')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => deleteSession(session.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>{t('history.empty')}</p>
                    <p className="text-sm">{t('history.emptyHint')}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <img src="/icon.png" alt="Logo" className="w-6 h-6 rounded" />
              <span>arXiv Research Analyzer</span>
            </div>
            <div className="text-center">
              <span>{t('footer.createdBy')} </span>
              <a 
                href="https://vercel.com/codinglogisticians-projects" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Coding Logisticians
              </a>
              <span> | </span>
              <span className="font-medium">Rafał Jabłoński</span>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="https://arxiv.org" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-primary transition-colors"
              >
                arXiv.org
              </a>
              <span className="text-xs">{t('footer.poweredBy')}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <LanguageProvider>
      <HomePageContent />
    </LanguageProvider>
  );
}
