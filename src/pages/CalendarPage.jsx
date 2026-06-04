import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ChevronLeft, ChevronRight, Calendar as CalIcon, Clock, MapPin } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday } from "date-fns";
import EventDialog from "../components/calendar/EventDialog";

const typeColors = {
  shift: "bg-blue-500", meeting: "bg-purple-500", deadline: "bg-red-500",
  canvass: "bg-green-500", fundraiser: "bg-amber-500", other: "bg-slate-400",
};

export default function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDialog, setShowDialog] = useState(false);
  const [editEvent, setEditEvent] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);

  const { data: campaigns = [] } = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => base44.entities.Campaign.list("-created_date", 1),
  });
  const campaign = campaigns[0];

  const { data: events = [] } = useQuery({
    queryKey: ["events", campaign?.id],
    queryFn: () => campaign ? base44.entities.CalendarEvent.filter({ campaign_id: campaign.id }) : [],
    enabled: !!campaign,
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const startPadding = monthStart.getDay();
  const paddedDays = [...Array(startPadding).fill(null), ...days];

  const eventsOnDay = (day) => events.filter(e => e.start_date && isSameDay(new Date(e.start_date), day));

  const selectedEvents = selectedDate 
    ? eventsOnDay(selectedDate) 
    : events.sort((a, b) => new Date(a.start_date) - new Date(b.start_date)).slice(0, 10);

  return (
    <div className="min-h-screen p-6 lg:p-8 max-w-[1400px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold">Operations Calendar</h1>
          <p className="text-sm text-muted-foreground">Staff logistics and volunteer shift scheduling</p>
        </div>
        <Button onClick={() => { setEditEvent(null); setShowDialog(true); }} className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Plus className="w-4 h-4 mr-1.5" /> New Event
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <h2 className="text-lg font-display font-semibold">{format(currentMonth, "MMMM yyyy")}</h2>
                <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                  <div key={d} className="bg-muted px-2 py-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
                ))}
                {paddedDays.map((day, i) => {
                  if (!day) return <div key={`pad-${i}`} className="bg-card min-h-[80px]" />;
                  const dayEvents = eventsOnDay(day);
                  const selected = selectedDate && isSameDay(day, selectedDate);
                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => setSelectedDate(day)}
                      className={`bg-card min-h-[80px] p-1.5 cursor-pointer hover:bg-muted/50 transition-colors ${
                        selected ? "ring-2 ring-accent ring-inset" : ""
                      }`}
                    >
                      <span className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                        isToday(day) ? "bg-accent text-accent-foreground" : "text-foreground"
                      }`}>
                        {format(day, "d")}
                      </span>
                      <div className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => (
                          <div key={ev.id} className="flex items-center gap-1">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeColors[ev.event_type] || "bg-slate-400"}`} />
                            <span className="text-[10px] truncate text-muted-foreground">{ev.title}</span>
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <span className="text-[10px] text-muted-foreground">+{dayEvents.length - 3} more</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Event List */}
        <div>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Upcoming Events"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {selectedEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No events</p>
              ) : (
                selectedEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => { setEditEvent(ev); setShowDialog(true); }}
                    className="flex gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className={`w-1 rounded-full flex-shrink-0 ${typeColors[ev.event_type] || "bg-slate-400"}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{ev.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {ev.start_date ? format(new Date(ev.start_date), "MMM d, h:mm a") : "—"}
                        </span>
                      </div>
                      {ev.location && (
                        <div className="flex items-center gap-2 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground truncate">{ev.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <EventDialog open={showDialog} onOpenChange={setShowDialog} event={editEvent} campaignId={campaign?.id} />
    </div>
  );
}