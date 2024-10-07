"use client";

import React from "react";
import { create } from "zustand";
import { Plus, Trash2, DollarSign, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Definir interfaces para los tipos
interface Person {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  description: string;
  amount: number;
  paidBy: number;
  forWhom: number[];
}

interface Settlement {
  from: string;
  to: string;
  amount: number;
}

interface ExpenseSplitterState {
  currentStep: number;
  people: Person[];
  expenses: Expense[];
  addPerson: (name: string) => void;
  removePerson: (id: number) => void;
  addExpense: (
    description: string,
    amount: string,
    paidBy: number,
    forWhom: number[]
  ) => void;
  nextStep: () => void;
  prevStep: () => void;
  isDialogOpen: boolean;
  setIsDialogOpen: (isOpen: boolean) => void;
  dialogMessage: string;
  setDialogMessage: (message: string) => void;
  calculateSettlements: () => Settlement[];
}

// Zustand store con tipos
const useStore = create<ExpenseSplitterState>((set, get) => ({
  currentStep: 1,
  people: [],
  expenses: [],
  isDialogOpen: false,
  setIsDialogOpen: (isOpen) => set({ isDialogOpen: isOpen }),
  dialogMessage: "",
  setDialogMessage: (message) => set({ dialogMessage: message }),
  addPerson: (name) => {
    const { people, setIsDialogOpen, setDialogMessage } = get();
    const nameExists = people.some(
      (person) => person.name.toLowerCase() === name.toLowerCase()
    );

    if (nameExists) {
      setDialogMessage(
        "Este nombre ya ha sido agregado. Por favor, elige un nombre diferente."
      );
      setIsDialogOpen(true);
      return;
    }

    const newPerson = { id: people.length + 1, name };
    set((state) => ({ people: [...state.people, newPerson] }));
  },
  removePerson: (id) =>
    set((state) => ({
      people: state.people.filter((person) => person.id !== id),
      expenses: state.expenses.filter(
        (expense) => expense.paidBy !== id && !expense.forWhom.includes(id)
      ),
    })),
  addExpense: (description, amount, paidBy, forWhom) =>
    set((state) => ({
      expenses: [
        ...state.expenses,
        {
          id: Date.now(),
          description,
          amount: parseFloat(amount),
          paidBy,
          forWhom,
        },
      ],
    })),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: state.currentStep - 1 })),
  calculateSettlements: () => {
    const { people, expenses } = get();
    const balances: Record<number, number> = {};

    // Calculate balances
    people.forEach((person) => {
      balances[person.id] = 0;
    });

    expenses.forEach((expense) => {
      const payer = expense.paidBy;
      const amount = expense.amount;
      const splitAmount = amount / expense.forWhom.length;

      balances[payer] += amount;

      expense.forWhom.forEach((personId) => {
        balances[personId] -= splitAmount;
      });
    });

    // Optimize settlements
    const settlements: Settlement[] = [];
    const debtors = people
      .filter((p) => balances[p.id] < -0.01)
      .sort((a, b) => balances[a.id] - balances[b.id]);
    const creditors = people
      .filter((p) => balances[p.id] > 0.01)
      .sort((a, b) => balances[b.id] - balances[a.id]);

    while (debtors.length > 0 && creditors.length > 0) {
      const debtor = debtors[0];
      const creditor = creditors[0];
      const amount = Math.min(-balances[debtor.id], balances[creditor.id]);

      if (amount > 0.01) {
        settlements.push({
          from: debtor.name,
          to: creditor.name,
          amount: Number(amount.toFixed(2)),
        });
      }

      balances[debtor.id] += amount;
      balances[creditor.id] -= amount;

      if (Math.abs(balances[debtor.id]) < 0.01) debtors.shift();
      if (Math.abs(balances[creditor.id]) < 0.01) creditors.shift();
    }

    return settlements;
  },
}));

