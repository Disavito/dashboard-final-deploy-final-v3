import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui-custom/DataTable';
import { Loader2, FolderSearch, Search, Upload, FileWarning } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UploadDocumentModal } from '@/components/custom/UploadDocumentModal';
import DocumentLinkPill from '@/components/custom/DocumentLinkPill';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { useUser } from '@/context/UserContext';

// Define la estructura de un documento de socio
interface SocioDocumento {
  id: number;
  tipo_documento: string;
  link_documento: string | null;
  transaction_type?: string; // Added for 'Comprobante de Pago' filtering
}

// Define la información de pago obtenida de la tabla 'ingresos'
interface IngresoInfo {
  status: 'Pagado' | 'No Pagado';
  receipt_number: string | null;
}

// Estructura principal para un socio con sus documentos e información de pago
interface SocioConDocumentos {
  id: number;
  dni: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  localidad: string;
  mz: string | null; // Added mz
  lote: string | null; // Added lote
  socio_documentos: SocioDocumento[];
  paymentInfo: IngresoInfo;
}

type DocumentoRequerido = 'Planos de ubicación' | 'Memoria descriptiva';

// Helper function to determine bucket name based on document type
const getBucketNameForDocumentType = (docType: string): string => {
  switch (docType) {
    case 'Planos de ubicación':
      return 'planos'; // Assuming 'planos' is the bucket name for this type
    case 'Memoria descriptiva':
      return 'memorias'; // Assuming 'memorias' is the bucket name for this type
    // Add other cases if other document types become deletable from different buckets
    // For 'Comprobante de Pago', if it were deletable, it might be 'comprobantes' or 'documents'
    default:
      // This default should ideally not be hit for deletable types,
      // as DocumentLinkPill restricts deletion to specific types.
      // But as a fallback, or for other non-deletable types, 'documents' might be a general bucket.
      return 'documents';
  }
};

