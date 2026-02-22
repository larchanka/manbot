# Email Skill

Manage Gmail communications using the `gog` CLI.
Mandatory tool: Use the `shell` tool to execute `gog` commands.

## When to Use

✅ **USE this skill when:**
- Searching for specific emails, threads, or attachments.
- Sending, drafting, or replying to email messages.
- Finding information within the inbox (e.g., "Find my flight number").
- Checking for unread messages or recent updates.

## When NOT to Use

❌ **DON'T use this skill when:**
- Sending bulk marketing/spam campaigns.
- Editing contact details or labels.

## Commands

### 📧 Searching
```bash
# Search threads (grouped by conversation)
gog gmail search 'newer_than:2d' --max 5

# Search individual messages (raw list)
gog gmail messages search "from:updates@example.com" --max 10

# Search for unread emails
gog gmail search "is:unread"
```

### 📩 Sending & Replying
```bash
# Quick one-line email
gog gmail send --to "user@example.com" --subject "Update" --body "Everything is on track."

# Send with multi-line body (Heredoc)
gog gmail send --to "user@example.com" --subject "Meeting Notes" --body-file - <<'EOF'
Hi Team,

Notes from today:
1. Budget approved
2. Deadline moved to Friday

Best,
AI Agent
EOF

# Reply to a specific message ID
gog gmail send --to "a@b.com" --subject "Re: Hello" --reply-to-message-id <msgId> --body "Got it, thanks!"
```

### 📝 Drafting
```bash
# Create a draft instead of sending
gog gmail drafts create --to "client@example.com" --subject "Proposal" --body-file - <<'EOF'
Draft content goes here.
EOF
```

## Email Formatting

### Plain Text vs HTML
- **Default:** Use `--body` for short strings or `--body-file -` for multi-line text.
- **Rich Text:** Use `--body-html` only when formatting (bold, links) is required.
  - Supported tags: `<p>`, `<strong>`, `<ul>/<li>`, `<a href="...">`.

```bash
# HTML Example
gog gmail send --to "a@b.com" --subject "Links" --body-html "Click <a href='https://google.com'>here</a> to view."
```

## Tool Call Examples (JSON)

When using this skill, format your tool calls as follows:

Search for Unread Emails
```json
{
  "name": "shell",
  "arguments": {
    "command": "gog gmail search 'is:unread'"
  }
}
```

Send a Simple Email
```json
{
  "name": "shell",
  "arguments": {
    "command": "gog gmail send --to \"user@example.com\" --subject \"Update\" --body \"The report is ready.\""
  }
}
```

Reply to a Message
```json
{
  "name": "shell",
  "arguments": {
    "command": "gog gmail send --to \"user@example.com\" --subject \"Re: Hello\" --reply-to-message-id \"msg-123\" --body \"Got it!\""
  }
}
```

## Notes

- **Confirmation:** Always show the user the recipient and subject before executing a `send` command.
- **Message IDs:** When replying, ensure the `<msgId>` is the specific ID from a `messages search`.
- **JSON Output:** Use the `--json` flag to parse specific fields like `snippet`, `from`, or `date`.