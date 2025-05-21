// Define interfaces for type safety
export interface IEmailRequestBody {
  name?: string;
  to?: string;
  verificationURL?: string;
  role?: string;
  password?: string;
  use?: string;
  schedule?: {
    on?: string | Date;
    start?: string;
    end?: string;
  };
  meetingLink?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
  otp?: string;
  message?: string;
}

export interface IEmailResponse {
  id: string;
  [key: string]: any;
}