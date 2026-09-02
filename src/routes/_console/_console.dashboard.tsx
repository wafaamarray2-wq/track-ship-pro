import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, Clock, Package, Percent, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { dashboardApi } from "@/api/dashboardApi";
import { RiskBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_console/_console/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — TrackFlow" },
      { name: "description", content: "Shipment volume, delivery performance, and at-risk shipments at a glance." },
      { property: "og:title", content: "Dashboard — TrackFlow" },
      { property: "og:description", content: "Monitor shipment volume, delivery success rate, and delays." },
    ],
  }),
  component: DashboardPage,
});

function KpiCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 pt-6">
        <div className="min-w-0 space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="truncate text-2xl font-semibold tabular-nums">{value}</p>
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-md bg-accent-soft text-accent-strong">
          {icon}
        </span>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const summary = useQuery({ queryKey: ["dashboard", "summary"], queryFn: () => dashboardApi.summary() });
  const breakdown = useQuery({ queryKey: ["dashboard", "status-breakdown"], queryFn: () => dashboardApi.statusBreakdown() });
  const atRisk = useQuery({ queryKey: ["dashboard", "at-risk"], queryFn: () => dashboardApi.atRiskShipments() });
  const activity = useQuery({ queryKey: ["dashboard", "recent-activity"], queryFn: () => dashboardApi.recentActivity(6) });

  return (
    <>
      <PageHeader
        title="Operations dashboard"
        description="Live shipment performance across your delivery network."
        actions={
          <Button asChild>
            <Link to="/shipments/new">Create shipment</Link>
          </Button>
        }
      />

      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summary.isPending ? (
          Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-[104px]" />)
        ) : summary.isError ? (
          <Card className="sm:col-span-2 xl:col-span-5">
            <CardContent className="p-0">
              <ErrorState description="Dashboard metrics could not be loaded." onRetry={() => summary.refetch()} />
            </CardContent>
          </Card>
        ) : (
          <>
            <KpiCard
              label="Total shipments"
              value={String(summary.data.totalShipments)}
              icon={<Package className="size-4" aria-hidden="true" />}
            />
            <KpiCard
              label="In transit"
              value={String(summary.data.inTransit)}
              icon={<Clock className="size-4" aria-hidden="true" />}
            />
            <KpiCard
              label="Delivered"
              value={String(summary.data.delivered)}
              icon={<CheckCircle2 className="size-4" aria-hidden="true" />}
            />
            <KpiCard
              label="Delayed"
              value={String(summary.data.delayed)}
              icon={<TriangleAlert className="size-4" aria-hidden="true" />}
              hint="Delayed or critical risk"
            />
            <KpiCard
              label="Delivery success rate"
              value={`${summary.data.deliverySuccessRate}%`}
              icon={<Percent className="size-4" aria-hidden="true" />}
              hint="Of completed shipments"
            />
          </>
        )}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipment status distribution</CardTitle>
            <CardDescription>Current status of every shipment in the network.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {breakdown.isPending ? (
              <Skeleton className="h-full w-full" />
            ) : breakdown.isError ? (
              <ErrorState description="Status breakdown unavailable." onRetry={() => breakdown.refetch()} />
            ) : breakdown.data.length === 0 ? (
              <EmptyState title="No shipments yet" description="Status distribution appears once shipments exist." />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={breakdown.data} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <CartesianGrid horizontal={false} stroke="var(--border)" />
                  <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="status"
                    width={132}
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" name="Shipments" fill="var(--primary)" radius={[0, 4, 4, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Shipment volume trend</CardTitle>
            <CardDescription>Created versus delivered over the last 14 days.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {summary.isPending ? (
              <Skeleton className="h-full w-full" />
            ) : summary.isError ? (
              <ErrorState description="Volume trend unavailable." onRetry={() => summary.refetch()} />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={summary.data.volumeTrend} margin={{ left: 0, right: 16, top: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="date"
                    stroke="var(--muted-foreground)"
                    fontSize={11}
                    tickFormatter={(value: string) => value.slice(5)}
                  />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} width={28} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="shipments"
                    name="Created"
                    stroke="var(--primary)"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="delivered"
                    name="Delivered"
                    stroke="var(--success)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base">At-risk shipments</CardTitle>
              <CardDescription>Shipments that need operator attention first.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/at-risk">
                View all
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {atRisk.isPending ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : atRisk.isError ? (
              <ErrorState description="At-risk shipments unavailable." onRetry={() => atRisk.refetch()} />
            ) : atRisk.data.length === 0 ? (
              <EmptyState title="No at-risk shipments" description="Every active shipment is progressing normally." />
            ) : (
              <ul className="divide-y divide-border">
                {atRisk.data.slice(0, 5).map((shipment) => (
                  <li key={shipment.id}>
                    <Link
                      to="/shipments/$shipmentId"
                      params={{ shipmentId: shipment.id }}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-6 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-mono text-sm">{shipment.trackingNumber}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {shipment.reason} · {shipment.lastKnownLocation}
                        </span>
                      </span>
                      <RiskBadge risk={shipment.riskLevel} className="shrink-0" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base">Recent tracking activity</CardTitle>
              <CardDescription>Latest scans and operator updates.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="shrink-0">
              <Link to="/activity">
                View all
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {activity.isPending ? (
              <div className="space-y-3 p-6">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-10 w-full" />
                ))}
              </div>
            ) : activity.isError ? (
              <ErrorState description="Activity feed unavailable." onRetry={() => activity.refetch()} />
            ) : activity.data.length === 0 ? (
              <EmptyState title="No activity yet" description="Tracking events will appear here." />
            ) : (
              <ul className="divide-y divide-border">
                {activity.data.map((entry) => (
                  <li key={entry.id} className="px-6 py-3">
                    <p className="text-sm">{entry.description}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {entry.user} · {formatRelative(entry.timestamp)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {atRisk.data && atRisk.data.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Earliest expected delivery among at-risk shipments: {formatDate(atRisk.data[0]?.expectedDeliveryDate)}
        </p>
      ) : null}
    </>
  );
}
