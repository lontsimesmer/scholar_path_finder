import { supabase } from "@/integrations/supabase/client";

export async function fetchMTNCurrencies() {
  const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
    body: { action: "get_currencies" },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type RequestMTNPaymentParams = {
  leadId: string;
  phoneNumber: string;
  currency: string;
};

export async function requestMTNPayment({ leadId, phoneNumber, currency }: RequestMTNPaymentParams) {
  const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
    body: {
      action: "request_payment",
      leadId,
      phoneNumber,
      currency,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type CheckMTNPaymentStatusParams = {
  referenceId: string;
  leadId: string;
};

export async function checkMTNPaymentStatus({ referenceId, leadId }: CheckMTNPaymentStatusParams) {
  const { data, error } = await supabase.functions.invoke("mtn-momo-payment", {
    body: {
      action: "check_status",
      referenceId,
      leadId,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

type RequestOrangePaymentParams = {
  leadId: string;
  phoneNumber: string;
};

export async function requestOrangePayment({ leadId, phoneNumber }: RequestOrangePaymentParams) {
  const { data, error } = await supabase.functions.invoke("process-mobile-money", {
    body: {
      leadId,
      provider: "orange",
      phoneNumber,
      amount: 25,
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
