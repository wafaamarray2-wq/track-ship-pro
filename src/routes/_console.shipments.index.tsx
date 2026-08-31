import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowDownUp, Plus, Search, X } from "lucide-react";

import { merchantsApi } from "@/api/merchantsApi";
import { shipmentsApi } from "@/api/shipmentsApi";
import {
  RISK_LEVELS,
  SHIPMENT_STATUSES,
  type RiskLevel,
  type ShipmentQuery,
  type ShipmentSortField,
  type ShipmentStatus,
} from "@/api/types";
import { RiskBadge, StatusBadge } from "@/components/common/badges";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/common/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Permission, useAuth } from "@/lib/auth";
import { formatDate, formatRelative } from "@/lib/format";

interface ShipmentSearch {
  search?: string | undefined;
  status?: string | undefined;
  merchantId?: string | undefined;
  riskLevel?: string | undefined;
  fromDate?: string | undefined;
  toDate?: string | undefined;
  sortBy?: ShipmentSortField | undefined;
  sortDir?: "asc" | "desc" | undefined;
  page?: number | undefined;
}

const ALL = "__all__";
const PAGE_SIZE = 10;

export const Route = createFileRoute("/_console/shipments/")({
  head: () => ({
    meta: [
      { title: "Shipments — TrackFlow" },
      {
        name: "description",
        content: "Search, filter, and manage every shipment across your delivery network.",
      },
      { property: "og:title", content: "Shipments — TrackFlow" },
      {
        property: "og:description",
        content: "Filter shipments by status, merchant, risk level, and delivery date.",
      },
    ],
  }),
  validateSearch: (raw: Record<string, unknown>): ShipmentSearch => {
    const str = (key: string) => {
      const value = raw[key];
      return typeof value === "string" && value ? value : undefined;
    };
    const sortBy = str("sortBy");
    const sortDir = str("sortDir");
    const page = Number(raw["page"]);
    return {
      search: str("search"),
      status: str("status"),
      merchantId: str("merchantId"),
      riskLevel: str("riskLevel"),
      fromDate: str("fromDate"),
      toDate: str("toDate"),
      sortBy: (
        ["lastUpdatedAt", "expectedDeliveryDate", "trackingNumber", "status"] as string[]
      ).includes(sortBy ?? "")
        ? (sortBy as ShipmentSortField)
        : undefined,
      sortDir: sortDir === "asc" || sortDir === "desc" ? sortDir : undefined,
      page: page > 1 ? page : undefined,
    };
  },
  component: ShipmentsPage,
});

