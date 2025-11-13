import { Tables } from './database.types';

// Re-export all types defined in the form subdirectory
export * from './types/form';

// Definición de tipos para las tablas usadas en la aplicación
export type Ingreso = Tables<'ingresos'> & {
  // Incluye la relación con socio_titulares para la localidad
  socio_titulares?: Tables<'socio_titulares'> | null;
};
export type Cuenta = Tables<'cuentas'>;
export type Colaborador = Tables<'colaboradores'>;
export type SocioTitular = Tables<'socio_titulares'> & {
  isActive?: boolean; // Added for active/inactive categorization
};

// Missing types based on application usage:
/**
 * Represents an expense record, mapped to the 'gastos' Supabase table.
 */
export type Gasto = Tables<'gastos'>;

/**
 * Represents a generic financial transaction, which can be either an Ingreso (Income) or a Gasto (Expense).
 */
export type Transaction = Ingreso | Gasto;
