"use client";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { TopBar } from "@/components/layout/TopBar";
import { SignalDetailPanel } from "@/components/features/SignalDetailPanel";
import { ErrorBoundary, ErrorDisplay } from "@/components/ui/ErrorBoundary";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { useSignalDetail } from "@/lib/hooks";
import { use } from "react";

interface SignalDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function SignalDetailPage({ params }: SignalDetailPageProps) {
  const { id } = use(params);
  return (
    <>
      <TopBar title="Signal Detail" subtitle="Deep dive analysis" />
      <PageWrapper>
        <Link
          href="/signals"
          className="inline-flex items-center gap-1 text-xs text-muted hover:text-foreground transition-colors mb-6"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Signals
        </Link>
        <ErrorBoundary context="SignalDetailPage">
          <SignalDetailContent id={id} />
        </ErrorBoundary>
      </PageWrapper>
    </>
  );
}

function SignalDetailContent({ id }: { id: string }) {
  const { data: signal, isLoading, error, refetch } = useSignalDetail(id);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="lg:col-span-1">
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error || !signal) {
    return (
      <ErrorDisplay
        error={(error as Error) ?? new Error("Signal not found")}
        onRetry={() => refetch()}
        message="Failed to load signal details"
      />
    );
  }

  return <SignalDetailPanel signal={signal} />;
}
