import type { AdminRole } from "@/lib/types";
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  Ticket,
  BarChart3,
  ScrollText,
  CreditCard as PlansIcon,
  Globe,
  Headphones,
  MessageSquareText,
  Settings
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface AdminNavItem {
  label: string;
  href: string;
  description: string;
  badge?: string;
  roles?: AdminRole[];
  icon?: LucideIcon;
}

export interface AdminNavGroup {
  label: string;
  description: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    label: "Overview",
    description: "Core workspace and content flow",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        description: "KPIs, activity, and workspace status",
        icon: LayoutDashboard
      },
      {
        label: "Reading Tests",
        href: "/tests?type=reading",
        description: "Manage IELTS reading materials",
        icon: FileText
      },
      {
        label: "Listening Tests",
        href: "/tests?type=listening",
        description: "Manage IELTS listening materials",
        icon: Headphones
      }
    ]
  },
  {
    label: "Operations",
    description: "People, revenue, and promo management",
    items: [
      {
        label: "Users",
        href: "/users",
        description: "User management and session controls",
        icon: Users
      },
      {
        label: "Reviews",
        href: "/reviews",
        description: "Moderate public testimonials and user feedback",
        icon: MessageSquareText
      },
      {
        label: "Plans",
        href: "/plans",
        description: "Premium plan configuration",
        badge: "Paused",
        icon: PlansIcon
      },
      {
        label: "Payments",
        href: "/payments",
        description: "Provider readiness and webhook status",
        badge: "Paused",
        icon: CreditCard
      },
      {
        label: "Promo Codes",
        href: "/promo-codes",
        description: "Discount and gift code management",
        icon: Ticket
      }
    ]
  },
  {
    label: "Insights",
    description: "Reporting and governance",
    items: [
      {
        label: "Analytics",
        href: "/analytics",
        description: "Funnels, retention, and content performance",
        icon: BarChart3
      },
      {
        label: "Audit Log",
        href: "/audit-log",
        description: "Admin actions and traceability",
        icon: ScrollText
      }
    ]
  },
  {
    label: "System",
    description: "Platform configuration",
    items: [
      {
        label: "Settings",
        href: "/settings",
        description: "Platform and notification settings",
        icon: Settings
      }
    ]
  }
];
