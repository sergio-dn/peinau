import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useInvoice, useInvoiceHistory, useInvoiceAssignments } from '@/api/invoices';
import { useAccounts, useCostCenters } from '@/api/accounting';
import { InvoiceHeader } from '@/components/invoices/InvoiceHeader';
import { InvoiceLineTable } from '@/components/invoices/InvoiceLineTable';
import { InvoiceActions } from '@/components/invoices/InvoiceActions';
import { RejectDialog } from '@/components/invoices/RejectDialog';
import { AssignDialog } from '@/components/invoices/AssignDialog';
import { InvoiceNotesSection } from '@/components/invoices/InvoiceNotesSection';
import { InvoiceTagsSection } from '@/components/invoices/InvoiceTagsSection';
import { AttachmentSection } from '@/components/invoices/AttachmentSection';
import { InvoiceHistoryTimeline } from '@/components/invoices/InvoiceHistoryTimeline';
import { InvoiceCategoryForm } from '@/components/invoices/InvoiceCategoryForm';
import { SplitInvoiceModal } from '@/components/invoices/SplitInvoiceModal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Avatar, AvatarFallback } from '@/components/ui/Avatar';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCLP } from '@wildlama/shared';
import { useAuthStore } from '@/stores/auth-store';
import { UserPlus, Scissors, AlertTriangle } from 'lucide-react';

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);

  const user = useAuthStore((s) => s.user);
  const canCategorize = user?.roles.some((r) => ['contabilidad', 'admin'].includes(r)) ?? false;

  const { data: invoice, isLoading } = useInvoice(id!);
  const { data: history } = useInvoiceHistory(id!);
  const { data: accounts } = useAccounts();
  const { data: costCenters } = useCostCenters();
  const { data: assignments } = useInvoiceAssignments(id!);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-12 w-96" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return <div className="text-center py-8 text-muted-foreground">Factura no encontrada</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <InvoiceHeader invoice={invoice} onBack={() => navigate('/invoices')} />

      {/* Main content: 2/3 + 1/3 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabs with main content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="detalle">
            <TabsList>
              <TabsTrigger value="detalle">Detalle</TabsTrigger>
              <TabsTrigger value="documentos">Documentos</TabsTrigger>
              <TabsTrigger value="notas">Notas y Tags</TabsTrigger>
              <TabsTrigger value="historial">Historial</TabsTrigger>
            </TabsList>

            <TabsContent value="detalle">
              {/* Banner sin CECO */}
              {invoice.state === 'recibida' && !(invoice.lines?.[0]?.costCenterId) && (
                <div className="flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 mb-4">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>
                    Esta factura no tiene CECO asignado. Asígnalo para avanzar en el flujo.
                  </span>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Detalle de la Factura</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Summary grid */}
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha Emision</p>
                      <p className="font-medium">{invoice.fechaEmision}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha Recepcion SII</p>
                      <p className="font-medium">{invoice.fechaRecepcionSii || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Neto</p>
                      <p className="font-medium">{formatCLP(Number(invoice.montoNeto))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">IVA</p>
                      <p className="font-medium">{formatCLP(Number(invoice.montoIva))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Exento</p>
                      <p className="font-medium">{formatCLP(Number(invoice.montoExento || 0))}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total</p>
                      <p className="text-xl font-bold">{formatCLP(Number(invoice.montoTotal))}</p>
                    </div>
                  </div>

                  {/* Line items table */}
                  <h4 className="font-semibold mb-3">Lineas de Detalle</h4>
                  <InvoiceLineTable
                    lines={invoice.lines || []}
                    accounts={accounts || []}
                    costCenters={costCenters || []}
                    invoiceId={id!}
                    disabled={!['recibida', 'pendiente', 'aprobada'].includes(invoice.state)}
                  />
                </CardContent>
              </Card>

              {/* Sección Imputación */}
              <Card className="mt-4">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Imputación</CardTitle>
                    {canCategorize && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSplitOpen(true)}
                      >
                        <Scissors className="mr-2 h-4 w-4" />
                        Dividir factura
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <InvoiceCategoryForm
                    invoiceId={id!}
                    currentCostCenterId={invoice.lines?.[0]?.costCenterId ?? null}
                    currentAccountCode={invoice.lines?.[0]?.account?.code ?? null}
                    companyId={invoice.companyId}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="documentos">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Documentos Adjuntos</CardTitle>
                </CardHeader>
                <CardContent>
                  <AttachmentSection invoiceId={id!} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notas">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Notas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InvoiceNotesSection invoiceId={id!} initialNotes={invoice.notes} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Tags</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <InvoiceTagsSection invoiceId={id!} />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="historial">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Historial</CardTitle>
                </CardHeader>
                <CardContent>
                  <InvoiceHistoryTimeline history={history || []} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Actions card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceActions invoice={invoice} onReject={() => setRejectOpen(true)} />
            </CardContent>
          </Card>

          {/* Assignments card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Asignados</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setAssignOpen(true)}>
                  <UserPlus className="w-4 h-4 mr-1" />
                  Asignar
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignments && assignments.length > 0 ? (
                <div className="space-y-3">
                  {assignments.map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {a.userName?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{a.userName}</p>
                        <p className="text-xs text-muted-foreground capitalize">{a.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Sin asignaciones</p>
              )}
            </CardContent>
          </Card>

          {/* Summary card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Neto</span>
                  <span>{formatCLP(Number(invoice.montoNeto))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">IVA</span>
                  <span>{formatCLP(Number(invoice.montoIva))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Exento</span>
                  <span>{formatCLP(Number(invoice.montoExento || 0))}</span>
                </div>
                <div className="border-t pt-2 flex justify-between font-bold">
                  <span>Total</span>
                  <span>{formatCLP(Number(invoice.montoTotal))}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      <RejectDialog open={rejectOpen} onOpenChange={setRejectOpen} invoiceId={id!} />
      <AssignDialog open={assignOpen} onOpenChange={setAssignOpen} invoiceId={id!} />
      <SplitInvoiceModal
        invoice={invoice}
        isOpen={splitOpen}
        onClose={() => setSplitOpen(false)}
      />
    </div>
  );
}
