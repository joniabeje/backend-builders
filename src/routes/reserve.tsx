import { createFileRoute } from "@tanstack/react-router";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { FormField, FormSection, ToggleField, inputClassName } from "@/components/form-controls";
import { ReservationSuccess } from "@/components/reserve/ReservationSuccess";
import { RoomRecommendations } from "@/components/reserve/RoomRecommendations";
import { ValidationPanel } from "@/components/reserve/ValidationPanel";
import { useReservationForm } from "@/hooks/use-reservation-form";
import { ROOMS } from "@/lib/rooms";
import { CalendarCheck2 } from "lucide-react";

export const Route = createFileRoute("/reserve")({
  head: () => ({
    meta: [
      { title: "Reserve a Space — CEA Reserve" },
      {
        name: "description",
        content:
          "Submit an event space reservation with real-time validation and smart room recommendations.",
      },
    ],
  }),
  component: ReservePage,
});

function ReservePage() {
  const { form, submitted, validation, recommendations, update, submit, reset } =
    useReservationForm();
  const { attendance, issues, requiredFieldsFilled, canSubmit } = validation;

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-20">
          <ReservationSuccess eventTitle={form.title} onNewRequest={reset} />
        </main>
        <SiteFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-primary">
            <CalendarCheck2 className="h-3.5 w-3.5" /> New Reservation
          </div>
          <h1 className="mt-4 text-3xl font-bold text-foreground md:text-4xl">
            Reserve an event space
          </h1>
          <p className="mt-2 text-muted-foreground">
            Real-time validation guides you through a complete request.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="space-y-8 rounded-2xl border border-border bg-card p-6 md:p-8 shadow-card"
          >
            <FormSection title="Event Information">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Event Title *">
                  <input
                    className={inputClassName}
                    value={form.title}
                    onChange={(e) => update("title", e.target.value)}
                    placeholder="NSBE General Body Meeting"
                  />
                </FormField>
                <FormField label="Organization *">
                  <input
                    className={inputClassName}
                    value={form.organization}
                    onChange={(e) => update("organization", e.target.value)}
                    placeholder="NSBE — Howard Chapter"
                  />
                </FormField>
                <FormField label="Faculty Advisor *">
                  <input
                    className={inputClassName}
                    value={form.advisor}
                    onChange={(e) => update("advisor", e.target.value)}
                    placeholder="Dr. Last Name"
                  />
                </FormField>
                <FormField label="Expected Attendance *">
                  <input
                    type="number"
                    min={1}
                    className={inputClassName}
                    value={form.attendance}
                    onChange={(e) => update("attendance", e.target.value)}
                    placeholder="50"
                  />
                </FormField>
                <FormField label="Event Purpose *" full>
                  <textarea
                    rows={3}
                    className={inputClassName}
                    value={form.purpose}
                    onChange={(e) => update("purpose", e.target.value)}
                    placeholder="Brief description of the event..."
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Date & Time">
              <div className="grid gap-4 md:grid-cols-3">
                <FormField label="Date *">
                  <input
                    type="date"
                    className={inputClassName}
                    value={form.date}
                    onChange={(e) => update("date", e.target.value)}
                  />
                </FormField>
                <FormField label="Start *">
                  <input
                    type="time"
                    className={inputClassName}
                    value={form.startTime}
                    onChange={(e) => update("startTime", e.target.value)}
                  />
                </FormField>
                <FormField label="End *">
                  <input
                    type="time"
                    className={inputClassName}
                    value={form.endTime}
                    onChange={(e) => update("endTime", e.target.value)}
                  />
                </FormField>
              </div>
            </FormSection>

            <FormSection title="Room Selection">
              <RoomRecommendations
                attendance={attendance}
                rooms={recommendations}
                selectedRoomId={form.room}
                onSelect={(roomId) => update("room", roomId)}
              />
              <FormField label="Choose Room *">
                <select
                  className={inputClassName}
                  value={form.room}
                  onChange={(e) => update("room", e.target.value)}
                >
                  <option value="">Select a room…</option>
                  {ROOMS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} (capacity {r.capacity})
                    </option>
                  ))}
                </select>
              </FormField>
            </FormSection>

            <FormSection title="Additional Services">
              <div className="grid gap-3 sm:grid-cols-3">
                <ToggleField
                  label="Food / catering"
                  checked={form.hasFood}
                  onChange={(v) => update("hasFood", v)}
                />
                <ToggleField
                  label="External guests"
                  checked={form.externalGuests}
                  onChange={(v) => update("externalGuests", v)}
                />
                <ToggleField
                  label="IT / AV equipment"
                  checked={form.itNeeds}
                  onChange={(v) => update("itNeeds", v)}
                />
              </div>
            </FormSection>

            <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
              <p className="text-xs text-muted-foreground">Fields marked * are required.</p>
              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground shadow-elegant transition-smooth disabled:cursor-not-allowed disabled:opacity-50 hover:opacity-95"
              >
                Submit Request
              </button>
            </div>
          </form>

          <aside className="space-y-4 lg:sticky lg:top-24 self-start">
            <ValidationPanel issues={issues} requiredFieldsFilled={requiredFieldsFilled} />

            <div className="rounded-xl bg-gradient-primary p-5 text-primary-foreground shadow-elegant">
              <div className="text-xs font-medium uppercase tracking-wider text-gold">Tip</div>
              <p className="mt-2 text-sm">
                Events with food, after-hours timing, or external guests automatically notify
                custodial, security, and IT teams.
              </p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
