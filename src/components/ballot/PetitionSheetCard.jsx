import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, ChevronRight, User, FileText } from "lucide-react";
import { format } from "date-fns";

const nextStatus = {
  blank_issued: "in_field",
  in_field: "returned",
  returned: "scanned",
  scanned: "at_clerk",
  at_clerk: "certified",
};

const statusLabels = {
  blank_issued: "Blank Issued",
  in_field: "In Field",
  returned: "Returned",
  scanned: "Scanned",
  at_clerk: "At Clerk",
  certified: "Certified",
  rejected: "Rejected",
};

export default function PetitionSheetCard({ sheet, onEdit, onAdvance }) {
  const next = nextStatus[sheet.pipeline_status];

  return (
    <Card className="group hover:shadow-md transition-all cursor-pointer">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2" onClick={onEdit}>
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">#{sheet.sheet_number}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>Edit Details</DropdownMenuItem>
              {next && (
                <DropdownMenuItem onClick={() => onAdvance(next)}>
                  <ChevronRight className="w-3 h-3 mr-1" /> Move to {statusLabels[next]}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {sheet.assigned_to_name && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <span>{sheet.assigned_to_name}</span>
          </div>
        )}
        <div className="flex items-center justify-between mt-2">
          {sheet.raw_signature_count > 0 && (
            <span className="text-[10px] text-muted-foreground">{sheet.raw_signature_count} sigs</span>
          )}
          {sheet.issued_date && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {format(new Date(sheet.issued_date), "MMM d")}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}