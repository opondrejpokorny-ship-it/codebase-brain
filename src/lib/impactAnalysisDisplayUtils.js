import { CURRENT_RISK_CALIBRATION_VERSION } from "@/lib/analysisHistoryUtils";

export const impactRiskStyles = {
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  high: "bg-red-50 text-red-700 border-red-200",
};

export const compatibilityStyles = {
  match: "bg-emerald-50 text-emerald-700 border-emerald-200",
  mismatch: "bg-red-50 text-red-700 border-red-200",
  unknown: "bg-amber-50 text-amber-700 border-amber-200",
};

export function riskCalibrationBadge(analysis = {}) {
  const version = Number(analysis.risk_calibration_version || analysis.riskCalibrationVersion || 1);
  const calibrated = version >= CURRENT_RISK_CALIBRATION_VERSION;
  return {
    calibrated,
    label: calibrated ? `calibrated v${version}` : "legacy calibration",
    className: calibrated ? "bg-blue-50 text-blue-700 border-blue-200" : "bg-slate-50 text-slate-500 border-slate-200",
  };
}
