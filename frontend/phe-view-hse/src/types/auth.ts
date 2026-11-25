import { USER_ROLE } from "@/constants/app-enum";
import { SubmitHandler } from "react-hook-form";

export type LoginFormValues = {
  email: string
  password: string,
}

export type LoginProps = {
  onFormSubmit: SubmitHandler<LoginFormValues>
}

export type AuthProps = {
  token?: string | null
  user: {
    id: string;
    name: string;
    emailVerified: boolean;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null | undefined;
    role?: string,
    hssePassportNumber?: string
  } | null
}

export interface AuthContext {
  isAuthenticated: boolean
  login: (user: AuthProps) => Promise<void>
  logout: () => Promise<void>
  user: AuthProps | null
}

export const isAdmin = (user: AuthProps | null) => {
  return user?.user?.role === USER_ROLE.admin.value
}

export const isUser = (user: AuthProps | null) => {
  return user?.user?.role === USER_ROLE.user.value
}

export const isContractor = (user: AuthProps | null) => {
  return user?.user?.role === USER_ROLE.contractor.value
}

export const isCrew = (user: AuthProps | null) => {
  return user?.user?.role === USER_ROLE.crew.value
}

export const isAdminOrUser = (user: AuthProps | null) => {
  const users = [USER_ROLE.admin.value, USER_ROLE.user.value];
  return users.includes(user?.user?.role || '');
}

export const isApproval = (user: AuthProps | null) => {
  const users = [USER_ROLE.evaluator.value, USER_ROLE.verifikator.value, USER_ROLE.manager.value];
  return users.includes(user?.user?.role || '');
}

export const isAdminUserOrAuditor = (user: AuthProps | null) => {
  const users = [USER_ROLE.admin.value, USER_ROLE.user.value, USER_ROLE.evaluator.value, USER_ROLE.verifikator.value, USER_ROLE.manager.value];
  return users.includes(user?.user?.role || '');
}

export const isEmployee = (user: AuthProps | null) => {
  const users = ["employee"];
  return users.includes(user?.user?.role || '');
}

export const isAdminString = (role: string) => {
  return role === USER_ROLE.admin.value
}

export const isContractorString = (role: string) => {
  return role === USER_ROLE.contractor.value
}

export const isCrewString = (role: string) => {
  return role === USER_ROLE.crew.value
}

export const isAdminOrUserString = (role: string) => {
  return role === USER_ROLE.admin.value || role === USER_ROLE.user.value
}
