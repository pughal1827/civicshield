export type UserRole = 'CITIZEN' | 'AUTHORITY' | 'ADMIN' | 'WORKER';

export interface Department {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  createdAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  departmentId?: string;
  departmentCode?: string;
  departmentName?: string;
  department?: Department;
  createdAt: string;
}
