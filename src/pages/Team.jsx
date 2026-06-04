import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Users, UserCircle } from "lucide-react";
import MemberDialog from "../components/team/MemberDialog";
import OrgChart from "../components/team/OrgChart";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const statusColors = { volunteer: "bg-blue-100 text-blue-700", staff: "bg-emerald-100 text-emerald-700", consultant: "bg-purple-100 text-purple-700" };
const accessColors = { admin: "bg-red-100 text-red-700", manager: "bg-amber-100 text-amber-700", contributor: "bg-slate-100 text-slate-700", field_only: "bg-cyan-100 text-cyan-700" };

export default function Team() {
  const [showDialog, setShowDialog] = useState(false);
  const [editMember, setEditMember] = useState(null);
  const [search, setSearch] = useState("");

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  const { data: members = [] } = useQuery({
    queryKey: ["members", campaign?.id],
    queryFn: () => campaign ? base44.entities.CampaignMember.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const filtered = members.filter(m => {
    if (!search) return true;
    const s = search.toLowerCase();
    return m.name?.toLowerCase().includes(s) || m.org_node?.toLowerCase().includes(s) || m.email?.toLowerCase().includes(s);
  });

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Team & Org Chart</h1>
          <p className="text-sm text-muted-foreground">Manage your campaign team structure and roles</p>
        </div>
        <Button onClick={() => { setEditMember(null); setShowDialog(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> Add Member
        </Button>
      </div>

      <Tabs defaultValue="directory">
        <TabsList className="mb-6">
          <TabsTrigger value="directory"><Users className="w-4 h-4 mr-1.5" /> Directory</TabsTrigger>
          <TabsTrigger value="orgchart"><UserCircle className="w-4 h-4 mr-1.5" /> Org Chart</TabsTrigger>
        </TabsList>

        <TabsContent value="directory">
          <div className="relative max-w-xs mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search team..." className="pl-9" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((member) => (
              <Card key={member.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setEditMember(member); setShowDialog(true); }}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-primary">{(member.name || "?")[0].toUpperCase()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      {member.org_node && <p className="text-xs text-muted-foreground">{member.org_node}</p>}
                      {member.email && <p className="text-xs text-muted-foreground truncate">{member.email}</p>}
                      <div className="flex gap-1.5 mt-2">
                        <Badge className={`text-[10px] px-1.5 py-0 ${statusColors[member.status_tag] || ""}`}>
                          #{member.status_tag}
                        </Badge>
                        <Badge className={`text-[10px] px-1.5 py-0 ${accessColors[member.access_level] || ""}`}>
                          {member.access_level}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {filtered.length === 0 && (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-8 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-3">No team members yet</p>
                <Button variant="outline" size="sm" onClick={() => setShowDialog(true)}>
                  <Plus className="w-4 h-4 mr-1" /> Add First Member
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="orgchart">
          <OrgChart members={members} onEditMember={(m) => { setEditMember(m); setShowDialog(true); }} />
        </TabsContent>
      </Tabs>

      <MemberDialog open={showDialog} onOpenChange={setShowDialog} member={editMember} campaignId={campaign?.id} />
    </div>
  );
}