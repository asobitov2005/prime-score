"use client";
import type { PaymentsManagerScope } from "./controller";
import { Card, CardDescription, CardHeader, CardTitle } from "../dependencies";

export function PaymentsManagerSection5({ scope }: { scope: PaymentsManagerScope }) {
  const { stats } = scope;
  return (
    <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Pending invoices</CardDescription>
                <CardTitle className="text-2xl">{stats.pending}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Completed invoices</CardDescription>
                <CardTitle className="text-2xl">{stats.completed}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>Active cards</CardDescription>
                <CardTitle className="text-2xl">{stats.activeCards}</CardTitle>
              </CardHeader>
            </Card>
          </div>
  );
}
