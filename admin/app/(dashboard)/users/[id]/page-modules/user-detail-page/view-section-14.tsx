"use client";
import type { UserDetailPageScope } from "./controller";
import { Badge, Card, CardContent, CardHeader, CardTitle, Link, SectionHeader, buttonClassName, cn } from "../dependencies";
import { IconAlert, IconBan, IconChevron, IconCrown, IconEye, IconEyeOff, IconTrash, InfoRow, StatBox, daysLeft, fmt, fmtDate, humanizeStatus, statusTone } from "../shared";
import { UserDetailPageSection2 } from "./view-section-02";
import { UserDetailPageSection3 } from "./view-section-03";
import { UserDetailPageSection4 } from "./view-section-04";
import { UserDetailPageSection5 } from "./view-section-05";
import { UserDetailPageSection6 } from "./view-section-06";
import { UserDetailPageSection7 } from "./view-section-07";
import { UserDetailPageSection8 } from "./view-section-08";
import { UserDetailPageSection9 } from "./view-section-09";
import { UserDetailPageSection10 } from "./view-section-10";
import { UserDetailPageSection11 } from "./view-section-11";
import { UserDetailPageSection12 } from "./view-section-12";
import { UserDetailPageSection13 } from "./view-section-13";
import { UserDetailPageSection14 } from "./view-section-14";

export function UserDetailPageView1({ scope }: { scope: UserDetailPageScope }) {
  const { fullName, user, actionMsg, premiumExpired, premiumRef, setPremiumOpen, premiumOpen, actionLoading, grantPremium, revokePremium, toggleLeaderboard, deleteUser, completionRate, memberDays, activityError, activity, setSelectedAttemptId, selectedAttempt, deleteOpen, setDeleteOpen, confirmDeleteUser } = scope;
  return (
    (
        <div className="space-y-6 max-w-4xl">
          <UserDetailPageSection2 scope={scope} />
    
          <UserDetailPageSection3 scope={scope} />
    
          <UserDetailPageSection4 scope={scope} />
          <UserDetailPageSection5 scope={scope} />
    
          <UserDetailPageSection6 scope={scope} />
          <UserDetailPageSection7 scope={scope} />
    
          <UserDetailPageSection8 scope={scope} />
          <UserDetailPageSection9 scope={scope} />
    
          <UserDetailPageSection10 scope={scope} />
          <UserDetailPageSection11 scope={scope} />
    
          <UserDetailPageSection12 scope={scope} />
    
          <UserDetailPageSection13 scope={scope} />
    
          <UserDetailPageSection14 scope={scope} />
        </div>
      )
  );
}
