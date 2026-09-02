import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowUpDown } from "lucide-react";

import { dashboardApi } from "@/api/dashboardApi";
import { RiskLevel } from "@/api/types";
import { RiskBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate } from "@/lib/format";

interface AtRiskSearch {
  risk?: string | undefined;
}

export const Route = createFileRoute("/_console/_console/at-risk")({
  head: () => ({
    meta: [
      { title: "At-Risk Shipments — TrackFlow" },
      { name: "description", content: "Focused operational view of at-risk, delayed, and critical shipments." },
      { property: "og:title", content: "At-Risk Shipments — TrackFlow" },
      { property: "og:description", content: "Resolve delays before they miss their expected delivery date." },
    ],
  }),
  validateSearch: (raw: Record<string, unknown>): AtRiskSearch => {
    const risk = raw["risk"];
    return { risk: typeof risk === "string" && risk ? risk : undefined };
  },
  component: AtRiskPage,
});

const FILTERS: Array<{ label: string; value: RiskLevel | undefined }> = [
  { label: "All risk", value: undefined },
  { label: "At Risk", value: RiskLevel.AtRisk },
  { label: "Delayed", value: RiskLevel.Delayed },
  { label: "Critical", value: RiskLevel.Critical },
];

function AtRiskPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const rowNavigate = useNavigate();

  const atRisk = useQuery({
    queryKey: ["at-risk", search.risk ?? "all"],
    queryFn: () => dashboardApi.atRiskShipments(search.risk ? [search.risk as RiskLevel] : undefined),
  });

  const counts = (level: RiskLevel) => atRisk.data?.filter((item) => item.riskLevel === level).length ?? 0;

  return (
    <>
      <PageHeader
        title="At-risk shipments"
        description="Critical shipments are listed first so the highest-impact work is always on top."
      />

      <section aria-label="Risk summary" className="grid gap-4 sm:grid-cols-3">
        {[RiskLevel.Critical, RiskLevel.Delayed, RiskLevel.AtRisk].map((level) => (
          <Card key={level}>
            <CardContent className="flex items-center justify-between gap-3 pt-6">
              <div className="min-w-0">
                <p className="text-sm text-muted-foreground">{level}</p>
                <p className="text-2xl font-semibold tabular-nums">{counts(level)}</p>
              </div>
              <RiskBadge risk={level} />
            </CardContent>
          </Card>
        ))}
      </section>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by risk level">
        {FILTERS.map((filter) => (
          <Button
            key={filter.label}
            size="sm"
            variant={(search.risk ?? undefined) === filter.value ? "default" : "outline"}
            onClick={() => void navigate({ to: ".", search: { risk: filter.value } })}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      <Card>
        <CardContent className="p-0">
          {atRisk.isError ? (
            <ErrorState description="At-risk shipments could not be loaded." onRetry={() => atRisk.refetch()} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tracking number</TableHead>
                    <TableHead>Merchant</TableHead>
                    <TableHead>
                      <span className="inline-flex items-center gap-1">
                        Risk
                        <ArrowUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
                      </span>
                    </TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Hours inactive</TableHead>
                    <TableHead>Expected delivery</TableHead>
                    <TableHead>Last known location</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {atRisk.isPending ? (
                    <TableSkeletonRows rows={6} columns={8} />
                  ) : atRisk.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <EmptyState
                          icon={<AlertTriangle className="size-5" aria-hidden="true" />}
                          title="Nothing at risk"
                          description="All active shipments are progressing normally."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    atRisk.data.map((shipment) => (
                      <TableRow
                        key={shipment.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open shipment ${shipment.trackingNumber}`}
                        className="cursor-pointer"
                        onClick={() =>
                          void rowNavigate({ to: "/shipments/$shipmentId", params: { shipmentId: shipment.id } })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            void rowNavigate({ to: "/shipments/$shipmentId", params: { shipmentId: shipment.id } });
                          }
                        }}
                      >
                        <TableCell className="font-mono text-sm">{shipment.trackingNumber}</TableCell>
                        <TableCell className="max-w-[180px] truncate">{shipment.merchantName}</TableCell>
                        <TableCell>
                          <RiskBadge risk={shipment.riskLevel} />
                        </TableCell>
                        <TableCell className="max-w-[220px] truncate text-muted-foreground">{shipment.reason}</TableCell>
                        <TableCell className="tabular-nums">{shipment.hoursInactive} h</TableCell>
                        <TableCell className="whitespace-nowrap">{formatDate(shipment.expectedDeliveryDate)}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-muted-foreground">
                          {shipment.lastKnownLocation}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button asChild variant="ghost" size="sm" onClick={(event) => event.stopPropagation()}>
                            <Link to="/shipments/$shipmentId" params={{ shipmentId: shipment.id }}>
                              Review
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
