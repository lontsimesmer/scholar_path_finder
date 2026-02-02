-- Update the payment_status check constraint to include pending statuses
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_payment_status_check;

ALTER TABLE public.leads ADD CONSTRAINT leads_payment_status_check 
CHECK (payment_status = ANY (ARRAY['unpaid'::text, 'paid'::text, 'refunded'::text, 'pending'::text, 'mobile_money_pending'::text]));