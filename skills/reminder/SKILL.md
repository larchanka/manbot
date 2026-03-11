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
3.  **Schedule**: Call the `schedule_reminder` tool with the extracted time, message, and `isAction` flag.
4. **User instructions**: If user's request contains instructions and actions for YOU to DO something (e.g., "check email", "search the web"), set `isAction: true` and include the instructions in the `message`. If it's just a passive text reminder to the user to do something themselves, omit `isAction` or set it to `false`.

## Tool: schedule_reminder

**Arguments**:
- `time`: (string) Natural language time expression (e.g., "in 5 minutes", "tomorrow at 3pm", "every Monday").
- `message`: (string) The content of the reminder or the instruction for the action to take.
- `isAction`: (boolean, optional) Set to `true` if the reminder requires YOU (the AI) to execute a task, such as checking emails or searching the web. Set to `false` or omit if it's just a text reminder for the user.

## Strategy

- Be precise with the `message`. If user's request contains instructions for the AI to perform an action, include them **ALL** into the reminder message and be SURE to set `isAction: true`.
- If the user provides a vague time, ask for clarification if necessary, or use your best judgment (e.g., "later today" could be "in 4 hours").
- The system will automatically handle parsing the natural language `time` string into a cron expression.

## Example Workflow

User Goal: "check my email and mark spam in 20 minutes"

1.  Call `schedule_reminder(time="in 20 minutes", message="Check inbox for new email. Mark spam", isAction=true)`.
2.  Respond to the user: "Sure! Your email will be checked in 20 minutes."
