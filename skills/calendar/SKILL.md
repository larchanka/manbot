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

## Notes
- Confirmation: Always confirm the event summary, date/time, and attendees before creating, updating, or deleting an event.
- Calendar IDs: primary refers to the user's main calendar; other calendars can be referenced by name or email.
- Timezone Awareness: The CLI supports timezone-aware timestamps; prefer ISO timestamps (e.g., 2025-01-15T14:00:00Z).
- JSON Output: Use the --json flag when structured event details are required for parsing.
