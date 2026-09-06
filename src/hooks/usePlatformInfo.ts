import { useEffect, useState } from "react";
import { publicApi } from "../utils/axios";

export type PlanFeature = { text: string; note?: string | null };

export type SubscriptionPlanItem = {
  id: string;
  name: string;
  price: string;
  raw_price: number;
  period: string;
  tagline?: string;
  popular?: boolean;
  cta?: string;
  paystack_plan_code?: string | null;
  max_teachers?: number | null;
  max_students?: number | null;
  duration_in_days?: number;
  currency?: string;
  features?: PlanFeature[];
};

export type PlatformInfo = {
  support_whatsapp: string;
  support_whatsapp_raw: string;
  support_email: string;
  platform_fee_per_student: number;
  formatted_platform_fee: string;
  sales_partner_term_1_commission: number;
  sales_partner_retention_commission: number;
  promo?: {
    title: string;
    description: string;
    bonus_days: number;
    min_students: number;
  } | null;
};

const DEFAULT_PLATFORM_INFO: PlatformInfo = {
  support_whatsapp: "2348165748374",
  support_whatsapp_raw: "08165748374",
  support_email: "support@schoolprofit.ng",
  platform_fee_per_student: 1000,
  formatted_platform_fee: "₦1,000",
  sales_partner_term_1_commission: 30,
  sales_partner_retention_commission: 12,
  promo: null,
};

let cachedPlatformInfo: PlatformInfo | null = null;
let cachedPlans: SubscriptionPlanItem[] | null = null;

export function getWhatsAppUrl(phone?: string, text?: string) {
  const number = phone || cachedPlatformInfo?.support_whatsapp || "2348165748374";
  const cleanNumber = number.replace(/[^0-9]/g, "");
  const defaultText = "Hello SchoolProfit, I would like to learn more about the school growth and profit management platform.";
  const encodedText = encodeURIComponent(text || defaultText);
  return `https://wa.me/${cleanNumber}?text=${encodedText}`;
}

export function usePlatformInfo() {
  const [plans, setPlans] = useState<SubscriptionPlanItem[]>(cachedPlans || []);
  const [platform, setPlatform] = useState<PlatformInfo>(cachedPlatformInfo || DEFAULT_PLATFORM_INFO);
  const [loading, setLoading] = useState(!cachedPlans);
  const [error, setError] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        const res = await publicApi.get("/frontend/subscription-plans");
        if (!isMounted) return;

        const plansData = Array.isArray(res.data?.data) ? res.data.data : [];
        const platformData = res.data?.platform || DEFAULT_PLATFORM_INFO;

        cachedPlans = plansData;
        cachedPlatformInfo = platformData;

        setPlans(plansData);
        setPlatform(platformData);
      } catch (err) {
        if (!isMounted) return;
        setError(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();

    return () => {
      isMounted = false;
    };
  }, []);

  const whatsappLink = (message?: string) => getWhatsAppUrl(platform.support_whatsapp, message);

  return {
    plans,
    platform,
    loading,
    error,
    whatsappLink,
    whatsappNumber: platform.support_whatsapp,
    formattedPlatformFee: platform.formatted_platform_fee || "₦1,000",
  };
}
