"use client";

import { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import { getActivityLog, ActivityLogItem } from "@/app/actions/activity";

export function ActivityLogTable({ companyId }: { companyId: string }) {
  const [log, setLog] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    getActivityLog(companyId)
      .then((data) => {
        if (mounted) {
          setLog(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch activity log:", err);
        if (mounted) setLoading(false);
      });
    
    return () => { mounted = false; };
  }, [companyId]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (log.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg border-dashed text-muted-foreground">
        No activity found for this company.
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Actor</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Purpose</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Tx</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {log.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="whitespace-nowrap">
                {new Date(item.date).toLocaleDateString()}{" "}
                <span className="text-muted-foreground text-xs">
                  {new Date(item.date).toLocaleTimeString()}
                </span>
              </TableCell>
              <TableCell>{item.actor}</TableCell>
              <TableCell>
                <Badge variant="outline">{item.type}</Badge>
              </TableCell>
              <TableCell>{item.amountEth} ETH</TableCell>
              <TableCell className="max-w-xs truncate" title={item.purpose}>
                {item.purpose}
              </TableCell>
              <TableCell>
                <Badge
                  variant={
                    item.status.includes("Flagged") || item.status === "Failed" || item.status === "Rejected"
                      ? "destructive"
                      : item.status.includes("Compliant") || item.status === "Approved" || item.status === "Executed"
                      ? "default"
                      : "secondary"
                  }
                  className={item.status.includes("Compliant") ? "bg-green-500/10 text-green-600 border-green-500/50 hover:bg-green-500/20" : ""}
                >
                  {item.status.length > 30 ? item.status.substring(0, 30) + "..." : item.status}
                </Badge>
              </TableCell>
              <TableCell>
                {item.txHash ? (
                  <a
                    href={`https://sepolia.etherscan.io/tx/${item.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : (
                  "-"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
