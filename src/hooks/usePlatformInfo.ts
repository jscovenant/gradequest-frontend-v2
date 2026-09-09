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
  basic_tier_price_per_student?: number;
  formatted_basic_tier_price?: string;
  standard_cbt_tier_price_per_student?: number;
  formatted_standard_cbt_tier_price?: string;
  annual_full_session_multiplier?: number;
  annual_session_discount_percent?: number;
  default_bank_charge_amount?: number;
  whatsapp_credit_unit_price?: number;
  ai_credit_unit_price?: number;
  sales_partner_term_1_commission: number;
  sales_partner_retention_commission: number;
  promo?: {
    title: string;
    description: string;
    target_tier?: string;
    discount_percent?: number;
    bonus_days: number;
    min_students: number;
    starts_at?: string | null;
    ends_at?: string | null;
  } | null;
};

const DEFAULT_PLATFORM_INFO: PlatformInfo = {
  support_whatsapp: "2348165748374",
  support_whatsapp_raw: "08165748374",
  support_email: "support@schoolprofit.ng",
  platform_fee_per_student: 500,
  formatted_platform_fee: "₦500",
  basic_tier_price_per_student: 300,
  formatted_basic_tier_price: "₦300",
  standard_cbt_tier_price_per_student: 500,
  formatted_standard_cbt_tier_price: "₦500",
  annual_full_session_multiplier: 3,
  annual_session_discount_percent: 0,
  default_bank_charge_amount: 200,
  whatsapp_credit_unit_price: 10,
  ai_credit_unit_price: 25,
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

  const basicPriceFormatted = platform.formatted_basic_tier_price || "₦300";
  const standardCbtPriceFormatted = platform.formatted_standard_cbt_tier_price || "₦500";

  return {
    plans,
    platform,
    loading,
    error,
    whatsappLink,
    whatsappNumber: platform.support_whatsapp,
    formattedPlatformFee: platform.formatted_platform_fee || standardCbtPriceFormatted || "₦500",
    formattedBasicPrice: basicPriceFormatted,
    formattedStandardCbtPrice: standardCbtPriceFormatted,
    basicTierPrice: Number(platform.basic_tier_price_per_student || 300),
    standardCbtTierPrice: Number(platform.standard_cbt_tier_price_per_student || 500),
    annualSessionMultiplier: Number(platform.annual_full_session_multiplier || 3),
    annualSessionDiscountPercent: Number(platform.annual_session_discount_percent || 0),
  };
}
