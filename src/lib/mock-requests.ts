export type RequestStatus = "pending" | "approved" | "rejected" | "needs-changes";

export type EventRequest = {
  id: string;
  title: string;
  organization: string;
  requester: string;
  date: string;
  startTime: string;
  endTime: string;
  attendance: number;
  room: string;
  status: RequestStatus;
  hasFood: boolean;
  externalGuests: boolean;
  afterHours: boolean;
  itNeeds: boolean;
  submittedAt: string;
};

export const MOCK_REQUESTS: EventRequest[] = [
  {
    id: "REQ-1042",
    title: "NSBE General Body Meeting",
    organization: "NSBE — Howard Chapter",
    requester: "J. Abeje",
    date: "2026-05-04",
    startTime: "18:00",
    endTime: "20:00",
    attendance: 75,
    room: "L.K. Downing 1018",
    status: "pending",
    hasFood: true,
    externalGuests: false,
    afterHours: true,
    itNeeds: true,
    submittedAt: "2026-04-27",
  },
  {
    id: "REQ-1041",
    title: "Architecture Senior Showcase",
    organization: "AIAS",
    requester: "G. Dawite",
    date: "2026-05-12",
    startTime: "17:00",
    endTime: "21:00",
    attendance: 240,
    room: "Mackey Atrium",
    status: "approved",
    hasFood: true,
    externalGuests: true,
    afterHours: true,
    itNeeds: true,
    submittedAt: "2026-04-22",
  },
  {
    id: "REQ-1040",
    title: "Robotics Club Workshop",
    organization: "Bison Robotics",
    requester: "P. Collins",
    date: "2026-05-02",
    startTime: "14:00",
    endTime: "16:00",
    attendance: 28,
    room: "L.K. Downing 2150",
    status: "approved",
    hasFood: false,
    externalGuests: false,
    afterHours: false,
    itNeeds: true,
    submittedAt: "2026-04-20",
  },
  {
    id: "REQ-1039",
    title: "Industry Networking Night",
    organization: "SHPE",
    requester: "N. Bereketab",
    date: "2026-05-09",
    startTime: "19:00",
    endTime: "22:00",
    attendance: 180,
    room: "Engineering Commons",
    status: "needs-changes",
    hasFood: true,
    externalGuests: true,
    afterHours: true,
    itNeeds: false,
    submittedAt: "2026-04-25",
  },
  {
    id: "REQ-1038",
    title: "Faculty Research Talk",
    organization: "Dean's Office",
    requester: "Dr. Williams",
    date: "2026-04-30",
    startTime: "12:00",
    endTime: "13:00",
    attendance: 45,
    room: "L.K. Downing 1018",
    status: "rejected",
    hasFood: false,
    externalGuests: false,
    afterHours: false,
    itNeeds: true,
    submittedAt: "2026-04-18",
  },
];

export function riskScore(r: EventRequest): { level: "low" | "medium" | "high"; reasons: string[] } {
  const reasons: string[] = [];
  if (r.attendance >= 150) reasons.push("Large attendance");
  if (r.externalGuests) reasons.push("External guests");
  if (r.afterHours) reasons.push("After-hours");
  if (r.hasFood) reasons.push("Food service");
  const score = (r.attendance >= 150 ? 2 : r.attendance >= 75 ? 1 : 0)
    + (r.externalGuests ? 1 : 0)
    + (r.afterHours ? 1 : 0)
    + (r.hasFood ? 1 : 0);
  const level = score >= 4 ? "high" : score >= 2 ? "medium" : "low";
  return { level, reasons };
}