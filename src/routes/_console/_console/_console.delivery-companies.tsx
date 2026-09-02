import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Plus, Truck } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
  deliveryCompaniesApi,
  type CreateDeliveryCompanyPayload,
} from "@/api/deliveryCompaniesApi";
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

const deliveryCompanySchema = z.object({
  name: z.string().trim().min(2, "Company name is required").max(120, "Company name is too long"),

  email: z.string().trim().email("Enter a valid email address"),

  phone: z.string().trim().min(7, "Phone number is required").max(30, "Phone number is too long"),
});

type DeliveryCompanyFormValues = z.infer<typeof deliveryCompanySchema>;

export const Route = createFileRoute("/_console/_console/_console/delivery-companies")({
  head: () => ({
    meta: [
      { title: "Delivery Companies — TrackFlow" },
      {
        name: "description",
        content: "Manage delivery companies and their contact information.",
      },
      {
        property: "og:title",
        content: "Delivery Companies — TrackFlow",
      },
      {
        property: "og:description",
        content: "Delivery company directory.",
      },
    ],
  }),

  component: DeliveryCompaniesPage,
});

function DeliveryCompaniesPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "active" | "inactive">("");
  const [addCompanyOpen, setAddCompanyOpen] = useState(false);

  const queryClient = useQueryClient();

  const deliveryCompanies = useQuery({
    queryKey: ["delivery-companies"],
    queryFn: () => deliveryCompaniesApi.list(),
  });

  const form = useForm<DeliveryCompanyFormValues>({
    resolver: zodResolver(deliveryCompanySchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });

  const createCompany = useMutation({
    mutationFn: async (values: DeliveryCompanyFormValues) => {
      const payload: CreateDeliveryCompanyPayload = {
        name: values.name,
        email: values.email,
        phone: values.phone,
      };

      return deliveryCompaniesApi.create(payload);
    },

    onSuccess: (company) => {
      void queryClient.invalidateQueries({
        queryKey: ["delivery-companies"],
      });

      toast.success("Delivery company created", {
        description: `${company.name} was created successfully.`,
      });

      form.reset({
        name: "",
        email: "",
        phone: "",
      });

      setAddCompanyOpen(false);
    },

    onError: (error: Error) => {
      toast.error("Could not create delivery company", {
        description: error.message,
      });
    },
  });

  const submitCompany = (values: DeliveryCompanyFormValues) => {
    createCompany.mutate(values);
  };

  const filteredCompanies =
    deliveryCompanies.data?.filter((company) => {
      const matchesSearch =
        search.trim() === "" ||
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.email.toLowerCase().includes(search.toLowerCase()) ||
        company.companyCode.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        status === "" ||
        (status === "active" && company.isActive) ||
        (status === "inactive" && !company.isActive);

      return matchesSearch && matchesStatus;
    }) ?? [];

  return (
    <>
      <PageHeader
        title="Delivery Companies"
        description="Companies responsible for operating shipments through TrackFlow."
        actions={
          <Button onClick={() => setAddCompanyOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Add company
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,320px)_auto]">
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search company, code, or email"
          aria-label="Search delivery companies"
        />

        <div className="flex flex-wrap gap-2">
          {(["", "active", "inactive"] as const).map((value) => (
            <Button
              key={value || "all"}
              size="sm"
              variant={status === value ? "default" : "outline"}
              onClick={() => setStatus(value)}
            >
              {value === "" ? "All" : value === "active" ? "Active" : "Inactive"}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {deliveryCompanies.isError ? (
            <ErrorState
              description="Delivery companies could not be loaded."
              onRetry={() => deliveryCompanies.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] caption-bottom text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="w-[18%] px-6 py-4 text-left font-medium">Company</th>

                    <th className="w-[16%] px-6 py-4 text-left font-medium">Code</th>

                    <th className="w-[24%] px-6 py-4 font-medium">
                      <div className="flex justify-center">Email</div>
                    </th>

                    <th className="w-[18%] px-6 py-4 font-medium">
                      <div className="flex justify-center">Phone</div>
                    </th>

                    <th className="w-[12%] px-6 py-4 text-center font-medium">Status</th>

                    <th className="w-[12%] px-6 py-4 text-center font-medium">Created</th>
                  </tr>
                </thead>

                <tbody>
                  {deliveryCompanies.isPending ? (
                    <TableSkeletonRows rows={6} columns={6} />
                  ) : filteredCompanies.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-0">
                        <EmptyState
                          icon={<Truck className="size-5" aria-hidden="true" />}
                          title="No delivery companies found"
                          description="Try a different search term or clear the status filter."
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredCompanies.map((company) => (
                      <tr key={company.id} className="border-b">
                        <td className="px-6 py-4 font-medium whitespace-nowrap">{company.name}</td>

                        <td className="px-6 py-4 whitespace-nowrap">{company.companyCode}</td>

                        <td className="px-6 py-4 text-center">
                          <span className="block truncate">{company.email}</span>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">{company.phone}</td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant={company.isActive ? "default" : "secondary"}>
                            {company.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {formatDate(company.createdAt)}
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

      <Dialog
        open={addCompanyOpen}
        onOpenChange={(open) => {
          if (!createCompany.isPending) {
            setAddCompanyOpen(open);

            if (!open) {
              form.reset({
                name: "",
                email: "",
                phone: "",
              });
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add delivery company</DialogTitle>

            <DialogDescription>
              Create a delivery company that can operate shipments through TrackFlow.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitCompany)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. Fast Delivery Co." {...field} />
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
                      <Input type="email" placeholder="company@example.com" {...field} />
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
                      <Input type="tel" placeholder="+20 100 123 4567" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={createCompany.isPending}
                  onClick={() => setAddCompanyOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={createCompany.isPending}>
                  {createCompany.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      Creating…
                    </>
                  ) : (
                    "Create company"
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
