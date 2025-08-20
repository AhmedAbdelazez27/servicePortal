export interface RequestComplaintDto {
  id?: number;
  userId?: string;
  complaintType: number;
  contactNumber: string;
  applicantName: string;
  details: string;
  email?: string | null;
  notes?: string | null;
  requestDate: string;
  mainApplyServiceId?: number;
  complaintTypeName?: string;
}

export interface CreateRequestComplaintDto {
  userId: string | null;
  complaintType: number;
  contactNumber: string;
  applicantName: string;
  details: string;
  email?: string | null;
  notes?: string | null;
  requestDate: string;
}

export interface ComplaintTypeDto {
  id: number;
  text: string;
  value: string;
}
