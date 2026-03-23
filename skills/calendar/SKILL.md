Description: You MUST use this skill for all interactions involving Google Calendar.

# Calendar Skill

Manage Google Calendar events using the `gog` CLI.
Mandatory tool: Use the `shell` tool to execute `gog` commands.

## When to Use

✅ **USE this skill when:**
- Checking upcoming meetings or daily schedules.
- Searching for calendar events by title or keyword.
- Creating, updating, or deleting calendar events.
- Checking availability or scheduling conflicts.
- Responding to meeting invitations (accept/decline/tentative).
- Reviewing team calendars or free/busy blocks.

## When NOT to Use

❌ **DON'T use this skill when:**
- Managing Gmail messages (use the Email Skill).
- Editing Google Contacts.
- Sending meeting notes via email (unless specifically requested).

## Commands

### 📅 Viewing Events
```bash
# Today's events
gog calendar events primary --today

# Tomorrow's events
gog calendar events primary --tomorrow

# Events for the week
gog calendar events primary --week

# Next 3 days
gog calendar events primary --days 3

# Specific date range
gog calendar events primary --from today --to friday

# Fetch events across all calendars
gog calendar events --all

# Fetch events from specific calendars
gog calendar events --cal Work --cal Personal
```

### 🔎 Searching Events

```bash
# Search events by keyword
gog calendar search "meeting"

# Search within time windows
gog calendar search "standup" --today
gog calendar search "planning" --week
gog calendar search "demo" --days 365

# Custom date range
gog calendar search "conference" \
  --from 2025-01-01T00:00:00Z \
  --to 2025-01-31T00:00:00Z \
  --max 50
```

### 📌 Event Details

```bash
# Get a specific event
gog calendar get <calendarId> <eventId>

# JSON output for structured parsing
gog calendar get <calendarId> <eventId> --json
```

### ➕ Creating Events

```bash
# Simple meeting
gog calendar create primary \
  --summary "Meeting" \
  --from 2025-01-15T10:00:00Z \
  --to 2025-01-15T11:00:00Z

# Meeting with attendees
gog calendar create primary \
  --summary "Team Sync" \
  --from 2025-01-15T14:00:00Z \
  --to 2025-01-15T15:00:00Z \
  --attendees "alice@example.com,bob@example.com" \
  --location "Zoom"
```

### ✏️ Updating Events

```bash
# Update event title and time
gog calendar update <calendarId> <eventId> \
  --summary "Updated Meeting" \
  --from 2025-01-15T11:00:00Z \
  --to 2025-01-15T12:00:00Z

# Add attendees without replacing existing ones
gog calendar update <calendarId> <eventId> \
  --add-attendee "alice@example.com,bob@example.com"
```

### ❌ Deleting Events

```bash
gog calendar delete <calendarId> <eventId>
```

### 📩 Invitations

```bash
# Accept meeting
gog calendar respond <calendarId> <eventId> --status accepted

# Decline meeting
gog calendar respond <calendarId> <eventId> --status declined

# Tentative
gog calendar respond <calendarId> <eventId> --status tentative
```

### 🕒 Availability & Conflicts

```bash
# Check free/busy time
gog calendar freebusy \
  --calendars "primary,work@example.com" \
  --from 2025-01-15T00:00:00Z \
  --to 2025-01-16T00:00:00Z

# Check conflicts
gog calendar conflicts --today

# Conflicts across all calendars
gog calendar conflicts --all --today
```

### 👥 Team Calendars

```bash
# Team events today
gog calendar team team@example.com --today

# Team schedule this week
gog calendar team team@example.com --week

# Free/busy overview
gog calendar team team@example.com --freebusy

# Filter by title
gog calendar team team@example.com --query "standup"
```

### 🧠 Special Event Types

