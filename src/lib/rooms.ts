import auditoriumImg from "@/assets/room-auditorium.jpg";
import conferenceImg from "@/assets/room-conference.jpg";
import innovationImg from "@/assets/room-innovation.jpg";
import studioImg from "@/assets/room-studio.jpg";
import seminarImg from "@/assets/room-seminar.jpg";
import atriumImg from "@/assets/room-atrium.jpg";

export type Room = {
  id: string;
  name: string;
  building: string;
  capacity: number;
  features: string[];
  floor: string;
  image: string;
  status: "available" | "reserved";
};

export const ROOMS: Room[] = [
  { id: "lkd-aud", name: "Downing Hall Auditorium", building: "L.K. Downing Hall", floor: "Floor 1", capacity: 250, features: ["Projector", "Sound System", "Stage", "Wheelchair Access"], image: auditoriumImg, status: "available" },
  { id: "lkd-confa", name: "LKD Conference Room A", building: "L.K. Downing Engineering Building", floor: "Floor 2", capacity: 40, features: ["Projector", "Whiteboard", "Video Conferencing"], image: conferenceImg, status: "available" },
  { id: "innovation", name: "Innovation Lab", building: "L.K. Downing Engineering Building", floor: "Floor 3", capacity: 30, features: ["3D Printers", "Workbenches", "Projector", "Whiteboard"], image: innovationImg, status: "reserved" },
  { id: "arch-mp-b", name: "Multipurpose Room B", building: "Architecture Building", floor: "Floor 1", capacity: 80, features: ["Projector", "Movable Seating", "Sound System"], image: studioImg, status: "available" },
  { id: "seminar-201", name: "Seminar Room 201", building: "Architecture Building", floor: "Floor 2", capacity: 25, features: ["Smart Board", "Video Conferencing", "Whiteboard"], image: seminarImg, status: "available" },
  { id: "atrium", name: "Grand Atrium", building: "Downing Hall", floor: "Floor 1", capacity: 150, features: ["Open Floor", "Natural Lighting", "Reception"], image: atriumImg, status: "available" },
];

export function recommendRooms(attendance: number): Room[] {
  if (!attendance || attendance < 1) return [];
  return ROOMS
    .filter((r) => r.capacity >= attendance && r.capacity <= attendance * 3)
    .sort((a, b) => a.capacity - b.capacity)
    .slice(0, 3);
}