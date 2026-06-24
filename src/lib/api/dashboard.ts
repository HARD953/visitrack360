import { apiFetch } from "./client";
import type {
  ExecutiveDashboardData,
  NegotiationsDashboardData,
} from "@/types/dashboard";

export async function fetchDashboardExecutif(
  from: string,
  to: string
): Promise<ExecutiveDashboardData> {
  return apiFetch<ExecutiveDashboardData>(
    `/api/dashboards/executif/?from=${from}&to=${to}`
  );
}

export async function fetchDashboardNegociations(
  from: string,
  to: string
): Promise<NegotiationsDashboardData> {
  return apiFetch<NegotiationsDashboardData>(
    `/api/dashboards/negociations/?from=${from}&to=${to}`
  );
}