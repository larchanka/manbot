# Email Skill

Manage Gmail communications using the `gog` CLI.
Mandatory tool: Use the `shell` tool to execute `gog` commands.

## When to Use

✅ **USE this skill when:**
- Searching for specific emails, threads, or attachments.
- Sending, drafting, or replying to email messages.
- Finding information within the inbox (e.g., "Find my flight number").
- Checking for unread messages or recent updates.
- Archive emails and move them from INBOX folder

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

### 📧 Reading emails

```bash
# Read thread
gog gmail thread get <threadId>

# Read email
gog gmail get <messageId>

# Read email metadata
gog gmail get <messageId> --format metadata
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

### 📦 Archiving
```bash
# Archive email
gog gmail thread modify <msg_id> --remove INBOX
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

## All available command examples

```bash
# Search and read
gog gmail search 'newer_than:7d' --max 10
gog gmail thread get <threadId>
gog gmail thread get <threadId> --download              # Download attachments to current dir
gog gmail thread get <threadId> --download --out-dir ./attachments
gog gmail get <messageId>
gog gmail get <messageId> --format metadata
gog gmail attachment <messageId> <attachmentId>
gog gmail attachment <messageId> <attachmentId> --out ./attachment.bin
gog gmail url <threadId>              # Print Gmail web URL
gog gmail thread modify <threadId> --add STARRED --remove INBOX

# Send and compose
gog gmail send --to a@b.com --subject "Hi" --body "Plain fallback"
gog gmail send --to a@b.com --subject "Hi" --body-file ./message.txt
gog gmail send --to a@b.com --subject "Hi" --body-file -   # Read body from stdin
gog gmail send --to a@b.com --subject "Hi" --body "Plain fallback" --body-html "<p>Hello</p>"
# Reply + include quoted original message (auto-generates HTML quote unless you pass --body-html)
gog gmail send --reply-to-message-id <messageId> --quote --to a@b.com --subject "Re: Hi" --body "My reply"
# Draft reply + quote (create requires explicit reply target)
gog gmail drafts create --reply-to-message-id <messageId> --quote --subject "Re: Hi" --body "My reply"
# Draft reply + quote (update accepts explicit target; else falls back to latest non-draft, non-self message in thread)
gog gmail drafts update <draftId> --reply-to-message-id <messageId> --quote --subject "Re: Hi" --body "My reply"
gog gmail drafts update <draftId> --quote --subject "Re: Hi" --body "My reply"
gog gmail drafts list
gog gmail drafts create --subject "Draft" --body "Body"
gog gmail drafts create --to a@b.com --subject "Draft" --body "Body"
gog gmail drafts update <draftId> --subject "Draft" --body "Body"
gog gmail drafts update <draftId> --to a@b.com --subject "Draft" --body "Body"
gog gmail drafts send <draftId>

# Labels
gog gmail labels list
gog gmail labels get INBOX --json  # Includes message counts
gog gmail labels create "My Label"
gog gmail labels rename "Old Label" "New Label"
gog gmail labels modify <threadId> --add STARRED --remove INBOX
gog gmail labels delete <labelIdOrName>  # Deletes user label (guards system labels; confirm)

# Batch operations
gog gmail batch delete <messageId> <messageId>
gog gmail batch modify <messageId> <messageId> --add STARRED --remove INBOX

# Filters
gog gmail filters list
gog gmail filters create --from 'noreply@example.com' --add-label 'Notifications'
gog gmail filters delete <filterId>
gog gmail filters export --out ./filters.json

# Settings
gog gmail autoforward get
gog gmail autoforward enable --email forward@example.com
gog gmail autoforward disable
gog gmail forwarding list
gog gmail forwarding add --email forward@example.com
gog gmail sendas list
gog gmail sendas create --email alias@example.com
gog gmail vacation get
gog gmail vacation enable --subject "Out of office" --message "..."
gog gmail vacation disable

# Delegation (G Suite/Workspace)
gog gmail delegates list
gog gmail delegates add --email delegate@example.com
gog gmail delegates remove --email delegate@example.com

# Watch (Pub/Sub push)
gog gmail watch start --topic projects/<p>/topics/<t> --label INBOX
gog gmail watch serve --bind 127.0.0.1 --token <shared> --hook-url http://127.0.0.1:18789/hooks/agent
gog gmail watch serve --bind 0.0.0.0 --verify-oidc --oidc-email <svc@...> --hook-url <url>
gog gmail watch serve --bind 127.0.0.1 --token <shared> --fetch-delay 5 --hook-url http://127.0.0.1:18789/hooks/agent
gog gmail watch serve --bind 127.0.0.1 --token <shared> --exclude-labels SPAM,TRASH --hook-url http://127.0.0.1:18789/hooks/agent
gog gmail history --since <historyId>
```

## Notes

- **Confirmation:** Always show the user the recipient and subject before executing a `send` command.
- **Message IDs:** When replying, ensure the `<msgId>` is the specific ID from a `messages search`.
- **JSON Output:** Use the `--json` flag to parse specific fields like `snippet`, `from`, or `date`.