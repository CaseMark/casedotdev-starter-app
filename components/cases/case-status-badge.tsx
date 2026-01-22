import { Clock, FileText, CheckCircle2, AlertCircle } from "lucide-react";

interface CaseStatusBadgeProps {
  status: string;
}

export function CaseStatusBadge({ status }: CaseStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "intake":
        return {
          color: "bg-blue-100 text-blue-700",
          icon: <Clock className="w-4 h-4" />,
          label: "Intake",
        };
      case "documents_pending":
        return {
          color: "bg-yellow-100 text-yellow-700",
          icon: <FileText className="w-4 h-4" />,
          label: "Documents Pending",
        };
      case "review":
        return {
          color: "bg-purple-100 text-purple-700",
          icon: <FileText className="w-4 h-4" />,
          label: "Review",
        };
      case "ready_to_file":
        return {
          color: "bg-green-100 text-green-700",
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "Ready to File",
        };
      case "filed":
        return {
          color: "bg-indigo-100 text-indigo-700",
          icon: <FileText className="w-4 h-4" />,
          label: "Filed",
        };
      case "discharged":
        return {
          color: "bg-emerald-100 text-emerald-700",
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: "Discharged",
        };
      case "dismissed":
        return {
          color: "bg-red-100 text-red-700",
          icon: <AlertCircle className="w-4 h-4" />,
          label: "Dismissed",
        };
      default:
        return {
          color: "bg-gray-100 text-gray-700",
          icon: <Clock className="w-4 h-4" />,
          label: status,
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.color}`}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