```bash
# Focus time
gog calendar focus-time \
  --from 2025-01-15T13:00:00Z \
  --to 2025-01-15T14:00:00Z

# Out of office
gog calendar out-of-office \
  --from 2025-01-20 \
  --to 2025-01-21 \
  --all-day

# Working location
gog calendar working-location \
  --type office \
  --office-label "HQ" \
  --from 2025-01-22 \
  --to 2025-01-23
```

### Tool Call Examples (JSON)

When using this skill, format your tool calls as follows:

Get Today's Events:

```json
{
  "name": "shell",
  "arguments": {
    "command": "gog calendar events primary --today"
  }
}
```

Search for an Event

```json
{
  "name": "shell",
  "arguments": {
    "command": "gog calendar search \"meeting\" --today"
  }
}
```

Create a Meeting

```json
{
  "name": "shell",
  "arguments": {
    "command": "gog calendar create primary --summary \"Team Sync\" --from \"2025-01-15T14:00:00Z\" --to \"2025-01-15T15:00:00Z\""
  }
}
```

Accept Invitation

```json
{
  "name": "shell",
  "arguments": {
    "command": "gog calendar respond primary \"event-123\" --status accepted"
  }
}
```

Delete Event

```json
{
  "name": "shell",
  "arguments": {
    "command": "gog calendar delete primary \"event-123\""
  }
}
```

## All available command examples

