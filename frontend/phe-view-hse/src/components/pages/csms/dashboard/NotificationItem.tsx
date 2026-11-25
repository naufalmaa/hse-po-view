import { Activity, Calendar, User } from "lucide-react";
import { useNavigate } from '@tanstack/react-router';
import { AppRoute } from "@/constants/app-route";
import { string_date_formatted } from "@/lib/my-utils";

interface NotificationItemProps {
  notification: any;
  index: number;
}

const NotificationItem = ({ notification, index }: NotificationItemProps) => {
  const navigate = useNavigate();

  // Function to navigate to contract details
  const showContractDetail = (contractId: string) => {
    navigate({
      to: AppRoute.csms.contractManagementDetails.url,
      search: {
        contractId,
      }
    });
  };

  return (
    <div
      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={() => showContractDetail(notification.contractId)}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1 min-w-0">
          <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
            <Activity className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="font-medium text-foreground truncate hover:text-primary">
                {notification.folderName}
              </h3>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${notification.action === 'created'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : notification.action === 'updated'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                  : notification.action === 'deleted'
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                {notification.action}
              </span>
            </div>
            {/* Display contractor name and contract title */}
            {notification.contractorName && (
              <p className="text-sm font-medium text-foreground mb-1">
                {notification.contractorName}
              </p>
            )}
            {notification.contractTitle && (
              <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                {notification.contractTitle}
              </p>
            )}
            <p className="text-sm text-muted-foreground mb-2">
              {notification.details}
            </p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <div className="flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                <span>{string_date_formatted({ localeId: "id-ID", dateString: notification.timestamp, format: "dd-MM-yyyy HH:mm" })}</span>
              </div>
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>{notification.user}</span>
              </div>
              {/* <div className="flex items-center">
                <Activity className="h-3 w-3 mr-1" />
                <span className="font-mono text-xs">{notification.folderId.substring(0, 8)}...</span>
              </div> */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationItem;