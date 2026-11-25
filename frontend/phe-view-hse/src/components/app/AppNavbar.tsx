import React, { useState } from 'react';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { ThemeToggle } from '@/components/custom/components/ThemeToggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { MdLogout } from "react-icons/md";
import { useAppTranslation } from "@/lib/i18n-typed";
import { Button } from "@/components/ui/button";
import { FaRegUser } from "react-icons/fa";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/stores/useAuthStore";
import { Breadcrumbs, DialogModal, DialogModalForm, type ModalProps, type ModalFormProps } from "@/components/custom/components";
import { useLogoutMutation } from "@/service/auth-api";
import { useChangePassword } from "@/service/user-api";
import { LuBell, LuClock } from "react-icons/lu";
import { Badge } from "@/components/ui/badge";
import { useNotificationGet, useNotificationMark } from "@/service/notification";
import { string_date_formatted } from "@/lib/my-utils";
import { Link, useNavigate } from "@tanstack/react-router";
import { AppRoute } from "@/constants/app-route";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from '@/lib/utils';
import { CertificateTypeColors, NotificationStatusItem } from '@/constants/app-enum';
import { TbLockPassword } from 'react-icons/tb';
import { z } from "zod";
import { showNotifError, showNotifSuccess } from "@/lib/show-notif";
import { FormUserChangePassword } from '../pages/profile';
import { User } from 'lucide-react';
import { isAdminUserOrAuditor } from '@/types/auth';
import { TutorialMenu } from './tutorial/TutorialMenu';

type Props = {
  title?: React.ReactNode;
}

