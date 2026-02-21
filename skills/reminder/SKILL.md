# Reminder Skill

Set up one-time or recurring reminders for the user.

## When to Use

**USE this skill when the user asks to:**
- "Remind me to [do something] [at/in/every/...] [time]"
- "Set a reminder for [time] to [do something]"
- "Don't forget to [do something] [time]"
- "Notify me [time] about [something]"

**DON'T use this skill when:**
- The user is asking to list current reminders (use core /reminders command instead).
- The user is asking to cancel a reminder.
- The user is asking to work with notes (use apple-notes skill).

## Instructions

1.  **Extract the Task**: Identify what the user wants to be reminded about.
2.  **Extract the Time**: Identify the temporal expression (e.g., "in 2 hours", "every day at 8am").
3.  **Schedule**: Call the `schedule_reminder` tool with the extracted time and message.

## Tool: schedule_reminder

**Arguments**:
- `time`: (string) Natural language time expression (e.g., "in 5 minutes", "tomorrow at 3pm", "every Monday").
- `message`: (string) The content of the reminder.

## Strategy

- Be precise with the `message`. If the user says "remind me to drink water", the message should be "Drink water".
- If the user provides a vague time, ask for clarification if necessary, or use your best judgment (e.g., "later today" could be "in 4 hours").
- The system will automatically handle parsing the natural language `time` string into a cron expression.

## Example Workflow

User Goal: "remind me to call Mom in 20 minutes"

1.  Call `schedule_reminder(time="in 20 minutes", message="Call Mom")`.
2.  Respond to the user: "Sure! I'll remind you to Call Mom in 20 minutes."
