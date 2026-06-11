"use client";

import { useState } from "react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LoaderCircleIcon, CheckCircleIcon, XCircleIcon, PlaneIcon } from "lucide-react";
import { toast } from "sonner";

export function TravelAgentDrawer({
  isOpen,
  onOpenChange,
  employee,
  company,
  agentId,
  delegationId,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  employee: any;
  company: any;
  agentId: string;
  delegationId: string;
}) {
  const [destination, setDestination] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [notes, setNotes] = useState("");
  
  const [status, setStatus] = useState<"idle" | "researching" | "proposed" | "booking" | "success" | "error">("idle");
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [travelPlan, setTravelPlan] = useState<any>(null);

  const handleResearch = async () => {
    if (!destination || !departureDate || !returnDate) {
      toast.error("Destination and dates are required");
      return;
    }

    try {
      setStatus("researching");
      setResultMessage(null);

      const res = await fetch("/api/agents/travel/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destination,
          departureDate,
          returnDate,
          notes,
          delegationId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResultMessage(data.error || "An error occurred during research");
        return;
      }

      setTravelPlan(data.plan);
      setStatus("proposed");
    } catch (err: any) {
      setStatus("error");
      setResultMessage(err.message);
    }
  };

  const handleBook = async () => {
    try {
      setStatus("booking");
      setResultMessage(null);

      const res = await fetch("/api/agents/travel/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          travelPlan,
          delegationId,
          agentId,
          employeeId: employee.id,
          companyId: company.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setResultMessage(data.error || "An error occurred during booking");
        return;
      }

      setStatus("success");
      setResultMessage(`Trip booked! Tx Hash: ${data.txHash}`);
      toast.success("Travel booked successfully!");
    } catch (err: any) {
      setStatus("error");
      setResultMessage(err.message);
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Travel Agent</DrawerTitle>
          <DrawerDescription>
            Request a trip. The AI will research options and book within your approved budget.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
          {status === "idle" || status === "error" || status === "researching" ? (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Devcon Tokyo"
                  disabled={status === "researching"}
                />
              </div>

              <div className="flex gap-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="departure">Departure Date</Label>
                  <Input
                    id="departure"
                    type="date"
                    value={departureDate}
                    onChange={(e) => setDepartureDate(e.target.value)}
                    disabled={status === "researching"}
                  />
                </div>
                <div className="flex flex-col gap-2 flex-1">
                  <Label htmlFor="return">Return Date</Label>
                  <Input
                    id="return"
                    type="date"
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    disabled={status === "researching"}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. I prefer window seats and hotel near the venue"
                  disabled={status === "researching"}
                />
              </div>

              {status === "error" && resultMessage && (
                <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex gap-2">
                  <XCircleIcon className="w-5 h-5 shrink-0" />
                  <p>{resultMessage}</p>
                </div>
              )}
            </>
          ) : (status === "proposed" || status === "booking") && travelPlan ? (
            <div className="flex flex-col gap-4 bg-muted/50 p-4 rounded-md border">
              <h3 className="font-semibold text-lg border-b pb-2">Proposed Itinerary</h3>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm text-muted-foreground">Flight</p>
                  <p className="font-semibold">{travelPlan.flight.airline} - {travelPlan.flight.flightNumber}</p>
                  <p className="text-sm">{travelPlan.flight.time}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-sm text-muted-foreground">Hotel</p>
                  <p className="font-semibold">{travelPlan.hotel.name}</p>
                  <p className="text-sm">{travelPlan.hotel.nights} nights</p>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <p className="text-sm text-muted-foreground">Agent Reasoning</p>
                <p className="text-sm italic">{travelPlan.reasoning}</p>
              </div>
              <div className="flex justify-between items-center border-t pt-4">
                <p className="font-semibold text-muted-foreground">Estimated Total</p>
                <p className="font-bold text-lg">{travelPlan.estimatedCostEth} ETH</p>
              </div>
            </div>
          ) : status === "success" ? (
            <div className="bg-green-500/10 text-green-600 p-4 rounded-md text-sm flex flex-col gap-2 items-center text-center">
              <CheckCircleIcon className="w-8 h-8" />
              <p className="font-semibold text-base">Trip Booked Successfully!</p>
              <p className="text-xs break-all">{resultMessage}</p>
              <Button variant="outline" className="mt-4" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 gap-4 text-muted-foreground">
              <LoaderCircleIcon className="w-8 h-8 animate-spin" />
              <p className="animate-pulse">
                {status === "booking" ? "Executing transaction..." : "Agent is researching..."}
              </p>
            </div>
          )}
        </div>

        {(status === "idle" || status === "error" || status === "researching") && (
          <DrawerFooter className="border-t pt-4">
            <Button onClick={handleResearch} disabled={status === "researching"}>
              {status === "researching" ? (
                <LoaderCircleIcon className="animate-spin w-4 h-4 mr-2" />
              ) : (
                <PlaneIcon className="w-4 h-4 mr-2" />
              )}
              Research Trip
            </Button>
          </DrawerFooter>
        )}

        {(status === "proposed" || status === "booking") && (
          <DrawerFooter className="border-t pt-4 flex-row gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setStatus("idle")}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleBook} disabled={status === "booking"}>
              <CheckCircleIcon className="w-4 h-4 mr-2" />
              Accept & Book
            </Button>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
}