```bash
# Calendars
gog calendar calendars
gog calendar acl <calendarId>         # List access control rules
gog calendar colors                   # List available event/calendar colors
gog calendar time --timezone America/New_York
gog calendar users                    # List workspace users (use email as calendar ID)

# Events (with timezone-aware time flags)
gog calendar events <calendarId> --today                    # Today's events
gog calendar events <calendarId> --tomorrow                 # Tomorrow's events
gog calendar events <calendarId> --week                     # This week (Mon-Sun by default; use --week-start)
gog calendar events <calendarId> --days 3                   # Next 3 days
gog calendar events <calendarId> --from today --to friday   # Relative dates
gog calendar events <calendarId> --from today --to friday --weekday   # Include weekday columns
gog calendar events <calendarId> --from 2025-01-01T00:00:00Z --to 2025-01-08T00:00:00Z
gog calendar events --all             # Fetch events from all calendars
gog calendar events --calendars 1,3   # Fetch events from calendar indices (see gog calendar calendars)
gog calendar events --cal Work --cal Personal  # Fetch events from calendars by name/ID
gog calendar event <calendarId> <eventId>
gog calendar get <calendarId> <eventId>                     # Alias for event
gog calendar search "meeting" --today
gog calendar search "meeting" --tomorrow
gog calendar search "meeting" --days 365
gog calendar search "meeting" --from 2025-01-01T00:00:00Z --to 2025-01-31T00:00:00Z --max 50

# Search defaults to 30 days ago through 90 days ahead unless you set --from/--to/--today/--week/--days.
# Tip: set GOG_CALENDAR_WEEKDAY=1 to default --weekday for calendar events output.

# JSON event output includes timezone and localized times (useful for agents).
gog calendar get <calendarId> <eventId> --json
# {
#   "event": {
#     "id": "...",
#     "summary": "...",
#     "startDayOfWeek": "Friday",
#     "endDayOfWeek": "Friday",
#     "timezone": "America/Los_Angeles",
#     "eventTimezone": "America/New_York",
#     "startLocal": "2026-01-23T20:45:00-08:00",
#     "endLocal": "2026-01-23T22:45:00-08:00",
#     "start": { "dateTime": "2026-01-23T23:45:00-05:00" },
#     "end": { "dateTime": "2026-01-24T01:45:00-05:00" }
#   }
# }

# Team calendars (requires Cloud Identity API for Google Workspace)
gog calendar team <group-email> --today           # Show team's events for today
gog calendar team <group-email> --week            # Show team's events for the week (use --week-start)
gog calendar team <group-email> --freebusy        # Show only busy/free blocks (faster)
gog calendar team <group-email> --query "standup" # Filter by event title

# Create and update
gog calendar create <calendarId> \
  --summary "Meeting" \
  --from 2025-01-15T10:00:00Z \
  --to 2025-01-15T11:00:00Z

gog calendar create <calendarId> \
  --summary "Team Sync" \
  --from 2025-01-15T14:00:00Z \
  --to 2025-01-15T15:00:00Z \
  --attendees "alice@example.com,bob@example.com" \
  --location "Zoom"

gog calendar update <calendarId> <eventId> \
  --summary "Updated Meeting" \
  --from 2025-01-15T11:00:00Z \
  --to 2025-01-15T12:00:00Z

# Send notifications when creating/updating
gog calendar create <calendarId> \
  --summary "Team Sync" \
  --from 2025-01-15T14:00:00Z \
  --to 2025-01-15T15:00:00Z \
  --send-updates all

gog calendar update <calendarId> <eventId> \
  --send-updates externalOnly

# Default: no attendee notifications unless you pass --send-updates.
gog calendar delete <calendarId> <eventId> \
  --send-updates all --force

# Recurrence + reminders
gog calendar create <calendarId> \
  --summary "Payment" \
  --from 2025-02-11T09:00:00-03:00 \
  --to 2025-02-11T09:15:00-03:00 \
  --rrule "RRULE:FREQ=MONTHLY;BYMONTHDAY=11" \
  --reminder "email:3d" \
  --reminder "popup:30m"

# Special event types via --event-type (focus-time/out-of-office/working-location)
gog calendar create primary \
  --event-type focus-time \
  --from 2025-01-15T13:00:00Z \
  --to 2025-01-15T14:00:00Z

gog calendar create primary \
  --event-type out-of-office \
  --from 2025-01-20 \
  --to 2025-01-21 \
  --all-day

gog calendar create primary \
  --event-type working-location \
  --working-location-type office \
  --working-office-label "HQ" \
  --from 2025-01-22 \
  --to 2025-01-23

# Dedicated shortcuts (same event types, more opinionated defaults)
gog calendar focus-time --from 2025-01-15T13:00:00Z --to 2025-01-15T14:00:00Z
gog calendar out-of-office --from 2025-01-20 --to 2025-01-21 --all-day
gog calendar working-location --type office --office-label "HQ" --from 2025-01-22 --to 2025-01-23
# Add attendees without replacing existing attendees/RSVP state
gog calendar update <calendarId> <eventId> \
  --add-attendee "alice@example.com,bob@example.com"

gog calendar delete <calendarId> <eventId>

# Invitations
gog calendar respond <calendarId> <eventId> --status accepted
gog calendar respond <calendarId> <eventId> --status declined
gog calendar respond <calendarId> <eventId> --status tentative
gog calendar respond <calendarId> <eventId> --status declined --send-updates externalOnly

# Propose a new time (browser-only flow; API limitation)
gog calendar propose-time <calendarId> <eventId>
gog calendar propose-time <calendarId> <eventId> --open
gog calendar propose-time <calendarId> <eventId> --decline --comment "Can we do 5pm?"

# Availability
gog calendar freebusy --calendars "primary,work@example.com" \
  --from 2025-01-15T00:00:00Z \
  --to 2025-01-16T00:00:00Z
gog calendar freebusy --cal Work --from 2025-01-15T00:00:00Z --to 2025-01-16T00:00:00Z

gog calendar conflicts --calendars "primary,work@example.com" \
  --today                             # Today's conflicts
gog calendar conflicts --all --today # Check conflicts across all calendars
```

## Notes
- Confirmation: Always confirm the event summary, date/time, and attendees before creating, updating, or deleting an event.
- Calendar IDs: primary refers to the user's main calendar; other calendars can be referenced by name or email.
- Timezone Awareness: The CLI supports timezone-aware timestamps; prefer ISO timestamps (e.g., 2025-01-15T14:00:00Z).
- JSON Output: Use the --json flag when structured event details are required for parsing.
