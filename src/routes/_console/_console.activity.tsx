import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { ScrollText } from "lucide-react";
import { useState } from "react";

import { activityApi } from "@/api/activityApi";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatRelative } from "@/lib/format";

export const Route = createFileRoute("/_console/_console/activity")({
  head: () => ({
    meta: [
      { title: "Activity Log — TrackFlow" },
      { name: "description", content: "Audit trail of every action taken across shipments and merchants." },
      { property: "og:title", content: "Activity Log — TrackFlow" },
      { property: "og:description", content: "Filterable audit trail of platform activity by user and action." },
    ],
  }),
  component: ActivityPage,
});

const ALL = "__all__";

function ActivityPage() {
  const [user, setUser] = useState(ALL);
  const [action, setAction] = useState(ALL);
  const [page, setPage] = useState(1);

  const filters = useQuery({ queryKey: ["activity", "filters"], queryFn: () => activityApi.filters() });
  const activity = useQuery({
    queryKey: ["activity", { user, action, page }],
    queryFn: () =>
      activityApi.list({
        user: user === ALL ? undefined : user,
        action: action === ALL ? undefined : action,
        page,
        pageSize: 15,
      }),
  });

  return (
    <>
      <PageHeader title="Activity log" description="A chronological audit trail of platform activity." />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          value={user}
          onValueChange={(value) => {
            setUser(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by user">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All users</SelectItem>
            {(filters.data?.users ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={action}
          onValueChange={(value) => {
            setAction(value);
            setPage(1);
          }}
        >
          <SelectTrigger aria-label="Filter by action">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All actions</SelectItem>
            {(filters.data?.actions ?? []).map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {user !== ALL || action !== ALL ? (
          <Button
            variant="ghost"
            onClick={() => {
              setUser(ALL);
              setAction(ALL);
              setPage(1);
            }}
          >
            Clear filters
          </Button>
        ) : null}
      </div>

      <Card>
        <CardContent className="p-0">
          {activity.isError ? (
            <ErrorState description="The activity log could not be loaded." onRetry={() => activity.refetch()} />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>When</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.isPending ? (
                    <TableSkeletonRows rows={8} columns={5} />
                  ) : activity.data.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="p-0">
                        <EmptyState
                          icon={<ScrollText className="size-5" aria-hidden="true" />}
                          title="No activity found"
                          description="No entries match the selected filters."
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    activity.data.items.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap">
                          <span className="block text-sm">{formatRelative(entry.timestamp)}</span>
                          <span className="block text-xs text-muted-foreground">
                            {formatDateTime(entry.timestamp)}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[180px] truncate">{entry.user}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{entry.action}</Badge>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {entry.entityType} {entry.entityId}
                        </TableCell>
                        <TableCell className="max-w-[320px] truncate text-muted-foreground">{entry.description}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {activity.data && activity.data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {activity.data.page} of {activity.data.totalPages} · {activity.data.totalCount} entries
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= activity.data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
