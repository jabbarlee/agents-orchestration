"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";

import { MarkdownViewer } from "@/components/markdown-viewer";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

type Status = "idle" | "running" | "success" | "error";

type Result = {
  draft: string;
  score: number;
  iterations: number;
};

const AGENT_STEPS = [
  "Initializing Researcher...",
  "Drafting content...",
  "Running SEO Eval...",
] as const;

export default function Home() {
  const [targetKeyword, setTargetKeyword] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([""]);
  const [status, setStatus] = useState<Status>("idle");
  const [activeNode, setActiveNode] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStepInterval = useCallback(() => {
    if (stepIntervalRef.current) {
      clearInterval(stepIntervalRef.current);
      stepIntervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearStepInterval(), [clearStepInterval]);

  const addUrlField = () => {
    setSourceUrls((prev) => (prev.length < 3 ? [...prev, ""] : prev));
  };

  const removeUrlField = (index: number) => {
    setSourceUrls((prev) => {
      if (prev.length <= 1) {
        const next = [...prev];
        next[0] = "";
        return next;
      }
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateUrl = (index: number, value: string) => {
    setSourceUrls((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const handleGenerate = async () => {
    setErrorMessage(null);
    const keyword = targetKeyword.trim();
    const urls = sourceUrls.map((u) => u.trim()).filter(Boolean);

    if (!keyword) {
      setErrorMessage("Please enter a target keyword.");
      setStatus("error");
      return;
    }
    if (urls.length === 0) {
      setErrorMessage("Add at least one reference URL.");
      setStatus("error");
      return;
    }
    if (urls.length > 3) {
      setErrorMessage("Use at most three reference URLs.");
      setStatus("error");
      return;
    }

    setStatus("running");
    setResult(null);
    setActiveNode(AGENT_STEPS[0]);

    let stepIndex = 0;
    clearStepInterval();
    stepIntervalRef.current = setInterval(() => {
      stepIndex = (stepIndex + 1) % AGENT_STEPS.length;
      setActiveNode(AGENT_STEPS[stepIndex]);
    }, 2200);

    try {
      const res = await fetch("/api/generate-seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetKeyword: keyword, sourceUrls: urls }),
      });

      const data = (await res.json()) as { draft?: string; score?: number; iterations?: number; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }

      setResult({
        draft: data.draft ?? "",
        score: data.score ?? 0,
        iterations: data.iterations ?? 0,
      });
      setStatus("success");
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    } finally {
      clearStepInterval();
    }
  };

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-4 py-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            LangGraph · OpenAI
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            AI SEO Content Engine
          </h1>
          <p className="max-w-2xl text-pretty text-muted-foreground">
            Research live URLs, draft a structured article, and iterate with an SEO critic until quality
            thresholds are met.
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8">
        {errorMessage && status === "error" && (
          <Alert variant="destructive">
            <AlertTitle>Generation failed</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid flex-1 gap-6 lg:grid-cols-2 lg:items-start">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Brief</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleGenerate();
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="keyword">Target keyword</Label>
                  <Input
                    id="keyword"
                    name="keyword"
                    placeholder="e.g. best running shoes for flat feet"
                    value={targetKeyword}
                    onChange={(e) => setTargetKeyword(e.target.value)}
                    disabled={status === "running"}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Reference URLs</Label>
                    <span className="text-xs text-muted-foreground">1–3 URLs</span>
                  </div>
                  <div className="space-y-2">
                    {sourceUrls.map((url, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          id={`url-${index}`}
                          name={`url-${index}`}
                          type="url"
                          placeholder="https://example.com/article"
                          value={url}
                          onChange={(e) => updateUrl(index, e.target.value)}
                          disabled={status === "running"}
                          autoComplete="off"
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0 text-muted-foreground hover:text-foreground"
                          onClick={() => removeUrlField(index)}
                          disabled={status === "running"}
                          aria-label={`Remove URL ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full gap-2 sm:w-auto"
                    onClick={addUrlField}
                    disabled={status === "running" || sourceUrls.length >= 3}
                  >
                    <Plus className="size-4" />
                    Add URL
                  </Button>
                </div>

                <Button type="submit" className="w-full gap-2 sm:w-auto" disabled={status === "running"}>
                  {status === "running" ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    "Generate SEO Article"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Output &amp; telemetry</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {status === "idle" && (
                <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-16 text-center">
                  <FileText className="size-12 text-muted-foreground/80" strokeWidth={1.25} />
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Enter your keyword and URLs to begin. Your draft and SEO score will appear here.
                  </p>
                </div>
              )}

              {status === "running" && (
                <div className="space-y-6 py-4">
                  <Progress value={undefined} className="h-2" />
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin text-primary" />
                    <span className="font-medium text-foreground">{activeNode}</span>
                  </div>
                </div>
              )}

              {status === "success" && result && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90">
                      SEO Score: {result.score}/100
                    </Badge>
                    <Badge variant="secondary">Iterations: {result.iterations}</Badge>
                  </div>
                  <ScrollArea className="h-[600px] rounded-md border border-border bg-muted/20 p-4">
                    <MarkdownViewer content={result.draft} />
                  </ScrollArea>
                </div>
              )}

              {status === "error" && (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
                  <FileText className="size-10 text-muted-foreground/80" strokeWidth={1.25} />
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Fix the inputs above and try again. See the error message for details.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
