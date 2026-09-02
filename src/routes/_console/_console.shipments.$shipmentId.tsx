import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, MapPin, PackageCheck, RefreshCw } from "lucide-react";
import { useState } from "react";

import { shipmentsApi } from "@/api/shipmentsApi";
import { RiskBadge, StatusBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { BlockSkeleton, ErrorState } from "@/components/common/states";
import { UpdateStatusDialog } from "@/components/shipments/update-status-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { isTerminal } from "@/lib/shipment-status";

export const Route = createFileRoute("/_console/_console/shipments/$shipmentId")({
  head: () => ({
    meta: [
      { title: "Shipment details — TrackFlow" },
      { name: "description", content: "Full shipment timeline, route details, and risk intelligence." },
      { property: "og:title", content: "Shipment details — TrackFlow" },
      { property: "og:description", content: "Inspect a shipment's journey, risk factors, and status history." },
    ],
  }),
  component: ShipmentDetailPage,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm break-words">{value}</dd>
    </div>
  );
}

function ShipmentDetailPage() {
  const { shipmentId } = Route.useParams();
  const [dialogOpen, setDialogOpen] = useState(false);

  const query = useQuery({
    queryKey: ["shipment", shipmentId],
    queryFn: () => shipmentsApi.getById(shipmentId),
  });

  if (query.isPending) return <BlockSkeleton className="h-96" />;
  if (query.isError || !query.data) {
    return <ErrorState description="This shipment could not be loaded." onRetry={() => query.refetch()} />;
  }

  const shipment = query.data;
  const events = [...shipment.events].sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

  return (
    <>
      <PageHeader
        title={shipment.trackingNumber}
        description={`${shipment.merchantName} · ${shipment.originCity} → ${shipment.destinationCity}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link to="/shipments">
                <ArrowLeft className="size-4" aria-hidden="true" />
                Shipments
              </Link>
            </Button>
            <Button onClick={() => setDialogOpen(true)} disabled={isTerminal(shipment.status)}>
              <RefreshCw className="size-4" aria-hidden="true" />
              Update status
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={shipment.status} />
        <RiskBadge risk={shipment.riskLevel} />
        <span className="text-sm text-muted-foreground">Updated {formatRelative(shipment.lastUpdatedAt)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tracking timeline</CardTitle>
            <CardDescription>Most recent event first.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative space-y-6 border-l border-border pl-6">
              {events.map((event, index) => (
                <li key={event.id} className="relative">
                  <span
                    aria-hidden="true"
                    className={`absolute -left-[31px] mt-1 grid size-4 place-items-center rounded-full border-2 border-background ${
                      index === 0 ? "bg-primary" : "bg-muted-foreground/40"
                    }`}
                  />
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <p className="min-w-0 text-sm font-medium">{event.status}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(event.occurredAt)}</span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 truncate">{event.location}</span>
                  </p>
                  {event.notes ? <p className="mt-1 text-sm text-muted-foreground">{event.notes}</p> : null}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.source} · {event.createdBy}
                  </p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Shipment intelligence</CardTitle>
              <CardDescription>{shipment.intelligence.summary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {shipment.intelligence.factors.map((factor) => (
                <div key={factor.label} className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 text-sm">
                  <span className="min-w-0 text-muted-foreground">{factor.label}</span>
                  <span className="shrink-0 font-medium">{factor.value}</span>
                </div>
              ))}
              <Separator />
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Hours since movement" value={`${shipment.intelligence.hoursSinceLastMovement} h`} />
                <Field label="ETA variance" value={`${shipment.intelligence.expectedDeliveryVarianceHours} h`} />
                <Field label="Failed attempts" value={String(shipment.intelligence.failedDeliveryAttempts)} />
                <Field label="Current facility" value={shipment.intelligence.currentFacility} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recipient &amp; package</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-2 gap-3">
                <Field label="Recipient" value={shipment.recipient.name} />
                <Field label="Phone" value={shipment.recipient.phone} />
                <Field label="Email" value={shipment.recipient.email} />
                <Field label="Package" value={shipment.package.description} />
                <Field label="Weight" value={`${shipment.package.weightKg} kg`} />
                <Field label="Reference" value={shipment.package.referenceNumber ?? "—"} />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <PackageCheck className="size-4" aria-hidden="true" />
                Route
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3">
                <Field
                  label="Origin"
                  value={`${shipment.origin.line1}, ${shipment.origin.city}, ${shipment.origin.state} ${shipment.origin.postalCode}, ${shipment.origin.country}`}
                />
                <Field
                  label="Destination"
                  value={`${shipment.destination.line1}, ${shipment.destination.city}, ${shipment.destination.state} ${shipment.destination.postalCode}, ${shipment.destination.country}`}
                />
                <Field label="Expected delivery" value={formatDate(shipment.expectedDeliveryDate)} />
                <Field label="Created" value={`${formatDateTime(shipment.createdAt)} by ${shipment.createdBy}`} />
                {shipment.notes ? <Field label="Notes" value={shipment.notes} /> : null}
              </dl>
            </CardContent>
          </Card>
        </div>
      </div>

      <UpdateStatusDialog shipment={shipment} open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