function PartnerDocuments() {
  const [sociosConDocumentos, setSociosConDocumentos] = useState<SocioConDocumentos[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocalidad, setSelectedLocalidad] = useState('all');
  const [localidades, setLocalidades] = useState<string[]>([]);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    socioId: number | null;
    socioName: string;
    documentType: DocumentoRequerido | null;
  }>({
    isOpen: false,
    socioId: null,
    socioName: '',
    documentType: null,
  });

  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    documentId: number | null;
    documentLink: string | null;
    documentType: string | null;
    socioName: string | null;
  }>({
    isOpen: false,
    documentId: null,
    documentLink: null,
    documentType: null,
    socioName: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  const { roles, loading: userLoading } = useUser();
  const isAdmin = useMemo(() => roles?.includes('admin'), [roles]);

  // AHORA INCLUIMOS 'Comprobante de Pago'
  const allowedDocumentTypes = useMemo(() => [
    "Planos de ubicación",
    "Memoria descriptiva",
    "Ficha",
    "Contrato",
    "Comprobante de Pago"
  ], []);

  const requiredDocumentTypes: DocumentoRequerido[] = useMemo(() => [
    "Planos de ubicación",
    "Memoria descriptiva"
  ], []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Obtener socios (con sus documentos anidados), localidades e ingresos
      const [sociosRes, localidadesRes, ingresosRes] = await Promise.all([
        supabase
          .from('socio_titulares')
          .select(`
            id, dni, nombres, apellidoPaterno, apellidoMaterno, localidad, mz, lote,
            socio_documentos (id, tipo_documento, link_documento)
          `)
          .order('apellidoPaterno', { ascending: true }),
        supabase.from('socio_titulares').select('localidad').neq('localidad', null),
        // Modificado para incluir transaction_type
        supabase.from('ingresos').select('dni, receipt_number, transaction_type').neq('dni', null)
      ]);

      if (sociosRes.error) throw sociosRes.error;
      if (localidadesRes.error) throw localidadesRes.error;
      if (ingresosRes.error) throw ingresosRes.error;

      const uniqueLocalidades = [...new Set(localidadesRes.data.map(item => item.localidad).filter(Boolean) as string[])];
      setLocalidades(uniqueLocalidades.sort());

      // Nuevo map para agrupar todos los ingresos por DNI
      const ingresosByDni = new Map<string, Array<{ receipt_number: string | null; transaction_type: string | null }>>();
      ingresosRes.data.forEach(ingreso => {
        if (ingreso.dni) {
          if (!ingresosByDni.has(ingreso.dni)) {
            ingresosByDni.set(ingreso.dni, []);
          }
          ingresosByDni.get(ingreso.dni)?.push({
            receipt_number: ingreso.receipt_number,
            transaction_type: ingreso.transaction_type,
          });
        }
      });

      // Nuevo map para filtrar documentos por tipo de transacción (para la columna 'Documentos')
      const receiptTransactionTypeMap = new Map<string, string>(); // Map: receipt_number -> transaction_type
      ingresosRes.data.forEach(ingreso => {
        if (ingreso.receipt_number && ingreso.transaction_type) {
          receiptTransactionTypeMap.set(ingreso.receipt_number, ingreso.transaction_type);
        }
      });

      // 2. Procesar y combinar la información
      const processedData = sociosRes.data.map(socio => {
        let validReceiptNumber: string | null = null;
        let paymentStatus: 'Pagado' | 'No Pagado' = 'No Pagado';

        const socioIngresos = ingresosByDni.get(socio.dni) || [];
        for (const ingreso of socioIngresos) {
          if (ingreso.receipt_number && (ingreso.transaction_type === 'Venta' || ingreso.transaction_type === 'Ingreso')) {
            validReceiptNumber = ingreso.receipt_number;
            paymentStatus = 'Pagado';
            break; // Encontramos un recibo válido, no necesitamos buscar más para esta columna
          }
        }

        const paymentInfo: IngresoInfo = {
          status: paymentStatus,
          receipt_number: validReceiptNumber,
        };

        const filteredSocioDocuments = socio.socio_documentos.filter(doc => {
          // Primero, filtra por los tipos de documentos permitidos y si tienen link
          if (!allowedDocumentTypes.includes(doc.tipo_documento) || !doc.link_documento) {
            return false;
          }

          // Para 'Comprobante de Pago', aplica un filtro adicional basado en transaction_type
          if (doc.tipo_documento === 'Comprobante de Pago') {
            const parts = doc.link_documento.split('/');
            const fileNameWithExtension = parts[parts.length - 1];
            const serieCorrelativo = fileNameWithExtension.replace('.pdf', '');

            const transactionType = receiptTransactionTypeMap.get(serieCorrelativo);

            // Solo mostrar si el tipo de transacción es 'Venta' o 'Ingreso'
            return transactionType === 'Venta' || transactionType === 'Ingreso';
          }

          // Para otros tipos de documentos permitidos, simplemente inclúyelos
          return true;
        }).map(doc => {
          // Opcionalmente, añade el transaction_type al objeto del documento si es un comprobante de pago
          if (doc.tipo_documento === 'Comprobante de Pago' && doc.link_documento) {
            const parts = doc.link_documento.split('/');
            const fileNameWithExtension = parts[parts.length - 1];
            const serieCorrelativo = fileNameWithExtension.replace('.pdf', '');
            const transactionType = receiptTransactionTypeMap.get(serieCorrelativo);
            return { ...doc, transaction_type: transactionType };
          }
          return doc;
        });

        // The map callback needs to return the transformed socio object
        return {
          ...socio, // Keep existing socio properties
          socio_documentos: filteredSocioDocuments, // Override with filtered documents
          paymentInfo: paymentInfo, // Add payment info
        };
      });

      setSociosConDocumentos(processedData as any);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching data:', error.message);
      setError('Error al cargar los datos. Por favor, revisa la consola para más detalles.');
      toast.error('Error al cargar datos', { description: error.message });
      setSociosConDocumentos([]);
    } finally {
      setLoading(false);
    }
  }, [allowedDocumentTypes]);


  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleOpenModal = (socio: SocioConDocumentos, documentType: DocumentoRequerido) => {
    const fullName = `${socio.nombres || ''} ${socio.apellidoPaterno || ''}`.trim();
    setModalState({
      isOpen: true,
      socioId: socio.id,
      socioName: fullName,
      documentType: documentType,
    });
  };

  const handleDeleteDocument = useCallback(async () => {
    if (!deleteConfirmState.documentId || !deleteConfirmState.documentLink || !deleteConfirmState.documentType) {
      toast.error('Error: No se pudo obtener la información completa del documento para eliminar.');
      return;
    }

    setIsDeleting(true);
    try {
      const { documentId, documentLink, documentType, socioName } = deleteConfirmState;

      // Determine the correct bucket name based on document type
      const bucketName = getBucketNameForDocumentType(documentType);
      if (!bucketName) {
        throw new Error(`No se pudo determinar el nombre del bucket para el tipo de documento: ${documentType}`);
      }

      // 1. Extract file path from URL
      const url = new URL(documentLink);
      // The pathname will be something like /storage/v1/object/public/bucket_name/path/to/file.pdf
      // We need 'path/to/file.pdf'
      const pathSegments = url.pathname.split('/');
      // Find the index of 'public'
      const publicIndex = pathSegments.indexOf('public');
      if (publicIndex === -1 || publicIndex + 2 >= pathSegments.length) {
        throw new Error('Formato de URL de documento inesperado. No se pudo encontrar el segmento "public" o el nombre del bucket.');
      }
      // The bucket name should be right after 'public'
      const extractedBucketNameFromUrl = pathSegments[publicIndex + 1];

      // Optional: Validate that the extracted bucket name matches our expected bucket name
      // This can help catch misconfigurations or unexpected URLs
      if (extractedBucketNameFromUrl !== bucketName) {
        console.warn(`Advertencia: El nombre del bucket extraído de la URL (${extractedBucketNameFromUrl}) no coincide con el esperado para el tipo de documento (${bucketName}). Procediendo con el bucket esperado.`);
      }

      // The file path starts after the bucket name
      const filePath = pathSegments.slice(publicIndex + 2).join('/');

      if (!filePath) {
        throw new Error('No se pudo extraer la ruta del archivo del enlace.');
      }

      // 2. Delete file from Supabase Storage using the determined bucket name
      const { error: storageError } = await supabase.storage
        .from(bucketName) // Use the dynamically determined bucket name
        .remove([filePath]);

      if (storageError) {
        console.error(`Error deleting file from storage bucket '${bucketName}':`, storageError);
        toast.warning(`Advertencia: No se pudo eliminar el archivo del almacenamiento (${bucketName}): ${storageError.message}`);
      }

      // 3. Delete record from socio_documentos table
      const { error: dbError } = await supabase
        .from('socio_documentos')
        .delete()
        .eq('id', documentId);

      if (dbError) {
        throw dbError;
      }

      toast.success(`Documento "${documentType}" de ${socioName} eliminado correctamente.`);
      setDeleteConfirmState({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null });
      fetchAllData(); // Refresh data
    } catch (error: any) {
      console.error('Error al eliminar el documento:', error.message);
      toast.error('Error al eliminar el documento', { description: error.message });
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirmState, fetchAllData]);

  const openDeleteConfirmDialog = useCallback((documentId: number, documentLink: string, documentType: string, socioName: string) => {
    setDeleteConfirmState({
      isOpen: true,
      documentId,
      documentLink,
      documentType,
      socioName,
    });
  }, []);

  const filteredData = useMemo(() => {
    return sociosConDocumentos.filter(socio => {
      const searchLower = searchQuery.toLowerCase().trim();
      const fullName = (`${socio.nombres || ''} ${socio.apellidoPaterno || ''} ${socio.apellidoMaterno || ''}`).toLowerCase().trim();
      const dni = (socio.dni || '').toLowerCase();
      const mz = (socio.mz || '').toLowerCase();
      const lote = (socio.lote || '').toLowerCase();
      const matchesLocalidad = selectedLocalidad === 'all' || socio.localidad === selectedLocalidad;

      if (!searchLower) return matchesLocalidad;

      const searchTerms = searchLower.split(' ').filter(term => term.length > 0);
      const matchesDni = dni.includes(searchLower);
      const matchesName = searchTerms.every(term => fullName.includes(term));
      const matchesMz = mz.includes(searchLower);
      const matchesLote = lote.includes(searchLower);

      return matchesLocalidad && (matchesDni || matchesName || matchesMz || matchesLote);
    });
  }, [sociosConDocumentos, searchQuery, selectedLocalidad]);

  const columns: ColumnDef<SocioConDocumentos>[] = useMemo(
    () => [
      {
        accessorKey: 'nombreCompleto',
        header: 'Nombre Completo',
        cell: ({ row }) => {
          const socio = row.original;
          const fullName = `${socio.nombres || ''} ${socio.apellidoPaterno || ''} ${socio.apellidoMaterno || ''}`.trim();
          return <div className="font-medium text-text">{fullName || 'N/A'}</div>;
        },
      },
      {
        accessorKey: 'dni',
        header: 'DNI',
        cell: ({ row }) => <div className="text-textSecondary">{row.getValue('dni') || 'N/A'}</div>,
      },
      {
        accessorKey: 'mz',
        header: 'Mz',
        cell: ({ row }) => <div className="text-textSecondary">{row.original.mz || 'N/A'}</div>,
      },
      {
        accessorKey: 'lote',
        header: 'Lote',
        cell: ({ row }) => <div className="text-textSecondary">{row.original.lote || 'N/A'}</div>,
      },
      {
        accessorKey: 'paymentInfo.status',
        header: 'Estado de Pago',
        cell: ({ row }) => {
          const { status } = row.original.paymentInfo;
          return (
            <Badge variant={status === 'Pagado' ? 'success' : 'destructive'}>
              {status}
            </Badge>
          );
        },
      },
      {
        accessorKey: 'paymentInfo.receipt_number',
        header: 'N° Recibo',
        cell: ({ row }) => row.original.paymentInfo.receipt_number || <span className="text-textSecondary/70 italic">N/A</span>,
      },
      {
        id: 'documentos',
        header: 'Documentos',
        cell: ({ row }) => {
          const socio = row.original;
          const { socio_documentos } = socio;

          if (socio_documentos.length === 0) {
            return <span className="text-textSecondary/70 italic text-sm">Sin documentos</span>;
          }

          return (
            <div className="flex flex-wrap gap-2 items-start">
              {socio_documentos.map((doc) => (
                <DocumentLinkPill
                  key={doc.id}
                  type={doc.tipo_documento}
                  link={doc.link_documento!}
                  isAdmin={isAdmin}
                  onDelete={() => openDeleteConfirmDialog(doc.id, doc.link_documento!, doc.tipo_documento, `${socio.nombres} ${socio.apellidoPaterno}`)}
                />
              ))}
            </div>
          );
        },
      },
      {
        id: 'acciones',
        header: 'Subir Faltantes',
        cell: ({ row }) => {
          const socio = row.original;
          const missingDocs = requiredDocumentTypes.filter(docType => {
            const doc = socio.socio_documentos.find(d => d.tipo_documento === docType);
            return !doc || !doc.link_documento;
          });

          if (missingDocs.length === 0) {
            return <span className="text-sm text-success italic">Completo</span>;
          }

          return (
            <div className="flex flex-col items-start gap-2">
              {missingDocs.map(docType => (
                <Button
                  key={docType}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1 px-2"
                  onClick={() => handleOpenModal(socio, docType)}
                >
                  <Upload className="mr-2 h-3 w-3" />
                  Subir {docType === 'Planos de ubicación' ? 'Planos' : 'Memoria'}
                </Button>
              ))}
            </div>
          );
        },
      },
    ],
    [requiredDocumentTypes, isAdmin, openDeleteConfirmDialog]
  );

  const renderContent = () => {
    if (loading || userLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-3 text-lg">Cargando socios y permisos...</p>
        </div>
      );
    }

    if (filteredData.length === 0) {
      return (
        <div className="text-center py-16 px-6 bg-surface/50 rounded-lg border-2 border-dashed border-border">
          <FileWarning className="mx-auto h-12 w-12 text-textSecondary" />
          <h3 className="mt-4 text-xl font-semibold text-text">No se encontraron socios</h3>
          <p className="mt-2 text-sm text-textSecondary">
            Prueba a cambiar los filtros de búsqueda o de localidad.
          </p>
          <p className="mt-1 text-xs text-textSecondary/70">
            (Si esperabas ver datos, verifica que tu rol tenga permisos para acceder a los titulares).
          </p>
        </div>
      );
    }

    return <DataTable columns={columns} data={filteredData} />;
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background text-text font-sans flex items-center justify-center">
        <p className="text-destructive text-lg text-center p-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text font-sans p-6">
      <header className="relative h-48 md:h-64 flex items-center justify-center overflow-hidden bg-gradient-to-br from-accent to-primary rounded-xl shadow-lg mb-8">
        <img
          src="https://images.pexels.com/photos/1181352/pexels-photo-1181352.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Document organization"
          className="absolute inset-0 w-full h-full object-cover opacity-20"
        />
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg leading-tight">
            Documentos de Socios
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white text-opacity-90 max-w-2xl mx-auto">
            Filtra, busca y accede a la documentación clave de cada socio.
          </p>
        </div>
      </header>

      <div className="container mx-auto py-10">
        <Card className="bg-surface rounded-xl shadow-lg border-border">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-2xl font-bold text-primary flex items-center gap-3">
              <FolderSearch className="h-7 w-7" />
              Socio y Documentos
            </CardTitle>
            <CardDescription className="text-textSecondary pt-1">
              Tabla de socios con enlaces directos a sus documentos, estado de pago y filtros de búsqueda.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
              <div className="relative w-full md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-textSecondary" />
                <Input
                  placeholder="Buscar por DNI, nombre, apellidos, Mz o Lote..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full bg-background border-border rounded-lg focus:ring-2 focus:ring-primary"
                />
              </div>
              <Select value={selectedLocalidad} onValueChange={setSelectedLocalidad}>
                <SelectTrigger className="w-full md:w-[220px] bg-background border-border rounded-lg focus:ring-2 focus:ring-primary">
                  <SelectValue placeholder="Filtrar por localidad" />
                </SelectTrigger>
                <SelectContent className="border-border bg-surface">
                  <SelectItem value="all">Todas las localidades</SelectItem>
                  {localidades.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {renderContent()}
          </CardContent>
        </Card>
      </div>
      <UploadDocumentModal
        isOpen={modalState.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setModalState({ isOpen: false, socioId: null, socioName: '', documentType: null });
          }
        }}
        socioId={modalState.socioId}
        socioName={modalState.socioName}
        documentType={modalState.documentType}
        onUploadSuccess={() => {
          toast.info('Actualizando la tabla de documentos...');
          fetchAllData(); // Re-fetch data to show the new document
        }}
      />
      <ConfirmationDialog
        isOpen={deleteConfirmState.isOpen}
        onClose={() => setDeleteConfirmState({ isOpen: false, documentId: null, documentLink: null, documentType: null, socioName: null })}
        onConfirm={handleDeleteDocument}
        title="Confirmar Eliminación de Documento"
        description={`¿Estás seguro de que quieres eliminar el documento "${deleteConfirmState.documentType}" de ${deleteConfirmState.socioName}? Esta acción es irreversible y eliminará el archivo del almacenamiento.`}
        data={{
          'Tipo de Documento': deleteConfirmState.documentType,
          'Socio': deleteConfirmState.socioName,
        }}
        confirmButtonText="Eliminar Documento"
        isConfirming={isDeleting}
      />
    </div>
  );
}

export default PartnerDocuments;
