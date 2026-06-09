export type Screen =
  | "home"
  | "record"
  | "alerts"
  | "metrics"
  | "patientEdit"
  | "settings"
  | "notificationSettings"
  | "targetSettings"
  | "wearable"
  | "sync"
  | "privacy"
  | "appInfo"
  | "report";

export type ChartType = "day" | "week";

export type RecordItem = {
  glucose: number;
  time: string;
  memo: string;
  type?: "manual" | "auto";
};

export type PatientInfo = {
  name: string;
  gender: string;
  birth: string;
};