const Step1Content = () => {
  const {
    people,
    addPerson,
    removePerson,
    nextStep,
    isDialogOpen,
    setIsDialogOpen,
    dialogMessage,
  } = useStore();
  const [newPersonName, setNewPersonName] = React.useState<string>("");

  const handleAddPerson = () => {
    if (newPersonName.trim()) {
      addPerson(newPersonName.trim());
      setNewPersonName("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleAddPerson();
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>¿Quiénes participan en los gastos?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-2 mb-4">
            <Input
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nombre de la persona"
            />
            <Button onClick={handleAddPerson}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar
            </Button>
          </div>

          {people.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Participantes:</h3>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => (
                  <Button
                    key={person.id}
                    variant="outline"
                    onClick={() => removePerson(person.id)}
                  >
                    {person.name}
                    <Trash2 className="ml-2 h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-end">
        <Button onClick={nextStep} disabled={people.length < 2}>
          Siguiente
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atención</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setIsDialogOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const Step2Content = () => {
  const { people, expenses, addExpense, prevStep, nextStep } = useStore();
  const [description, setDescription] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [paidBy, setPaidBy] = React.useState<string>("");
  const [selectedPeople, setSelectedPeople] = React.useState<number[]>([]);

  const handleAddExpense = () => {
    if (description && amount && paidBy && selectedPeople.length > 0) {
      addExpense(description, amount, Number(paidBy), selectedPeople);
      setDescription("");
      setAmount("");
      setPaidBy("");
      setSelectedPeople([]);
    }
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Agregar Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descripción del gasto"
            />
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Monto"
            />
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2"
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
            >
              <option value="">¿Quién pagó?</option>
              {people.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
            <div>
              <h4 className="mb-2">¿Para quiénes?</h4>
              <div className="flex flex-wrap gap-2">
                {people.map((person) => (
                  <Button
                    key={person.id}
                    variant={
                      selectedPeople.includes(person.id) ? "default" : "outline"
                    }
                    onClick={() => {
                      setSelectedPeople((prev) =>
                        prev.includes(person.id)
                          ? prev.filter((id) => id !== person.id)
                          : [...prev, person.id]
                      );
                    }}
                  >
                    {person.name}
                  </Button>
                ))}
              </div>
            </div>
            <Button onClick={handleAddExpense}>
              <DollarSign className="mr-2 h-4 w-4" />
              Agregar Gasto
            </Button>
          </div>
        </CardContent>
      </Card>

      {expenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gastos Agregados</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Pagado por</TableHead>
                  <TableHead>Para</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{expense.description}</TableCell>
                    <TableCell>${expense.amount.toFixed(2)}</TableCell>
                    <TableCell>
                      {people.find((p) => p.id === expense.paidBy)?.name}
                    </TableCell>
                    <TableCell>
                      {expense.forWhom
                        .map((id) => people.find((p) => p.id === id)?.name)
                        .join(", ")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={nextStep} disabled={expenses.length === 0}>
          Ver Balance
        </Button>
      </div>
    </>
  );
};

const Step3Content = () => {
  const { people, expenses, prevStep, nextStep } = useStore();

  const calculateBalances = () => {
    const balances: Record<number, number> = {};
    people.forEach((person) => {
      balances[person.id] = 0;
    });

    expenses.forEach((expense) => {
      const payer = expense.paidBy;
      const amount = expense.amount;
      const splitAmount = amount / expense.forWhom.length;

      balances[payer] += amount;

      expense.forWhom.forEach((personId) => {
        balances[personId] -= splitAmount;
      });
    });

    return balances;
  };

  const balances = calculateBalances();

  const chartData = Object.entries(balances).map(([personId, balance]) => {
    const person = people.find((p) => p.id === Number(personId));
    return {
      name: person?.name,
      balance: Number(balance.toFixed(2)),
    };
  });

  const chartConfig = {
    balance: {
      label: "Balance",
      color: "hsl(var(--chart-1))",
    },
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Balance Final</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Persona</TableHead>
                <TableHead>Balance</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(balances).map(([personId, balance]) => {
                const person = people.find((p) => p.id === Number(personId));
                return (
                  <TableRow key={personId}>
                    <TableCell>{person?.name}</TableCell>
                    <TableCell
                      className={
                        balance >= 0 ? "text-green-600" : "text-red-600"
                      }
                    >
                      ${balance.toFixed(2)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <ChartContainer config={chartConfig} className="mt-6 h-[300px]">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="balance" fill="var(--color-balance)" radius={4} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={nextStep}>Finalizar</Button>
      </div>
    </>
  );
};

const Step4Content = () => {
  const { prevStep, nextStep, calculateSettlements } = useStore();
  const settlements = calculateSettlements();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Liquidaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>De</TableHead>
                <TableHead>Para</TableHead>
                <TableHead>Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {settlements.map((settlement, index) => (
                <TableRow key={index}>
                  <TableCell>{settlement.from}</TableCell>
                  <TableCell>{settlement.to}</TableCell>
                  <TableCell>${settlement.amount.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={prevStep}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </Button>
        <Button onClick={nextStep}>Finalizar</Button>
      </div>
    </>
  );
};

const Step5Content = () => {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>¡Gracias por usar el Divisor de Gastos!</CardTitle>
        </CardHeader>
        <CardContent>
          <p>
            Esperamos que esta herramienta haya sido útil para dividir los
            gastos entre tus amigos.
          </p>
          <p className="mt-4">
            Si quieres hacer otra división de gastos, puedes volver al inicio.
          </p>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-center">
        <Button variant="outline" onClick={() => window.location.reload()}>
          Volver al Inicio
        </Button>
      </div>
    </>
  );
};

const ExpenseSplitterApp = () => {
  const { currentStep } = useStore();

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">Divisor de Gastos</h1>
        <div className="flex items-center gap-2">
          <Badge variant="default">Paso {currentStep}</Badge>
          <h2 className="text-lg">
            {currentStep === 1 && "Agregar Participantes"}
            {currentStep === 2 && "Agregar Gastos"}
            {currentStep === 3 && "Ver Balance"}
            {currentStep === 4 && "Liquidaciones"}
            {currentStep === 5 && "Finalizar"}
          </h2>
        </div>
      </div>

      {currentStep === 1 && <Step1Content />}
      {currentStep === 2 && <Step2Content />}
      {currentStep === 3 && <Step3Content />}
      {currentStep === 4 && <Step4Content />}
      {currentStep === 5 && <Step5Content />}
    </div>
  );
};

export default ExpenseSplitterApp;