function ShipmentsPage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const rowNavigate = useNavigate();
  const { can } = useAuth();

  const query: ShipmentQuery = {
    search: search.search,
    status: (search.status as ShipmentStatus) ?? "",
    merchantId: search.merchantId ?? "",
    riskLevel: (search.riskLevel as RiskLevel) ?? "",
    fromDate: search.fromDate,
    toDate: search.toDate,
    sortBy: search.sortBy ?? "lastUpdatedAt",
    sortDir: search.sortDir ?? "desc",
    page: search.page ?? 1,
    pageSize: PAGE_SIZE,
  };

  const shipments = useQuery({
    queryKey: ["shipments", query],
    queryFn: () => shipmentsApi.list(query),
    placeholderData: keepPreviousData,
  });

  const merchants = useQuery({
    queryKey: ["merchants", "options"],
    queryFn: () => merchantsApi.options(),
  });

  const update = (patch: Partial<ShipmentSearch>) => {
    void navigate({ to: ".", search: { ...search, ...patch, page: patch.page } });
  };

  const hasFilters = Boolean(
    search.search ||
    search.status ||
    search.merchantId ||
    search.riskLevel ||
    search.fromDate ||
    search.toDate,
  );

  const toggleSort = (field: ShipmentSortField) => {
    const nextDir = query.sortBy === field && query.sortDir === "desc" ? "asc" : "desc";
    update({ sortBy: field, sortDir: nextDir });
  };

  const sortableHead = (field: ShipmentSortField, label: string) => (
    <TableHead>
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 font-medium transition-colors hover:text-foreground"
        aria-label={`Sort by ${label}`}
      >
        {label}
        <ArrowDownUp className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </button>
    </TableHead>
  );

  const page = query.page ?? 1;
  const totalPages = shipments.data?.totalPages ?? 1;

  return (
    <>
      <PageHeader
        title="Shipments"
        description="Every shipment in the network, with live status and risk signals."
        actions={
          can(Permission.CreateShipment) ? (
            <Button asChild>
              <Link to="/shipments/new">
                <Plus className="size-4" aria-hidden="true" />
                Create shipment
              </Link>
            </Button>
          ) : null
        }
      />

      <Card>
        <CardContent className="grid gap-3 pt-6 md:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1.5 xl:col-span-2">
            <Label htmlFor="shipment-search">Search</Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="shipment-search"
                defaultValue={search.search ?? ""}
                placeholder="Tracking number or recipient"
                className="pl-8"
                onChange={(event) => update({ search: event.target.value.trim() || undefined })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-status">Status</Label>
            <Select
              value={search.status ?? ALL}
              onValueChange={(value) => update({ status: value === ALL ? undefined : value })}
            >
              <SelectTrigger id="filter-status">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {SHIPMENT_STATUSES.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-merchant">Merchant</Label>
            <Select
              value={search.merchantId ?? ALL}
              onValueChange={(value) => update({ merchantId: value === ALL ? undefined : value })}
            >
              <SelectTrigger id="filter-merchant">
                <SelectValue placeholder="All merchants" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All merchants</SelectItem>
                {(merchants.data ?? []).map((merchant) => (
                  <SelectItem key={merchant.id} value={merchant.id}>
                    {merchant.companyName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-risk">Risk level</Label>
            <Select
              value={search.riskLevel ?? ALL}
              onValueChange={(value) => update({ riskLevel: value === ALL ? undefined : value })}
            >
              <SelectTrigger id="filter-risk">
                <SelectValue placeholder="All risk levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All risk levels</SelectItem>
                {RISK_LEVELS.map((risk) => (
                  <SelectItem key={risk} value={risk}>
                    {risk}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="filter-from">Delivery from</Label>
              <Input
                id="filter-from"
                type="date"
                value={search.fromDate ?? ""}
                onChange={(event) => update({ fromDate: event.target.value || undefined })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-to">Delivery to</Label>
              <Input
                id="filter-to"
                type="date"
                value={search.toDate ?? ""}
                onChange={(event) => update({ toDate: event.target.value || undefined })}
              />
            </div>
          </div>

          {hasFilters ? (
            <div className="flex items-end xl:col-span-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() =>
                  void navigate({
                    to: ".",
                    search: () => ({}),
                  })
                }
              >
                <X className="size-4" aria-hidden="true" />
                Clear filters
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {shipments.isError ? (
            <ErrorState
              description="Shipments could not be loaded."
              onRetry={() => shipments.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table className="min-w-[1100px]">
                <TableHeader>
                  <TableRow>
                    {sortableHead("trackingNumber", "Tracking number")}

                    <TableHead>Merchant</TableHead>

                    <TableHead>Driver</TableHead>

                    <TableHead>Recipient</TableHead>

                    <TableHead>Destination</TableHead>

                    {sortableHead("status", "Status")}

                    {sortableHead("expectedDeliveryDate", "Expected delivery")}

                    <TableHead>Risk</TableHead>

                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {shipments.isPending ? (
                    <TableSkeletonRows rows={8} columns={9} />
                  ) : shipments.data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="p-0">
                        <EmptyState
                          title="No shipments match these filters"
                          description="Try widening your search or clearing the active filters."
                          action={
                            hasFilters ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  void navigate({
                                    to: ".",
                                    search: () => ({}),
                                  })
                                }
                              >
                                Clear filters
                              </Button>
                            ) : null
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    shipments.data.items.map((shipment) => (
                      <TableRow
                        key={shipment.id}
                        tabIndex={0}
                        role="link"
                        aria-label={`Open shipment ${shipment.trackingNumber}`}
                        className="cursor-pointer"
                        onClick={() =>
                          void rowNavigate({
                            to: "/shipments/$shipmentId",
                            params: { shipmentId: shipment.id },
                          })
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();

                            void rowNavigate({
                              to: "/shipments/$shipmentId",
                              params: { shipmentId: shipment.id },
                            });
                          }
                        }}
                      >
                        <TableCell className="font-mono text-sm">
                          {shipment.trackingNumber}
                        </TableCell>

                        <TableCell className="max-w-[180px] truncate">
                          {shipment.merchantName}
                        </TableCell>

                        <TableCell className="max-w-[160px] truncate">
                          {shipment.driverName ?? "Unassigned"}
                        </TableCell>

                        <TableCell className="max-w-[160px] truncate">
                          {shipment.recipientName}
                        </TableCell>

                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {shipment.destinationCity}
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={shipment.status} />
                        </TableCell>

                        <TableCell className="whitespace-nowrap">
                          {formatDate(shipment.expectedDeliveryDate)}
                        </TableCell>

                        <TableCell>
                          <RiskBadge risk={shipment.riskLevel} />
                        </TableCell>

                        <TableCell className="text-center">
                          <Button
                            asChild
                            variant="ghost"
                            size="sm"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Link to="/shipments/$shipmentId" params={{ shipmentId: shipment.id }}>
                              View
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {shipments.data
            ? `Showing ${shipments.data.items.length} of ${shipments.data.totalCount} shipments`
            : "Loading shipments…"}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => update({ page: page - 1 > 1 ? page - 1 : undefined })}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => update({ page: page + 1 })}
          >
            Next
          </Button>
        </div>
      </div>
    </>
  );
}