export default function AppNavbar({ title, ...props }: Props) {
  const { t } = useAppTranslation();
  const navigate = useNavigate();
  const user: any = useAuthStore((state) => state?.user ?? null);
  const [confirmationModal, setConfirmationModal] = useState<ModalProps | null>(null);
  const [changePasswordModal, setChangePasswordModal] = useState<ModalFormProps | null>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Fetch notifications (only unread for navbar indicator)
  const notificationQuery = useNotificationGet({
    onlyUnread: true,
    orderBy: 'desc',
    limit: 10,
    page: 0
  });

  const unreadCount = notificationQuery.data?.meta?.total || 0;
  const NotificationDropdown = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'employee' | 'csms'>('employee');
    const markNotificationMutation = useNotificationMark();

    const handleNavigation = () => {
      setDropdownOpen(false);
      navigate({ to: AppRoute.notification.list.url });
    };

    const handleNotificationClick = (notificationId: string) => {
      // Mark notification as read
      markNotificationMutation.mutate(notificationId);
      // Close the dropdown
      setDropdownOpen(false);
    };

    const getTypeBadge = (type: string) => {
      const colorClass = CertificateTypeColors[type as keyof typeof CertificateTypeColors] || CertificateTypeColors.general;

      return (
        <Badge className={`px-2.5 py-0.5 text-xs font-medium rounded-lg ${colorClass}`}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </Badge>
      );
    };

    return (
      <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("relative rounded-full", /*unreadCount > 0 ? 'bg-red-300' : ''*/)}>
            <LuBell className="h-4 w-4" />
            {unreadCount > 0 && (
              <div className="absolute top-1 right-1 w-3 h-3 bg-destructive rounded-full border-1 border-background" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            {/*<Button 
              variant="ghost" 
              size="sm" 
              onClick={handleNavigation}
              className="text-xs h-6 px-2"
            >
              View All
            </Button>*/}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Tabs for Employee and CSMS notifications */}
          <div className="flex border-b">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'employee'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setActiveTab('employee')}
            >
              Employee
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium ${activeTab === 'csms'
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
                }`}
              onClick={() => setActiveTab('csms')}
            >
              CSMS
            </button>
          </div>
          <ScrollArea className="h-96">
            {notificationQuery.isLoading && (
              <div className="p-4 text-center text-muted-foreground">
                <LuClock className="h-4 w-4 animate-spin mx-auto mb-2" />
                {t($ => $.notification.loadingNotifications)}
              </div>
            )}
            {notificationQuery.isError && (
              <div className="p-4 text-center text-destructive">
                {t($ => $.notification.failedToLoad)}
              </div>
            )}
            {notificationQuery.isSuccess && (
              <>
                {unreadCount === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    <LuBell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    {t($ => $.notification.noNewNotifications)}
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {activeTab === 'employee' && notificationQuery.data?.data?.employee?.map((notification: any) => {
                      const colorClass = NotificationStatusItem[notification?.status?.toLowerCase() as keyof typeof NotificationStatusItem] || NotificationStatusItem.active;

                      return (
                        <div key={notification.id} className="p-3 border-b border-border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getTypeBadge(notification.type)}
                                {!notification.isRead && (
                                  <div className={cn("w-2 h-2 rounded-full", colorClass)}></div>
                                )}
                              </div>
                              <Link
                                className="text-sm text-foreground line-clamp-2 mb-1"
                                to={AppRoute.employee.detail.url}
                                search={{ id: notification.employeeId }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNotificationClick(notification.id);
                                }}
                              >
                                {notification.message}
                              </Link>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{notification.employeeName}</span>
                                <span>•</span>
                                <span>{string_date_formatted({ localeId: 'id', dateString: notification.triggeredAt, format: 'dd-MM-yyyy HH:mm' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {activeTab === 'csms' && notificationQuery.data?.data?.csms?.map((notification: any) => {
                      // Render CSMS notifications similarly to employee notifications
                      const colorClass = NotificationStatusItem[notification?.status?.toLowerCase() as keyof typeof NotificationStatusItem] || NotificationStatusItem.active;

                      return (
                        <div key={notification.id} className="p-3 border-b border-border hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                {getTypeBadge(notification.type)}
                                {!notification.isRead && (
                                  <div className={cn("w-2 h-2 rounded-full", colorClass)}></div>
                                )}
                              </div>
                              {notification.type === "assessment" ? (
                                <Link
                                  className="text-sm text-foreground line-clamp-2 mb-1 hover:underline text-blue-600 hover:text-blue-800"
                                  to={AppRoute.csms.contractManagementDetails.url}
                                  search={{ contractId: notification?.contractId }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification.id);
                                  }}
                                >
                                  {notification.message}
                                </Link>
                              ) : notification.type === "certificate" ? (
                                <Link
                                  className="text-sm text-foreground line-clamp-2 mb-1 hover:underline text-blue-600 hover:text-blue-800"
                                  to={AppRoute.csms.qualification.url}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification.id);
                                  }}
                                >
                                  {notification.message}
                                </Link>
                              ) : (
                                <Link
                                  className="text-sm text-foreground line-clamp-2 mb-1"
                                  to={AppRoute.csms.contractManagementDetails.url}
                                  search={{ contractId: notification?.contractId }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleNotificationClick(notification.id);
                                  }}
                                >
                                  {notification.message}
                                </Link>
                              )}
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{notification.contractName || t($ => $.notification.csmsNotification)}</span>
                                <span>•</span>
                                <span>{string_date_formatted({ localeId: 'id', dateString: notification.triggeredAt, format: 'dd-MM-yyyy HH:mm' })}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
          {unreadCount > 0 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNavigation}
                  className="w-full text-xs"
                >
                  {t($ => $.notification.viewAllNotifications)} ({unreadCount} {t($ => $.notification.unread)})
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const logOffMutation = useLogoutMutation();
  const changePasswordMutation = useChangePassword();

  const onLogoutClick = () => {
    setConfirmationModal({
      title: t($ => $.dialog.logOutTitle),
      desc: t($ => $.dialog.logOutDesc),
      textConfirm: t($ => $.shared.logout),
      textCancel: t($ => $.shared.cancel),
      onConfirmClick: () => {
        logOffMutation.mutate(undefined, {
          onSuccess: () => {
            setConfirmationModal(null);
          },
          onError: () => {
            setConfirmationModal(null);
          }
        });
      },
      onCancelClick: () => setConfirmationModal(null),
    })
  }

  const ChangePassword = () => {
    const formData = {
      form: {
        currentPassword: {
          type: "password",
          name: "currentPassword",
          label: t($ => $.shared.currentPassword),
          placeholder: t($ => $.shared.currentPasswordPlaceholder),
        },
        newPassword: {
          type: "password",
          name: "newPassword",
          label: t($ => $.shared.newPassword),
          placeholder: t($ => $.shared.newPasswordPlaceholder),
        },
      },
      schema: {
        currentPassword: z.string().min(8, t($ => $.shared.passwordMinLength)),
        newPassword: z.string().min(8, t($ => $.shared.passwordMinLength)),
      },
      defaultValue: {
        currentPassword: "",
        newPassword: "",
      }
    };

    setChangePasswordModal({
      title: t($ => $.dialog.changePasswordTitle),
      desc: t($ => $.dialog.changePasswordDesc),
      defaultValue: formData.defaultValue,
      child: formData.form,
      schema: formData.schema,
      content: <FormUserChangePassword />,
      textConfirm: t($ => $.labels.changePassword),
      textCancel: t($ => $.shared.cancel),
      onCancelClick: () => setChangePasswordModal(null),
      onConfirmClick: (body: Record<string, any>) => {
        changePasswordMutation.mutate({
          body: {
            CurrentPassword: body.currentPassword,
            newPassword: body.newPassword
          }
        }, {
          onSuccess: (success: any) => {
            showNotifSuccess({ message: success?.message || t($ => $.shared.passwordChangedSuccess) });
            setChangePasswordModal(null);
          },
          onError: (error: any) => {
            showNotifError({ message: error?.response?.data?.message || error?.message || t($ => $.shared.passwordChangedError) });
          }
        });
      },
    })
  }

  return (
    <header
      className='sticky top-0 py-1 bg-muted flex h-12 items-center justify-between gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-10 rounded-l-lg'>
      <div className='flex items-center gap-2 pl-2 flex-1'>
        <SidebarTrigger variant={"outline"} onClick={() => { }} />
        <Separator orientation={"vertical"} className={'h-6'} style={{ height: "20px" }} />
        {isAdminUserOrAuditor(user) ? <Breadcrumbs /> : null}
        {title}
      </div>

      <div className='flex items-center gap-2 px-4'>
        <TutorialMenu />
        <div data-tour="nav-notif" className="inline-flex"><NotificationDropdown /></div>
        <ThemeToggle />
        <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant={"ghost"} size={"icon"} className='rounded-full' data-tour="nav-profile">
              <FaRegUser />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div className={"flex flex-row gap-2 items-center"}>
                <Avatar className='h-8 w-8 rounded-full'>
                  <AvatarImage
                    src={user?.image || ''}
                    alt={user?.name || ''}
                  />
                  <AvatarFallback className='rounded-lg text-background font-bold bg-chart-3 shadow-md'>{user ? user?.user?.name?.substring(0, 2)?.toUpperCase() : "U"}</AvatarFallback>
                </Avatar>
                <div className={"flex flex-col"}>
                  <div className='truncate font-semibold'>{user?.user?.name ?? ""}</div>
                  <div className={'text-xs text-muted-foreground'}>{user?.user?.email ?? ""}</div>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to={AppRoute.user.profile.url}>
                <User className="h-4 w-4" />
                {t($ => $.shared.userProfile)}
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className='flex items-center gap-2' onClick={ChangePassword}>
              <TbLockPassword /> {t($ => $.shared.changePassword)}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { onLogoutClick(); setUserMenuOpen(false); }}><MdLogout /> {t($ => $.shared.logout)}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {confirmationModal && <DialogModal modal={confirmationModal} />}
      {changePasswordModal && <DialogModalForm modal={changePasswordModal} />}
    </header>
  );
}