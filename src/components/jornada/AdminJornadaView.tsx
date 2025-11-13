import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query'; // Removed useQueryClient
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns';
import { es } from 'date-fns/locale';
import { getAdminJornadas, getAllColaboradores, Jornada, Colaborador } from '@/lib/api/jornadaApi';
import { Calendar as CalendarIcon, Loader2, AlertCircle, Users, CalendarDays, GanttChartSquare, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import EditJornadaModal from './EditJornadaModal';

type JornadaWithColaborador = Jornada & { colaboradores: Colaborador | null };

const AdminJornadaView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [filterType, setFilterType] = useState<'day' | 'week' | 'month'>('day');
  const [selectedColaboradorId, setSelectedColaboradorId] = useState<string>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedJornada, setSelectedJornada] = useState<JornadaWithColaborador | null>(null);
  // const queryClient = useQueryClient(); // Removed as it's not used here

  const { startDate, endDate } = useMemo(() => {
    const start =
      filterType === 'week'
        ? startOfWeek(selectedDate, { weekStartsOn: 1 })
        : filterType === 'month'
        ? startOfMonth(selectedDate)
        : selectedDate;
    const end =
      filterType === 'week'
        ? endOfWeek(selectedDate, { weekStartsOn: 1 })
        : filterType === 'month'
        ? endOfMonth(selectedDate)
        : selectedDate;
    return {
      startDate: format(start, 'yyyy-MM-dd'),
      endDate: format(end, 'yyyy-MM-dd'),
    };
  }, [selectedDate, filterType]);

  const { data: colaboradores, isLoading: isLoadingColaboradores } = useQuery({
    queryKey: ['allColaboradores'],
    queryFn: getAllColaboradores,
  });

  const { data: jornadas, isLoading, isError, error } = useQuery({
    queryKey: ['adminJornadas', startDate, endDate, selectedColaboradorId],
    queryFn: () => getAdminJornadas({ startDate, endDate, colaboradorId: selectedColaboradorId }),
  });

  const handleEditClick = (jornada: JornadaWithColaborador) => {
    setSelectedJornada(jornada);
    setIsModalOpen(true);
  };

  const getStatus = (jornada: JornadaWithColaborador): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    if (jornada.hora_fin_jornada) return { text: 'Finalizada', variant: 'default' };
    if (jornada.hora_fin_almuerzo) return { text: 'Trabajando', variant: 'secondary' };
    if (jornada.hora_inicio_almuerzo) return { text: 'En Almuerzo', variant: 'outline' };
    if (jornada.hora_inicio_jornada) return { text: 'Trabajando', variant: 'secondary' };
    return { text: 'Ausente', variant: 'destructive' };
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return format(parseISO(isoString), 'HH:mm');
  };

  const calculateWorkedHours = (jornada: Jornada): string => {
    const { hora_inicio_jornada, hora_fin_jornada, hora_inicio_almuerzo, hora_fin_almuerzo } = jornada;

    if (!hora_inicio_jornada || !hora_fin_jornada) {
      return '--:--';
    }

    const startWork = parseISO(hora_inicio_jornada);
    const endWork = parseISO(hora_fin_jornada);
    let totalMinutes = differenceInMinutes(endWork, startWork);

    if (hora_inicio_almuerzo && hora_fin_almuerzo) {
      const startLunch = parseISO(hora_inicio_almuerzo);
      const endLunch = parseISO(hora_fin_almuerzo);
      const lunchMinutes = differenceInMinutes(endLunch, startLunch);
      totalMinutes -= lunchMinutes;
    }

    if (totalMinutes < 0) totalMinutes = 0;

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
  };

  const renderDateRange = () => {
    if (filterType === 'day') return format(selectedDate, "PPP", { locale: es });
    if (filterType === 'week') return `Semana del ${format(parseISO(startDate), "d 'de' LLL", { locale: es })} al ${format(parseISO(endDate), "d 'de' LLL, yyyy", { locale: es })}`;
    if (filterType === 'month') return format(selectedDate, "LLLL yyyy", { locale: es });
    return 'Elige una fecha';
  };

  return (
    <>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-card">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Colaborador</label>
            <Select
              value={selectedColaboradorId}
              onValueChange={setSelectedColaboradorId}
              disabled={isLoadingColaboradores}
            >
              <SelectTrigger className="w-full">
                <Users className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Seleccionar colaborador" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los colaboradores</SelectItem>
                {colaboradores?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} {c.apellidos}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Fecha de Referencia</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-full justify-start text-left font-normal")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  <span>{renderDateRange()}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => setSelectedDate(d || new Date())}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-muted-foreground">Agrupar por</label>
            <ToggleGroup 
              type="single" 
              value={filterType} 
              onValueChange={(value) => {
                if (value) setFilterType(value as 'day' | 'week' | 'month');
              }}
              className="w-full grid grid-cols-3"
            >
              <ToggleGroupItem value="day" aria-label="Ver por día">
                <CalendarDays className="h-4 w-4 mr-2" /> Día
              </ToggleGroupItem>
              <ToggleGroupItem value="week" aria-label="Ver por semana">
                <GanttChartSquare className="h-4 w-4 mr-2" /> Semana
              </ToggleGroupItem>
              <ToggleGroupItem value="month" aria-label="Ver por mes">
                <CalendarIcon className="h-4 w-4 mr-2" /> Mes
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="ml-2">Cargando registros...</p>
          </div>
        )}

        {isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error instanceof Error ? error.message : 'Ocurrió un error desconocido'}</AlertDescription>
          </Alert>
        )}

        {!isLoading && !isError && (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-center">Inicio Jornada</TableHead>
                  <TableHead className="text-center">Inicio Almuerzo</TableHead>
                  <TableHead className="text-center">Fin Almuerzo</TableHead>
                  <TableHead className="text-center">Fin Jornada</TableHead>
                  <TableHead className="text-right">Horas Trab.</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jornadas && jornadas.length > 0 ? (
                  jornadas.map((jornada) => (
                    <TableRow key={jornada.id}>
                      <TableCell className="font-medium">{jornada.colaboradores?.name} {jornada.colaboradores?.apellidos}</TableCell>
                      <TableCell>{format(parseISO(jornada.fecha), "PPP", { locale: es })}</TableCell>
                      <TableCell><Badge variant={getStatus(jornada).variant}>{getStatus(jornada).text}</Badge></TableCell>
                      <TableCell className="text-center">{formatTime(jornada.hora_inicio_jornada)}</TableCell>
                      <TableCell className="text-center">{formatTime(jornada.hora_inicio_almuerzo)}</TableCell>
                      <TableCell className="text-center">{formatTime(jornada.hora_fin_almuerzo)}</TableCell>
                      <TableCell className="text-center">{formatTime(jornada.hora_fin_jornada)}</TableCell>
                      <TableCell className="text-right font-mono">{calculateWorkedHours(jornada)}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(jornada)}>
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Editar Jornada</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="h-24 text-center">
                      No se encontraron registros para los filtros seleccionados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {selectedJornada && (
        <EditJornadaModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          jornada={selectedJornada}
          onSuccess={() => {
            setIsModalOpen(false);
            // La invalidación ya se hace dentro del modal, no es necesario aquí.
          }}
        />
      )}
    </>
  );
};

export default AdminJornadaView;
