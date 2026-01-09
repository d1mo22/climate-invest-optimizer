import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { formatCurrency } from "../utils/format";

type BudgetContextType = {
  budget: number;
  setBudget: (value: number) => void;
  formattedBudget: string;
};

const BudgetContext = createContext<BudgetContextType | null>(null);

type BudgetProviderProps = {
  children: ReactNode;
};

export function BudgetProvider({ children }: BudgetProviderProps) {
  const [budget, setBudgetState] = useState<number>(() => {
    const stored = localStorage.getItem("budget");
    return stored ? parseFloat(stored) : 0;
  });

  const setBudget = useCallback((value: number) => {
    const safe = Math.max(0, value);
    localStorage.setItem("budget", String(safe));
    setBudgetState(safe);
  }, []);

  const formattedBudget = formatCurrency(budget);

  return (
    <BudgetContext.Provider value={{ budget, setBudget, formattedBudget }}>
      {children}
    </BudgetContext.Provider>
  );
}

export function useBudget(): BudgetContextType {
  const ctx = useContext(BudgetContext);
  if (!ctx) {
    throw new Error("useBudget must be used within BudgetProvider");
  }
  return ctx;
}
