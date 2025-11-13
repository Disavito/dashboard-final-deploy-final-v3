import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ColumnDef,
  Row,
} from '@tanstack/react-table';
import { ArrowUpDown, PlusCircle, Loader2, Edit, Trash2, Search, ChevronDown, Check, FileText } from 'lucide-react'; // Added FileText icon
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Tables } from '@/lib/database.types'; // Import Tables type
import SocioTitularRegistrationForm from '@/components/custom/SocioTitularRegistrationForm';
import ConfirmationDialog from '@/components/ui-custom/ConfirmationDialog';
import { DataTable } from '@/components/ui-custom/DataTable';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

// Define el tipo base SocioTitular desde la base de datos
type SocioTitularBase = Tables<'socio_titulares'>;

// Extiende el tipo SocioTitular con propiedades derivadas para el componente
interface SocioTitular extends SocioTitularBase {
  isActive: boolean;
  receiptNumber: string | null; // Para almacenar el número de recibo de pago
}

function People() {
  console.log("People component is rendering.");
  const [socios, setSocios] = useState<SocioTitular[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRegistrationDialogOpen, setIsRegistrationDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [socioToDelete, setSocioToDelete] = useState<SocioTitular | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [globalFilter, setGlobalFilter] = useState('');

  // State for locality filter
  const [uniqueLocalities, setUniqueLocalities] = useState<string[]>([]);
  const [selectedLocalidadFilter, setSelectedLocalidadFilter] = useState<string>('all'); // 'all' for no filter
  const [openLocalitiesFilterPopover, setOpenLocalitiesFilterPopover] = useState(false);

  // New state for active/inactive filter
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [openStatusFilterPopover, setOpenStatusFilterPopover] = useState(false);

  // State for editing socio in a dialog
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [socioToEdit, setSocioToEdit] = useState<SocioTitular | null>(null);

  // State for data displayed in the table, pre-filtered by locality and status
  const [displaySocios, setDisplaySocios] = useState<SocioTitular[]>([]);


  const fetchSocios = useCallback(async () => {
    if (!supabase) {
      setError("Supabase client no disponible. Por favor, verifica tus variables de entorno.");
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1. Fetch all socios
    const { data: sociosData, error: sociosError } = await supabase
      .from('socio_titulares')
      .select('*') // Select all columns including mz, lote, celular
      .order('apellidoPaterno', { ascending: true });

    if (sociosError) {
      console.error('Error fetching socios:', sociosError.message);
      setError('Error al cargar los socios. Por favor, inténtalo de nuevo.');
      setSocios([]);
      toast.error('Error al cargar socios', { description: sociosError.message });
      setLoading(false);
      return;
    }

    // 2. Fetch all incomes to determine active status AND receipt numbers
    const { data: incomesData, error: incomesError } = await supabase
      .from('ingresos')
      .select('dni, amount, transaction_type, receipt_number'); // Select receipt_number

    if (incomesError) {
      console.error('Error fetching incomes for active status:', incomesError.message);
      toast.error('Error al cargar ingresos para determinar estado de actividad', { description: incomesError.message });
      // Proceed with sociosData without active status if incomes can't be fetched
    }

    const incomeMap = new Map<string, { hasPositive: boolean, hasNegative: boolean, totalCount: number, latestPositiveReceipt: string | null }>();

    if (incomesData) {
      for (const income of incomesData) {
        if (income.dni) {
          const currentStatus = incomeMap.get(income.dni) || { hasPositive: false, hasNegative: false, totalCount: 0, latestPositiveReceipt: null };
          if (income.amount && income.amount > 0) {
            currentStatus.hasPositive = true;
            // Store the receipt number if it's a positive income
            if (income.receipt_number) {
              currentStatus.latestPositiveReceipt = income.receipt_number;
            }
          } else if (income.amount && income.amount < 0) {
            currentStatus.hasNegative = true;
          }
          currentStatus.totalCount++;
          incomeMap.set(income.dni, currentStatus);
        }
      }
    }

    // 3. Enrich socios with isActive status and receiptNumber
    const enrichedSocios: SocioTitular[] = (sociosData || []).map(socio => {
      const incomeStatus = socio.dni ? incomeMap.get(socio.dni) : undefined;
      let isActive = true;
      let receiptNumber: string | null = null; // Initialize receipt number

      if (!incomeStatus || incomeStatus.totalCount === 0) {
        isActive = true;
      } else if (incomeStatus.hasPositive) {
        isActive = true;
        receiptNumber = incomeStatus.latestPositiveReceipt; // Assign the stored receipt number
      } else if (incomeStatus.hasNegative && !incomeStatus.hasPositive) {
        isActive = false;
      }

      return { ...socio, isActive, receiptNumber }; // Add receiptNumber
    });

    setSocios(enrichedSocios);
    setError(null);
    setLoading(false);
  }, []);

  // Fetch unique localities for the filter dropdown
  const fetchUniqueLocalities = useCallback(async () => {
    if (!supabase) {
      console.error("Supabase client no disponible para localidades.");
      return;
    }
    const { data, error } = await supabase
      .from('socio_titulares')
      .select('localidad')
      .neq('localidad', '') // Exclude empty strings
      .order('localidad', { ascending: true });

    if (error) {
      console.error('Error fetching unique localities for filter:', error.message);
      toast.error('Error al cargar localidades para el filtro', { description: error.message });
    } else if (data) {
      const unique = Array.from(new Set(data.map(item => item.localidad))).filter(Boolean) as string[];
      setUniqueLocalities(['Todas las Comunidades', ...unique]); // Add 'All' option
    }
  }, []);

  useEffect(() => {
    const initFetch = async () => {
      try {
        await fetchSocios();
        await fetchUniqueLocalities();
      } catch (e: any) {
        console.error("Unhandled error during initial data fetch in People component:", e);
        setError(`Error crítico al cargar datos: ${e.message || 'Desconocido'}. Por favor, revisa tu conexión a Supabase y las variables de entorno.`);
        setLoading(false);
      }
    };
    initFetch();
  }, [fetchSocios, fetchUniqueLocalities]);

  // Effect to filter socios based on selectedLocalidadFilter AND selectedStatusFilter
  useEffect(() => {
    let filtered = socios;

    if (selectedLocalidadFilter !== 'all') {
      filtered = filtered.filter(socio => socio.localidad?.toLowerCase() === selectedLocalidadFilter.toLowerCase());
    }

    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(socio => socio.isActive === (selectedStatusFilter === 'active'));
    }
    setDisplaySocios(filtered);
  }, [socios, selectedLocalidadFilter, selectedStatusFilter]);


  const handleDeleteSocio = async () => {
    if (!socioToDelete) return;

    setIsDeleting(true);
    const { error } = await supabase
      .from('socio_titulares')
      .delete()
      .eq('id', socioToDelete.id);

    if (error) {
      console.error('Error deleting socio:', error.message);
      toast.error('Error al eliminar socio', { description: error.message });
    } else {
      toast.success('Socio eliminado', { description: `El socio ${socioToDelete.nombres} ${socioToDelete.apellidoPaterno} ha sido eliminado.` });
      fetchSocios();
      setIsDeleteDialogOpen(false);
      setSocioToDelete(null);
    }
    setIsDeleting(false);
  };

  const columns: ColumnDef<SocioTitular>[] = useMemo(
    () => [
      {
        accessorKey: 'dni',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            DNI
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div className="font-medium">{row.getValue('dni')}</div>,
      },
      {
        accessorKey: 'nombres',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Nombres
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('nombres')}</div>,
      },
      {
        accessorKey: 'apellidoPaterno',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Apellido Paterno
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('apellidoPaterno')}</div>,
      },
      {
        accessorKey: 'apellidoMaterno',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Apellido Materno
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <div>{row.getValue('apellidoMaterno')}</div>,
      },
      {
        accessorKey: 'celular',
        header: 'Celular',
        cell: ({ row }) => <div>{row.getValue('celular') || 'N/A'}</div>,
      },
      {
        accessorKey: 'localidad',
        header: 'Localidad',
        cell: ({ row }) => <div>{row.getValue('localidad') || 'N/A'}</div>,
      },
      {
        accessorKey: 'mz',
        header: 'Mz',
        cell: ({ row }) => <div>{row.original.mz || 'N/A'}</div>,
      },
      {
        accessorKey: 'lote',
        header: 'Lote',
        cell: ({ row }) => <div>{row.original.lote || 'N/A'}</div>,
      },
      {
        accessorKey: 'receiptNumber',
        header: 'N° Recibo',
        cell: ({ row }) => <div>{row.original.receiptNumber || 'N/A'}</div>,
      },
      {
        accessorKey: 'isActive', // New column for active status
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="text-text hover:text-primary"
          >
            Estado
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-semibold",
              row.getValue('isActive') ? "bg-success/20 text-success" : "bg-error/20 text-error"
            )}
          >
            {row.getValue('isActive') ? 'Activo' : 'Inactivo'}
          </span>
        ),
      },
      {
        id: 'actions',
        enableHiding: false,
        cell: ({ row }) => {
          const socio = row.original;
          return (
            <div className="flex space-x-2">
              <Button
                variant="ghost"
                size="icon"
                className="text-accent hover:bg-accent/10"
                onClick={() => {
                  setSocioToEdit(socio);
                  setIsEditDialogOpen(true);
                }}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => {
                  setSocioToDelete(socio);
                  setIsDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    []
  );

  // Custom global filter function for DataTable
  const customGlobalFilterFn = useCallback((row: Row<SocioTitular>, _columnId: string, filterValue: any) => {
    const search = String(filterValue).toLowerCase().trim();
    if (!search) return true; // If search is empty, show all rows

    const socio = row.original;

    const dni = socio.dni?.toLowerCase() || '';
    const nombres = socio.nombres?.toLowerCase() || '';
    const apellidoPaterno = socio.apellidoPaterno?.toLowerCase() || '';
    const apellidoMaterno = socio.apellidoMaterno?.toLowerCase() || '';
    const celular = socio.celular?.toLowerCase() || '';
    const localidad = socio.localidad?.toLowerCase() || '';
    const mz = socio.mz?.toLowerCase() || '';
    const lote = socio.lote?.toLowerCase() || '';
    const receiptNumber = socio.receiptNumber?.toLowerCase() || '';


    // Individual field search
    if (
      dni.includes(search) ||
      nombres.includes(search) ||
      apellidoPaterno.includes(search) ||
      apellidoMaterno.includes(search) ||
      celular.includes(search) ||
      localidad.includes(search) ||
      mz.includes(search) ||
      lote.includes(search) ||
      receiptNumber.includes(search)
    ) {
      return true;
    }

    // Combined search: "nombre y apellido paterno y materno"
    const fullName = `${nombres} ${apellidoPaterno} ${apellidoMaterno}`.toLowerCase().trim();
    if (fullName.includes(search)) {
      return true;
    }

    // Combined search: "apellido paterno y materno"
    const fullLastName = `${apellidoPaterno} ${apellidoMaterno}`.toLowerCase().trim();
    if (fullLastName.includes(search)) {
      return true;
    }

    return false;
  }, []);

  // Function to export data to CSV
  const exportToCsv = (data: SocioTitular[], filename: string) => {
    if (data.length === 0) {
      toast.info('No hay datos para exportar.');
      return;
    }

    // Headers for the CSV file, matching the requested fields and order
    const headers = [
      'DNI',
      'Nombres Completos',
      'Celular',
      'Localidad',
      'Lote',
      'Manzana (Mz)',
      'Dirección (Vivienda)',
      'N° Recibo',
      'Estado (Activo/Inactivo)',
    ];

    const csvRows = [headers.join(',')];

    data.forEach(socio => {
      // Construct the row with the requested fields
      const row = [
        `"${socio.dni || ''}"`,
        `"${[socio.nombres, socio.apellidoPaterno, socio.apellidoMaterno].filter(Boolean).join(' ') || ''}"`, // Nombres completos
        `"${socio.celular || ''}"`,
        `"${socio.localidad || ''}"`,
        `"${socio.lote || ''}"`,
        `"${socio.mz || ''}"`,
        `"${socio.direccionVivienda || ''}"`, // Dirección (Vivienda)
        `"${socio.receiptNumber || ''}"`,
        `"${socio.isActive ? 'Activo' : 'Inactivo'}"`, // Estado
      ];
      csvRows.push(row.map(field => field.replace(/"/g, '""')).join(',')); // Escape double quotes
    });

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Datos exportados a CSV correctamente.');
    } else {
      toast.error('Tu navegador no soporta la descarga de archivos.');
    }
  };

  const handleExportCsv = () => {
    // Apply global filter to the already locality/status filtered data
    const filteredForExport = displaySocios.filter(socio =>
      customGlobalFilterFn({ original: socio } as Row<SocioTitular>, '', globalFilter)
    );
    exportToCsv(filteredForExport, 'socios_titulares.csv');
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-background text-text font-sans flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="ml-4 text-lg">Cargando socios...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background text-text font-sans flex items-center justify-center">
        <p className="text-destructive text-lg text-center p-4">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-text font-sans p-6">
      <header className="relative h-48 md:h-64 flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-secondary rounded-xl shadow-lg mb-8">
        <img
          src="https://images.pexels.com/photos/3184433/pexels-photo-3184433.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
          alt="Community building"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="relative z-10 text-center p-4">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg leading-tight">
            Gestión de Socios Titulares
          </h1>
          <p className="mt-2 text-lg md:text-xl text-white text-opacity-90 max-w-2xl mx-auto">
            Administra la información de todos los socios registrados.
          </p>
        </div>
      </header>

      <div className="container mx-auto py-10 bg-surface rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="relative flex items-center w-full max-w-md">
            <Search className="absolute left-3 h-5 w-5 text-textSecondary" />
            <Input
              placeholder="Buscar por DNI, nombres, apellidos, celular, Mz, Lote o N° Recibo..."
              value={globalFilter ?? ''}
              onChange={(event) => setGlobalFilter(event.target.value)}
              className="pl-10 pr-4 py-2 rounded-lg border-border bg-background text-foreground focus:ring-primary focus:border-primary transition-all duration-300 w-full"
            />
          </div>

          {/* Locality Filter */}
          <Popover open={openLocalitiesFilterPopover} onOpenChange={setOpenLocalitiesFilterPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openLocalitiesFilterPopover}
                className="w-full md:w-[200px] justify-between rounded-lg border-border bg-background text-foreground hover:bg-muted/50 transition-all duration-300"
              >
                {selectedLocalidadFilter === 'all'
                  ? "Todas las Comunidades"
                  : uniqueLocalities.find(loc => loc.toLowerCase() === selectedLocalidadFilter.toLowerCase()) || selectedLocalidadFilter}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border rounded-xl shadow-lg">
              <Command>
                <CommandInput placeholder="Buscar comunidad..." className="h-9" />
                <CommandList>
                  <CommandEmpty>No se encontró comunidad.</CommandEmpty>
                  <CommandGroup>
                    {uniqueLocalities.map((loc) => (
                      <CommandItem
                        value={loc}
                        key={loc}
                        onSelect={(currentValue) => {
                          setSelectedLocalidadFilter(currentValue === 'Todas las Comunidades' ? 'all' : currentValue);
                          setOpenLocalitiesFilterPopover(false);
                        }}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedLocalidadFilter === (loc === 'Todas las Comunidades' ? 'all' : loc) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {loc}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Status Filter */}
          <Popover open={openStatusFilterPopover} onOpenChange={setOpenStatusFilterPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={openStatusFilterPopover}
                className="w-full md:w-[200px] justify-between rounded-lg border-border bg-background text-foreground hover:bg-muted/50 transition-all duration-300"
              >
                {selectedStatusFilter === 'all'
                  ? "Todos los Estados"
                  : selectedStatusFilter === 'active' ? "Activos" : "Inactivos"}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0 bg-card border-border rounded-xl shadow-lg">
              <Command>
                <CommandList>
                  <CommandGroup>
                    {['Todos los Estados', 'Activos', 'Inactivos'].map((statusOption) => (
                      <CommandItem
                        value={statusOption}
                        key={statusOption}
                        onSelect={(currentValue) => {
                          setSelectedStatusFilter(
                            currentValue === 'Todos los Estados' ? 'all' :
                            currentValue === 'Activos' ? 'active' : 'inactive'
                          );
                          setOpenStatusFilterPopover(false);
                        }}
                        className="cursor-pointer hover:bg-muted/50"
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            selectedStatusFilter === (
                              statusOption === 'Todos los Estados' ? 'all' :
                              statusOption === 'Activos' ? 'active' : 'inactive'
                            ) ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {statusOption}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          {/* Export to CSV Button */}
          <Button
            onClick={handleExportCsv}
            className="rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/90 transition-all duration-300 flex items-center gap-2 w-full md:w-auto"
          >
            <FileText className="h-5 w-5" />
            Exportar a CSV
          </Button>

          {/* Dialog for New Socio Registration */}
          <Dialog open={isRegistrationDialogOpen} onOpenChange={setIsRegistrationDialogOpen}>
            <DialogTrigger asChild>
              <Button className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center gap-2 w-full md:w-auto">
                <PlusCircle className="h-5 w-5" />
                Registrar Nuevo Socio
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] bg-card text-text border-border rounded-xl shadow-2xl p-6">
              <DialogHeader>
                <DialogTitle className="text-3xl font-bold text-primary">Registrar Socio Titular</DialogTitle>
                <DialogDescription className="text-textSecondary">
                  Completa los datos para registrar un nuevo socio.
                </DialogDescription>
              </DialogHeader>
              <SocioTitularRegistrationForm
                onClose={() => setIsRegistrationDialogOpen(false)}
                onSuccess={() => {
                  setIsRegistrationDialogOpen(false);
                  fetchSocios();
                  fetchUniqueLocalities(); // Re-fetch localities after new registration
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        <DataTable
          columns={columns}
          data={displaySocios} // Pass the pre-filtered data
          globalFilter={globalFilter}
          setGlobalFilter={setGlobalFilter}
          customGlobalFilterFn={customGlobalFilterFn} // This now handles combined text search
        />
      </div>

      {/* Dialog for Editing Socio */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[800px] bg-card text-text border-border rounded-xl shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-3xl font-bold text-primary">Editar Socio Titular</DialogTitle>
            <DialogDescription className="text-textSecondary">
              Actualiza los datos del socio existente.
            </DialogDescription>
          </DialogHeader>
          {socioToEdit && ( // Only render form if socioToEdit is available
            <SocioTitularRegistrationForm
              socioId={socioToEdit.id}
              onClose={() => {
                setIsEditDialogOpen(false);
                setSocioToEdit(null); // Clear socioToEdit when dialog closes
              }}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSocioToEdit(null); // Clear socioToEdit on success
                fetchSocios();
                fetchUniqueLocalities(); // Re-fetch localities after update
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <ConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteSocio}
        title="Confirmar Eliminación"
        description={`¿Estás seguro de que deseas eliminar al socio ${socioToDelete?.nombres} ${socioToDelete?.apellidoPaterno}? Esta acción no se puede deshacer.`}
        confirmButtonText="Eliminar"
        isConfirming={isDeleting}
        data={socioToDelete || {}}
      />
    </div>
  );
}

export default People;
