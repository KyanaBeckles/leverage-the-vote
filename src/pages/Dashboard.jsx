import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ComplianceCountdown from "../components/dashboard/ComplianceCountdown";
import SignatureTracker from "../components/dashboard/SignatureTracker";
import SetupLaunchpad from "../components/dashboard/SetupLaunchpad";
import QuickStats from "../components/dashboard/QuickStats";
import RecentTasks from "../components/dashboard/RecentTasks";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import CampaignSetupDialog from "../components/dashboard/CampaignSetupDialog";
import SignatureMap from "../components/dashboard/SignatureMap";

export default function Dashboard() {
  const [showSetup, setShowSetup] = useState(false);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });

  const campaign = campaigns[0] || null;

  const { data: voters = [] } = useQuery({
    queryKey: ["voters", campaign?.id],
    queryFn: () => campaign ? base44.entities.Voter.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members", campaign?.id],
    queryFn: () => campaign ? base44.entities.CampaignMember.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["tasks", campaign?.id],
    queryFn: () => campaign ? base44.entities.Task.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const { data: sheets = [] } = useQuery({
    queryKey: ["sheets", campaign?.id],
    queryFn: () => campaign ? base44.entities.PetitionSheet.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const { data: signatures = [] } = useQuery({
    queryKey: ["signatures", campaign?.id],
    queryFn: () => campaign ? base44.entities.Signature.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  useEffect(() => {
    if (!campaign) setShowSetup(true);
  }, [campaign]);

  if (!campaign && !showSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <h2 className="text-2xl font-display font-bold mb-2">Welcome to Leverage</h2>
          <p className="text-muted-foreground mb-6">Set up your first campaign to get started</p>
          <Button onClick={() => setShowSetup(true)} className="bg-accent hover:bg-accent/90 text-accent-foreground">
            <Plus className="w-4 h-4 mr-2" /> Create Campaign
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold">{campaign?.name || "Command Center"}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {campaign?.candidate_name && `${campaign.candidate_name} for ${campaign.office || "Office"}`}
            {campaign?.district && ` · ${campaign.district}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowSetup(true)}>
            <Settings className="w-4 h-4 mr-1.5" /> Campaign Settings
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="space-y-6">
        <QuickStats 
          voterCount={voters.length} 
          memberCount={members.length} 
          taskCount={tasks.filter(t => t.status !== "done").length} 
          sheetCount={sheets.length} 
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ComplianceCountdown campaign={campaign} />
            <RecentTasks tasks={tasks} />
          </div>
          <div className="space-y-6">
            <SetupLaunchpad 
              campaign={campaign} 
              voterCount={voters.length} 
              memberCount={members.length} 
              sheetCount={sheets.length} 
            />
            <SignatureTracker campaign={campaign} signatures={signatures} />
          </div>
        </div>

        <SignatureMap signatures={signatures} />
      </div>

      <CampaignSetupDialog 
        open={showSetup} 
        onOpenChange={setShowSetup} 
        campaign={campaign} 
      />
    </div>
  );
}