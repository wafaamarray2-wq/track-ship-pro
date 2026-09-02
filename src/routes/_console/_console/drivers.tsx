import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Edit, Loader2, Plus, Search, Truck, UserCheck, UserX } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { driversApi, type CreateDriverPayload, type Driver } from "@/api/driversApi";
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

const driverSchema = z.object({
  fullName: z.string().trim().min(2, "Full name is required").max(200, "Full name is too long"),

  email: z.string().trim().email("Enter a valid email address").max(320, "Email is too long"),

  phone: z.string().trim().max(30, "Phone number is too long"),

  licenseNumber: z.string().trim().max(100, "License number is too long"),

  vehicleType: z.string().trim().max(100, "Vehicle type is too long"),

  vehiclePlateNumber: z.string().trim().max(50, "Vehicle plate number is too long"),
});

type DriverFormValues = z.infer<typeof driverSchema>;

const emptyDriverValues: DriverFormValues = {
  fullName: "",
  email: "",
  phone: "",
  licenseNumber: "",
  vehicleType: "",
  vehiclePlateNumber: "",
};

export const Route = createFileRoute("/_console/_console/drivers")({
  head: () => ({
    meta: [
      { title: "Drivers — TrackFlow" },
      {
        name: "description",
        content: "Manage TrackFlow delivery drivers.",
      },
    ],
  }),

  component: DriversPage,
});

