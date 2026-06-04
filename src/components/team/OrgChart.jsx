import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function OrgChart({ members, onEditMember }) {
  // Build tree from org_parent_id
  const roots = members.filter(m => !m.org_parent_id);
  const children = (parentId) => members.filter(m => m.org_parent_id === parentId);

  const renderNode = (member, depth = 0) => {
    const kids = children(member.id);
    return (
      <div key={member.id} className="flex flex-col items-center">
        <Card 
          className="w-48 hover:shadow-md transition-shadow cursor-pointer border-l-2 border-l-accent/30"
          onClick={() => onEditMember(member)}
        >
          <CardContent className="p-3 text-center">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <span className="text-xs font-bold text-primary">{(member.name || "?")[0].toUpperCase()}</span>
            </div>
            <p className="text-sm font-medium truncate">{member.name}</p>
            {member.org_node && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{member.org_node}</p>
            )}
            <Badge variant="secondary" className="text-[9px] mt-1.5 px-1.5">
              #{member.status_tag}
            </Badge>
          </CardContent>
        </Card>
        {kids.length > 0 && (
          <>
            <div className="w-px h-6 bg-border" />
            <div className="flex gap-6">
              {kids.map(k => (
                <div key={k.id} className="flex flex-col items-center">
                  <div className="w-px h-6 bg-border" />
                  {renderNode(k, depth + 1)}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  if (members.length === 0) {
    return (
      <Card className="bg-muted/50 border-dashed">
        <CardContent className="p-8 text-center">
          <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Add team members with org chart roles to see the hierarchy</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="overflow-x-auto pb-8">
      <div className="flex gap-10 justify-center min-w-max py-4">
        {roots.length > 0 
          ? roots.map(r => renderNode(r))
          : members.map(m => renderNode(m))
        }
      </div>
    </div>
  );
}