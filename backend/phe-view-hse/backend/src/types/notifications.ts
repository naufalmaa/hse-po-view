// src/types/notifications.ts

export type NotificationType = 'employee' | 'csms' | 'general';

// Base notification interface
export interface BaseNotification {
  id: string;
  alarmId: string;
  isRead: boolean;
  readAt: Date | null;
  message: string;
  status: string;
  triggeredAt: Date;
  type: NotificationType;
}

// Employee notification interface
export interface EmployeeNotification extends BaseNotification {
  type: 'employee';
  employee: {
    id: string;
    name: string;
  };
  csms: Record<string, never>; // Empty object for employee notifications
}

// CSMS notification interface
export interface CSMSNotification extends BaseNotification {
  type: 'csms';
  employee: Record<string, never>; // Empty object for CSMS notifications
  csms: {
    contract?: {
      id: string;
      title: string;
      contractor: {
        id: string;
        name: string;
      };
    };
    qualification?: {
      id: string;
      title: string;
      contractor: {
        id: string;
        name: string;
      };
    };
  };
}

// General notification interface
export interface GeneralNotification extends BaseNotification {
  type: 'general';
  employee: Record<string, never>; // Empty object
  csms: Record<string, never>; // Empty object
}

// Union type for all notification types
export type Notification = EmployeeNotification | CSMSNotification | GeneralNotification;

// Specific CSMS notification types
export interface CSMSContractNotification extends CSMSNotification {
  csms: {
    contract: {
      id: string;
      title: string;
      contractor: {
        id: string;
        name: string;
      };
    };
  };
}

export interface CSMSQualificationNotification extends CSMSNotification {
  csms: {
    qualification: {
      id: string;
      title: string;
      contractor: {
        id: string;
        name: string;
      };
    };
  };
}