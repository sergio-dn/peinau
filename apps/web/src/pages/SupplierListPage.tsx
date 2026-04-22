import { useState } from 'react';
import { useSuppliers } from '@/api/suppliers';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Search, ChevronLeft, ChevronRight, Building2, Mail, Phone } from 'lucide-react';

export default function SupplierListPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useSuppliers({ search: search || undefined, page, limit: 25 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Proveedores</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por RUT o razon social..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-10"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">RUT</th>
                      <th className="text-left py-3 px-2 font-medium">Razon Social</th>
                      <th className="text-left py-3 px-2 font-medium">Giro</th>
                      <th className="text-left py-3 px-2 font-medium">Comuna</th>
                      <th className="text-left py-3 px-2 font-medium">Contacto</th>
                      <th className="text-left py-3 px-2 font-medium">Email</th>
                      <th className="text-left py-3 px-2 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data?.data?.map((supplier: any) => (
                      <tr key={supplier.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-2 font-mono text-xs">{supplier.rut}</td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">{supplier.razonSocial}</span>
                          </div>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{supplier.giro || '-'}</td>
                        <td className="py-3 px-2">{supplier.comuna || '-'}</td>
                        <td className="py-3 px-2">{supplier.contactoNombre || '-'}</td>
                        <td className="py-3 px-2">
                          {supplier.contactoEmail ? (
                            <div className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs">{supplier.contactoEmail}</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={supplier.isActive !== false ? 'success' : 'secondary'}>
                            {supplier.isActive !== false ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {data?.data?.length === 0 && (
                <EmptyState
                  icon={Building2}
                  title="Sin proveedores registrados"
                  description="Los proveedores aparecen automáticamente al sincronizar facturas desde el SII."
                />
              )}

              {data && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {data.total} proveedores encontrados
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="text-sm">Pagina {page} de {data.totalPages || 1}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= (data.totalPages || 1)}
                      onClick={() => setPage(p => p + 1)}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