function DriversPage() {
  const [search, setSearch] = useState("");
  const [driverDialogOpen, setDriverDialogOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const queryClient = useQueryClient();

  const drivers = useQuery({
    queryKey: ["drivers"],
    queryFn: () => driversApi.list(),
  });

  const form = useForm<DriverFormValues>({
    resolver: zodResolver(driverSchema),
    defaultValues: emptyDriverValues,
  });

  const openAddDialog = () => {
    setEditingDriver(null);
    form.reset(emptyDriverValues);
    setDriverDialogOpen(true);
  };

  const openEditDialog = (driver: Driver) => {
    setEditingDriver(driver);

    form.reset({
      fullName: driver.fullName ?? "",
      email: driver.email ?? "",
      phone: driver.phone ?? "",
      licenseNumber: driver.licenseNumber ?? "",
      vehicleType: driver.vehicleType ?? "",
      vehiclePlateNumber: driver.vehiclePlateNumber ?? "",
    });

    setDriverDialogOpen(true);
  };

  const saveDriver = useMutation({
    mutationFn: async (values: DriverFormValues) => {
      const payload: CreateDriverPayload = {
        fullName: values.fullName,
        email: values.email,
        phone: values.phone || undefined,
        licenseNumber: values.licenseNumber || undefined,
        vehicleType: values.vehicleType || undefined,
        vehiclePlateNumber: values.vehiclePlateNumber || undefined,
      };

      if (editingDriver) {
        return driversApi.update(editingDriver.id, payload);
      }

      return driversApi.create(payload);
    },

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["drivers"],
      });

      toast.success(editingDriver ? "Driver updated" : "Driver created", {
        description: editingDriver
          ? "Driver information was updated successfully."
          : "The driver was created successfully.",
      });

      form.reset(emptyDriverValues);
      setEditingDriver(null);
      setDriverDialogOpen(false);
    },

    onError: (error: Error) => {
      toast.error(editingDriver ? "Could not update driver" : "Could not create driver", {
        description: error.message,
      });
    },
  });

  const activateDriver = useMutation({
    mutationFn: (id: number) => driversApi.activate(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["drivers"],
      });

      toast.success("Driver activated");
    },

    onError: (error: Error) => {
      toast.error("Could not activate driver", {
        description: error.message,
      });
    },
  });

  const deactivateDriver = useMutation({
    mutationFn: (id: number) => driversApi.deactivate(id),

    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["drivers"],
      });

      toast.success("Driver deactivated");
    },

    onError: (error: Error) => {
      toast.error("Could not deactivate driver", {
        description: error.message,
      });
    },
  });

  const normalizedSearch = search.trim().toLowerCase();

  const filteredDrivers = (drivers.data ?? []).filter((driver) => {
    if (!normalizedSearch) return true;

    return [
      driver.driverCode,
      driver.fullName,
      driver.email,
      driver.phone,
      driver.licenseNumber,
      driver.vehicleType,
      driver.vehiclePlateNumber,
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedSearch));
  });

  const submitDriver = (values: DriverFormValues) => {
    saveDriver.mutate(values);
  };

  const isSaving = saveDriver.isPending;

  return (
    <>
      <PageHeader
        title="Drivers"
        description="Manage drivers operating shipments through TrackFlow."
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="size-4" aria-hidden="true" />
            Add driver
          </Button>
        }
      />

      <div className="grid gap-2 sm:grid-cols-[minmax(0,320px)_auto]">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />

          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search driver, email, code, vehicle..."
            aria-label="Search drivers"
            className="pl-9"
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {drivers.isError ? (
            <ErrorState
              description="Drivers could not be loaded."
              onRetry={() => drivers.refetch()}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] caption-bottom text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="px-6 py-4 text-left font-medium">Driver</th>

                    <th className="px-6 py-4 text-center font-medium">Code</th>

                    <th className="px-6 py-4 text-center font-medium">Email</th>

                    <th className="px-6 py-4 text-center font-medium">Phone</th>

                    <th className="px-6 py-4 text-center font-medium">Vehicle</th>

                    <th className="px-6 py-4 text-center font-medium">Plate</th>

                    <th className="px-6 py-4 text-center font-medium">Status</th>

                    <th className="px-6 py-4 text-center font-medium">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {drivers.isPending ? (
                    <TableSkeletonRows rows={6} columns={8} />
                  ) : filteredDrivers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-0">
                        <EmptyState
                          icon={<Truck className="size-5" aria-hidden="true" />}
                          title={normalizedSearch ? "No drivers found" : "No drivers yet"}
                          description={
                            normalizedSearch
                              ? "Try a different search term."
                              : "Add a driver to start managing your delivery team."
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredDrivers.map((driver) => (
                      <tr key={driver.id} className="border-b">
                        <td className="px-6 py-4 font-medium whitespace-nowrap">
                          {driver.fullName}
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {driver.driverCode}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <span className="block truncate">{driver.email}</span>
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {driver.phone || "—"}
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {driver.vehicleType || "—"}
                        </td>

                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          {driver.vehiclePlateNumber || "—"}
                        </td>

                        <td className="px-6 py-4 text-center">
                          <Badge variant={driver.isActive ? "default" : "secondary"}>
                            {driver.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDialog(driver)}
                              disabled={
                                isSaving || activateDriver.isPending || deactivateDriver.isPending
                              }
                            >
                              <Edit className="size-4" aria-hidden="true" />
                              Edit
                            </Button>

                            {driver.isActive ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deactivateDriver.mutate(driver.id)}
                                disabled={activateDriver.isPending || deactivateDriver.isPending}
                              >
                                <UserX className="size-4" aria-hidden="true" />
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => activateDriver.mutate(driver.id)}
                                disabled={activateDriver.isPending || deactivateDriver.isPending}
                              >
                                <UserCheck className="size-4" aria-hidden="true" />
                                Activate
                              </Button>
                            )}
                          </div>
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
        open={driverDialogOpen}
        onOpenChange={(open) => {
          if (!isSaving) {
            setDriverDialogOpen(open);

            if (!open) {
              setEditingDriver(null);
              form.reset(emptyDriverValues);
            }
          }
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDriver ? "Edit driver" : "Add driver"}</DialogTitle>

            <DialogDescription>
              {editingDriver
                ? "Update the driver's information."
                : "Create a driver who can be assigned to shipments."}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitDriver)} className="space-y-4" noValidate>
              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full name</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. Ahmed Hassan" {...field} />
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
                      <Input type="email" placeholder="driver@example.com" {...field} />
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
                      <Input type="tel" placeholder="+201001234567" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licenseNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>License number</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. DL-458921" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehicleType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle type</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. Motorcycle" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vehiclePlateNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vehicle plate number</FormLabel>

                    <FormControl>
                      <Input placeholder="e.g. ABC-1234" {...field} />
                    </FormControl>

                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isSaving}
                  onClick={() => setDriverDialogOpen(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                      {editingDriver ? "Saving…" : "Creating…"}
                    </>
                  ) : editingDriver ? (
                    "Save changes"
                  ) : (
                    "Create driver"
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
