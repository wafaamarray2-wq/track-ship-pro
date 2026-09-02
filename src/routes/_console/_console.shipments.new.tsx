import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { authApi } from "@/api/authApi";
import { merchantsApi } from "@/api/merchantsApi";
import { shipmentsApi } from "@/api/shipmentsApi";
import { UserRole, type CreateShipmentRequest } from "@/api/types";
import { PageHeader } from "@/components/common/page-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/_console/_console/shipments/new")({
  head: () => ({
    meta: [
      { title: "Create shipment — TrackFlow" },
      {
        name: "description",
        content: "Create a new shipment with merchant, recipient, package, and route details.",
      },
      { property: "og:title", content: "Create shipment — TrackFlow" },
      {
        property: "og:description",
        content: "Register a new shipment and start tracking it immediately.",
      },
    ],
  }),
  component: CreateShipmentPage,
});

const addressSchema = z.object({
  line1: z.string().trim().min(3, "Street address is required").max(160),
  city: z.string().trim().min(2, "City is required").max(80),
  state: z.string().trim().min(2, "State or region is required").max(80),
  postalCode: z.string().trim().min(3, "Postal code is required").max(20),
  country: z.string().trim().min(2, "Country is required").max(80),
});

const schema = z.object({
  merchantId: z.string().min(1, "Select a merchant"),
  recipientName: z.string().trim().min(2, "Recipient name is required").max(120),
  recipientPhone: z.string().trim().min(7, "Enter a valid phone number").max(30),
  recipientEmail: z.string().trim().email("Enter a valid email address").max(255),
  packageDescription: z.string().trim().min(3, "Describe the package contents").max(200),
  weightKg: z.coerce
    .number()
    .positive("Weight must be greater than 0")
    .max(1000, "Weight must be under 1000 kg"),
  referenceNumber: z.string().trim().max(60).optional(),
  origin: addressSchema,
  destination: addressSchema,
  expectedDeliveryDate: z.string().min(1, "Expected delivery date is required"),
  notes: z.string().trim().max(500).optional(),
});

type FormValues = z.input<typeof schema>;

const emptyAddress = { line1: "", city: "", state: "", postalCode: "", country: "United States" };

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function CreateShipmentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [apiError, setApiError] = useState<string | null>(null);

  const currentUser = authApi.getCachedUser();

  const isMerchantUser = currentUser?.role === UserRole.MerchantUser;

  const merchants = useQuery({
    queryKey: ["merchants", "options"],
    queryFn: () => merchantsApi.options(),
    enabled: !isMerchantUser,
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      merchantId: isMerchantUser ? (currentUser?.merchantId ?? "") : "",
      recipientName: "",
      recipientPhone: "",
      recipientEmail: "",
      packageDescription: "",
      weightKg: 1,
      referenceNumber: "",
      origin: { ...emptyAddress },
      destination: { ...emptyAddress },
      expectedDeliveryDate: "",
      notes: "",
    },
  });

  const mutation = useMutation({
    mutationFn: (payload: CreateShipmentRequest) => shipmentsApi.create(payload),
    onSuccess: (shipment) => {
      void queryClient.invalidateQueries({ queryKey: ["shipments"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Shipment created", {
        description: `Tracking number ${shipment.trackingNumber}`,
      });
      void navigate({ to: "/shipments/$shipmentId", params: { shipmentId: shipment.id } });
    },
    onError: (error: Error) => setApiError(error.message),
  });

  const onSubmit = (values: FormValues) => {
    setApiError(null);
    const parsed = schema.parse(values);
    mutation.mutate({
      merchantId: parsed.merchantId,
      recipient: {
        name: parsed.recipientName,
        phone: parsed.recipientPhone,
        email: parsed.recipientEmail,
      },
      package: {
        description: parsed.packageDescription,
        weightKg: parsed.weightKg,
        referenceNumber: parsed.referenceNumber || undefined,
      },
      origin: parsed.origin,
      destination: parsed.destination,
      expectedDeliveryDate: new Date(parsed.expectedDeliveryDate).toISOString(),
      notes: parsed.notes || undefined,
    });
  };

  const addressFields = (prefix: "origin" | "destination") =>
    (
      [
        ["line1", "Street address", "sm:col-span-2"],
        ["city", "City", ""],
        ["state", "State / region", ""],
        ["postalCode", "Postal code", ""],
        ["country", "Country", ""],
      ] as const
    ).map(([name, label, className]) => (
      <FormField
        key={`${prefix}.${name}`}
        control={form.control}
        name={`${prefix}.${name}` as const}
        render={({ field }) => (
          <FormItem className={className}>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    ));

  return (
    <>
      <PageHeader
        title="Create shipment"
        description="Register a new shipment and begin tracking it immediately."
        actions={
          <Button asChild variant="outline">
            <Link to="/shipments">Back to shipments</Link>
          </Button>
        }
      />

      {apiError ? (
        <Alert variant="destructive">
          <AlertDescription>{apiError}</AlertDescription>
        </Alert>
      ) : null}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Section title="Merchant" description="The merchant this shipment belongs to.">
            <FormField
              control={form.control}
              name="merchantId"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Merchant</FormLabel>

                  {isMerchantUser ? (
                    <FormControl>
                      <Input value={currentUser?.merchantId ?? ""} readOnly disabled />
                    </FormControl>
                  ) : (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={
                              merchants.isPending ? "Loading merchants…" : "Select a merchant"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>

                      <SelectContent>
                        {(merchants.data ?? [])
                          .filter((merchant) => merchant.isActive)
                          .map((merchant) => (
                            <SelectItem key={merchant.id} value={String(merchant.id)}>
                              {merchant.companyName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Recipient" description="Who receives the package.">
            <FormField
              control={form.control}
              name="recipientName"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipientPhone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input type="tel" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipientEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Package" description="Contents and handling details.">
            <FormField
              control={form.control}
              name="packageDescription"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Package description</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="weightKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weight (kg)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="referenceNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference number (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="PO-12345" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <Section title="Origin" description="Where the shipment is collected.">
            {addressFields("origin")}
          </Section>

          <Section title="Destination" description="Where the shipment is delivered.">
            {addressFields("destination")}
          </Section>

          <Section title="Delivery" description="Delivery expectations and handling notes.">
            <FormField
              control={form.control}
              name="expectedDeliveryDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected delivery date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>Delivery notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Access codes, drop-off instructions…"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </Section>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Creating shipment…
                </>
              ) : (
                "Create shipment"
              )}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => void navigate({ to: "/shipments" })}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
}
