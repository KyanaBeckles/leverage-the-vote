import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ComplianceCountdown from "../components/dashboard/ComplianceCountdown";
import SignatureTracker from "../components/dashboard/SignatureTracker";
import SetupLaunchpad from "../components/dashboard/SetupLaunchpad";
import QuickStats from "../components/dashboard/QuickStats";
import RecentTasks from "../components/dashboard/RecentTasks";
import { Button } from "@/components/ui/button";
import { Plus, Settings, MapPin, Award } from "lucide-react";
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
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      {campaign && (
        <div className="bg-gradient-to-r from-primary via-primary to-primary/80 text-primary-foreground px-6 lg:px-8 py-8">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-5">
              {campaign.logo_url ? (
                <img src={campaign.logo_url} alt="logo" className="w-16 h-16 rounded-xl object-cover border-2 border-primary-foreground/20 flex-shrink-0" />
              ) : (
                <div className="w-16 h-16 rounded-xl bg-primary-foreground/10 border-2 border-primary-foreground/20 flex items-center justify-center flex-shrink-0">
                  <Award className="w-8 h-8 text-primary-foreground/70" />
                </div>
              )}
              <div>
                <h1 className="text-2xl lg:text-3xl font-display font-bold leading-tight">
                  {campaign.name || campaign.candidate_name}
                </h1>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  {campaign.office && (
                    <span className="text-primary-foreground/80 text-sm font-medium">
                      {campaign.candidate_name} for {campaign.office}
                    </span>
                  )}
                  {campaign.district && (
                    <>
                      <span className="text-primary-foreground/40">·</span>
                      <span className="flex items-center gap-1 text-primary-foreground/70 text-sm">
                        <MapPin className="w-3.5 h-3.5" />
                        {campaign.district}
                        {campaign.state && `, ${campaign.state}`}
                      </span>
                    </>
                  )}
                  {campaign.party && (
                    <>
                      <span className="text-primary-foreground/40">·</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary-foreground/15 text-primary-foreground/90 font-medium">
                        {campaign.party}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSetup(true)}
              className="bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/20 flex-shrink-0"
            >
              <Settings className="w-4 h-4 mr-1.5" /> Settings
            </Button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto space-y-8">

        {/* Stats */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Overview</p>
          <QuickStats
            voterCount={voters.length}
            memberCount={members.length}
            taskCount={tasks.filter((t) => t.status !== "done").length}
            sheetCount={sheets.length}
          />
        </section>

        {/* Countdowns */}
        <ComplianceCountdown campaign={campaign} />

        {/* Operations + Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Operations</p>
              <RecentTasks tasks={tasks} />
            </section>

            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Field Activity</p>
              <SignatureMap signatures={signatures} />
            </section>
          </div>

          <div className="space-y-6">
            <section>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Progress</p>
              <div className="space-y-4">
                <SetupLaunchpad
                  campaign={campaign}
                  voterCount={voters.length}
                  memberCount={members.length}
                  sheetCount={sheets.length}
                />
                <SignatureTracker campaign={campaign} sheets={sheets} />
              </div>
            </section>
          </div>
        </div>
      </div>

      <CampaignSetupDialog
        open={showSetup}
        onOpenChange={setShowSetup}
        campaign={campaign}
      />
    </div>
  );
}