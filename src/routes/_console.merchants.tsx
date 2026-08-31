import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Store } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { merchantsApi } from "@/api/merchantsApi";
import { PageHeader } from "@/components/common/page-header";
import { EmptyState, ErrorState, TableSkeletonRows } from "@/components/common/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

const merchantSchema = z.object({
  companyName: z
    .string()
    .trim()
    .min(2, "Company name is required")
    .max(120, "Company name is too long"),

  contactName: z
    .string()
    .trim()
    .min(2, "Contact name is required")
    .max(120, "Contact name is too long"),

  email: z.string().trim().email("Enter a valid email address"),

  phone: z.string().trim().min(7, "Phone number is required").max(30, "Phone number is too long"),

  isActive: z.boolean(),
});

type MerchantFormValues = z.infer<typeof merchantSchema>;

export const Route = createFileRoute("/_console/merchants")({
  head: () => ({
    meta: [
      { title: "Merchants — TrackFlow" },
      {
        name: "description",
        content: "Manage merchant accounts, contacts, and shipment volumes.",
      },
      {
        property: "og:title",
        content: "Merchants — TrackFlow",
      },
      {
        property: "og:description",
        content: "Merchant directory with contact details and shipment volume.",
      },
    ],
  }),

  component: MerchantsPage,
});

function MerchantsPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [page, setPage] = useState(1);

  const [addMerchantOpen, setAddMerchantOpen] = useState(false);

  const queryClient = useQueryClient();

  const merchants = useQuery({
    queryKey: ["merchants", { search, status, page }],
    queryFn: () =>
      merchantsApi.list({
        search,
        status,
        page,
        pageSize: 10,
      }),
  });

  const form = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      isActive: true,
    },
  });

  const createMerchant = useMutation({
    mutationFn: (values: MerchantFormValues) => merchantsApi.create(values),

    onSuccess: (merchant) => {
      void queryClient.invalidateQueries({
        queryKey: ["merchants"],
      });

      toast.success("Merchant created", {
        description: `${merchant.companyName} was added successfully.`,
      });

      form.reset({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        isActive: true,
      });

      setAddMerchantOpen(false);
    },

    onError: (error: Error) => {
      toast.error("Could not create merchant", {
        description: error.message,
      });
    },
  });

  const submitMerchant = (values: MerchantFormValues) => {
    createMerchant.mutate(values);
  };

  return (
    <>
      <PageHeader
        title="Merchants"
        description="Every merchant sending shipments through TrackFlow."
        actions={
          <Button onClick={() => setAddMerchantOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add merchant
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,320px)_auto]">
        <Input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Search company, contact, or email"
          aria-label="Search merchants"
        />

        <div className="flex flex-wrap gap-2">
          {(["", "active", "inactive"] as const).map((value) => (
            <Button
              key={value || "all"}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
            >
              {value === "" ? "All" : value === "active" ? "Active" : "Inactive"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {merchants.isError ? (
            <ErrorState
              description="Merchants could not be loaded."
              onRetry={() => merchants.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] caption-bottom text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-[18%] px-6 py-4 text-left font-medium">Company</th>

                    <th className="w-[14%] px-6 py-4 text-left font-medium">Contact</th>

                    <th className="w-[22%] px-6 py-4 font-medium">
                      <div className="flex justify-center">Email</div>
                    </th>

                    <th className="w-[16%] px-6 py-4 font-medium">
                      <div className="flex justify-center">Phone</div>
                    </th>

                    <th className="w-[10%] px-6 py-4 text-center font-medium">Shipments</th>

                    <th className="w-[10%] px-6 py-4 text-center font-medium">Status</th>

                    <th className="w-[10%] px-6 py-4 text-center font-medium">Joined</th>
                  </tr>
                </thead>

                <tbody>
                  {merchants.isPending ? (
                    <TableSkeletonRows rows={6} columns={7} />
                  ) : merchants.data.items.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-0">
                        <EmptyState
                          icon={<Store className="size-5" aria-hidden="true" />}
                          title="No merchants found"
                          description="Try a different search term or clear the status filter."
                        />
                      </td>
                    </tr>
                  ) : (
                    merchants.data.items.map((merchant) => (
                      <tr key={merchant.id} className="border-b">
                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                          {merchant.companyName}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">{merchant.contactName}</td>

                        <td className="px-6 py-4 text-center">
                          <span className="block truncate">{merchant.email}</span>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {merchant.phone}
                        </td>

                        <td className="px-6 py-4 text-center tabular-nums">
                          {merchant.shipmentCount}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant={merchant.isActive ? "default" : "secondary"}>
                            {merchant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {formatDate(merchant.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {merchants.data && merchants.data.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            Page {merchants.data.page} of {merchants.data.totalPages} · {merchants.data.totalCount}{" "}
            merchants
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>

            <Button
              size="sm"
              variant="outline"
              disabled={page >= merchants.data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}

      {/* =========================
          ADD MERCHANT DIALOG
      ========================= */}

      <Dialog
        open={addMerchantOpen}
        onOpenChange={(open) => {
          if (!createMerchant.isPending) {
            setAddMerchantOpen(open);

            if (!open) {
              form.reset({
                companyName: "",
                contactName: "",
                email: "",
                phone: "",
                isActive: true,
              });
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add merchant</DialogTitle>

            <DialogDescription>
              Create a merchant account that can send shipments through TrackFlow.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitMerchant)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. Northwind Supply Co." {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact name</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. John Smith" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>

                    <FormControl>
                      <Input type="email" placeholder="merchant@example.com" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>

                    <FormControl>
                      <Input type="tel" placeholder="+1 555 123 4567" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center gap-3 rounded-md border p-3">
                      <FormControl>
                        <input
                          type="checkbox"
                          checked={field.value}
                          onChange={field.onChange}
                          className="size-4"
                        />
                      </FormControl>

                      <div>
                        <FormLabel className="cursor-pointer">Active merchant</FormLabel>

                        <p className="text-sm text-muted-foreground">
                          Active merchants can be selected when creating shipments.
                        </p>
                      </div>
                    </div>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={createMerchant.isPending}
                  onClick={() => setAddMerchantOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={createMerchant.isPending}>
                  {createMerchant.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Creating…
                    </>
                  ) : (
                    "Create merchant"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
