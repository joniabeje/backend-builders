export type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  features: string[];
};

export const ROOMS: Room[] = [
  { id: "lkd-2150", name: "L.K. Downing 2150", building: "L.K. Downing Hall", capacity: 30, features: ["Projector", "Whiteboard"] },
  { id: "lkd-1018", name: "L.K. Downing 1018", building: "L.K. Downing Hall", capacity: 60, features: ["AV System", "Mic"] },
  { id: "lkd-aud", name: "Downing Auditorium", building: "L.K. Downing Hall", capacity: 220, features: ["Stage", "Full AV", "Live Stream"] },
  { id: "arch-300", name: "Architecture Studio 300", building: "Mackey Building", capacity: 40, features: ["Studio Tables", "Smart Board"] },
  { id: "engr-lounge", name: "Engineering Commons", building: "L.K. Downing Hall", capacity: 90, features: ["Lounge Setup", "Catering Ready"] },
  { id: "atrium", name: "Mackey Atrium", building: "Mackey Building", capacity: 300, features: ["Open Floor", "Reception"] },
];

export function recommendRooms(attendance: number): Room[] {
  if (!attendance || attendance < 1) return [];
  return ROOMS
    .filter((r) => r.capacity >= attendance && r.capacity <= attendance * 3)
    .sort((a, b) => a.capacity - b.capacity)
    .slice(0, 3);
}