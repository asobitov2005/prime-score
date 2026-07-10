"use client";
import type { PlanManagerScope } from "./controller";
import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Eye, EyeOff, Input, Label, Notice, Pencil, Plus, PrimePremiumIcon, SectionHeader, Select, Sparkles, Textarea, X, cn } from "../dependencies";
import { formatMoney } from "../shared";
import { PlanManagerSection2 } from "./view-section-02";
import { PlanManagerSection3 } from "./view-section-03";
import { PlanManagerSection4 } from "./view-section-04";
import { PlanManagerSection5 } from "./view-section-05";
import { PlanManagerSection6 } from "./view-section-06";

export function PlanManagerView1({ scope }: { scope: PlanManagerScope }) {
  const { openCreate, notice, totalPlans, activePlans, featuredPlans, plans, openEdit, draft, closeModal, handleSave, setDraft, preview, submitError, saving } = scope;
  return (
    (
        <div className="space-y-6">
          <PlanManagerSection2 scope={scope} />
    
          <PlanManagerSection3 scope={scope} />
    
          <PlanManagerSection4 scope={scope} />
    
          <PlanManagerSection5 scope={scope} />
    
          <PlanManagerSection6 scope={scope} />
        </div>
      )
  );
}
