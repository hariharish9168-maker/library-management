export interface FineConfig {
  gracePeriodDays: number;
  fineRatePerDay: number;
  maxFineLimit: number;
}

export interface OverdueCalculationResult {
  isOverdue: boolean;
  overdueDays: number;
  calculatedFine: number;
  dueDate: Date;
  referenceDate: Date;
}

/**
 * Calculates overdue days and fine based on due date and reference date (return date or current date).
 * 
 * Rules:
 * 1. The due date itself does NOT incur a fine.
 * 2. Overdue days begin on the calendar day immediately following the due date.
 *    Example: Due date = 10 Oct, Returned on 13 Oct -> 3 full overdue days (11, 12, 13 Oct).
 * 3. If a grace period of G days is configured, the borrower has G additional days to return without penalty.
 *    If returned beyond the grace period, overdue days are calculated as (total elapsed days beyond due date).
 * 4. Total fine is capped at maxFineLimit if greater than 0.
 */
export function calculateOverdue(
  dueDateInput: string | Date,
  referenceDateInput: string | Date = new Date(),
  config: FineConfig = { gracePeriodDays: 0, fineRatePerDay: 2.0, maxFineLimit: 150.0 }
): OverdueCalculationResult {
  const due = new Date(dueDateInput);
  const ref = new Date(referenceDateInput);

  // Normalize to date-only boundaries (midnight) to ensure clean calendar day comparisons
  const dueMidnight = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const refMidnight = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate()).getTime();

  const diffMs = refMidnight - dueMidnight;
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (elapsedDays <= 0) {
    return {
      isOverdue: false,
      overdueDays: 0,
      calculatedFine: 0,
      dueDate: due,
      referenceDate: ref,
    };
  }

  // Grace period evaluation
  if (elapsedDays <= config.gracePeriodDays) {
    return {
      isOverdue: false,
      overdueDays: 0,
      calculatedFine: 0,
      dueDate: due,
      referenceDate: ref,
    };
  }

  const overdueDays = elapsedDays;
  let fine = overdueDays * config.fineRatePerDay;

  if (config.maxFineLimit > 0 && fine > config.maxFineLimit) {
    fine = config.maxFineLimit;
  }

  return {
    isOverdue: true,
    overdueDays,
    calculatedFine: Number(fine.toFixed(2)),
    dueDate: due,
    referenceDate: ref,
  };
}
