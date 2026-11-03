import auditoriumImg from "@/assets/room-auditorium.jpg";
import conferenceImg from "@/assets/room-conference.jpg";
import innovationImg from "@/assets/room-innovation.jpg";
import studioImg from "@/assets/room-studio.jpg";
import seminarImg from "@/assets/room-seminar.jpg";
import atriumImg from "@/assets/room-atrium.jpg";

/** Canonical CEA building labels — one spelling per building. */
export const BUILDINGS = {
  LKD: "L.K. Downing Hall",
  ARCH: "Architecture Building",
} as const;

export type BuildingName = (typeof BUILDINGS)[keyof typeof BUILDINGS];

export type Room = {
  id: string;
  name: string;
  building: BuildingName;
  capacity: number;
  features: string[];
  floor: string;
  image: string;
};

export const ROOMS: Room[] = [
  {
    id: "lkd-aud",
    name: "Downing Hall Auditorium",
    building: BUILDINGS.LKD,
    floor: "Floor 1",
    capacity: 250,
    features: ["Projector", "Sound System", "Stage", "Wheelchair Access"],
    image: auditoriumImg,
  },
  {
    id: "lkd-confa",
    name: "LKD Conference Room A",
    building: BUILDINGS.LKD,
    floor: "Floor 2",
    capacity: 40,
    features: ["Projector", "Whiteboard", "Video Conferencing"],
    image: conferenceImg,
  },
  {
    id: "innovation",
    name: "Innovation Lab",
    building: BUILDINGS.LKD,
    floor: "Floor 3",
    capacity: 30,
    features: ["3D Printers", "Workbenches", "Projector", "Whiteboard"],
    image: innovationImg,
  },
  {
    id: "arch-mp-b",
    name: "Multipurpose Room B",
    building: BUILDINGS.ARCH,
    floor: "Floor 1",
    capacity: 80,
    features: ["Projector", "Movable Seating", "Sound System"],
    image: studioImg,
  },
  {
    id: "seminar-201",
    name: "Seminar Room 201",
    building: BUILDINGS.ARCH,
    floor: "Floor 2",
    capacity: 25,
    features: ["Smart Board", "Video Conferencing", "Whiteboard"],
    image: seminarImg,
  },
  {
    id: "atrium",
    name: "Grand Atrium",
    building: BUILDINGS.LKD,
    floor: "Floor 1",
    capacity: 150,
    features: ["Open Floor", "Natural Lighting", "Reception"],
    image: atriumImg,
  },
];

const roomById = new Map(ROOMS.map((room) => [room.id, room]));

/**
 * Look up a room by stable id.
 * Throws on missing/blank ids so callers fail loudly instead of showing ghost rooms.
 */
export function getRoomById(id: string): Room {
  const trimmed = id?.trim();
  if (!trimmed) {
    throw new Error("Room id is required");
  }
  const room = roomById.get(trimmed);
  if (!room) {
    throw new Error(`Unknown room id: ${trimmed}`);
  }
  return room;
}

/** Safe label for UI — never throws; falls back if the id is unknown. */
export function getRoomDisplayName(id: string): string {
  try {
    return getRoomById(id).name;
  } catch {
    return id?.trim() ? `Unknown room (${id})` : "Unassigned room";
  }
}

/** Every feature listed by at least one room, for the "required features" picker. */
export const ROOM_FEATURES: readonly string[] = [
  ...new Set(ROOMS.flatMap((room) => room.features)),
].sort((a, b) => a.localeCompare(b));
