export type PhysicalReportResponse = {
  classification: "physical";
  seq: number;
  public_id: string;
  latitude: number;
  longitude: number;
  severity_level: number;
};
