# Apple Notes CLI (Skill)

Mandatory tool: Use the `shell` tool to execute `memo` commands.

## View & Search Notes
- **List ALL notes**: `memo notes` (Use this for "list my notes", "show my notes", etc.)
- **Search notes**: `echo "your query" | memo notes -s`
  - Use this ONLY if the user provides a specific search term. 
  - **NEVER** search for "important" or "active" notes unless the user explicitly used those words.
- **View specific note**: After listing/searching, use `memo notes -v N` (where N is the index from the output list).

## Create Notes (Non-interactive)
- **Quick add with title**: `memo notes -a "Note Title"`
  - This is the preferred method. It creates a note with the specified title.
- **Add to specific folder**: `memo notes -f "Folder Name" -a "Note Title"`

## Folders
- **List all folders**: `memo notes -fl`

## Critical Rules
1. **Prefer Listing**: When asked to "list" or "show" notes, ALWAYS start with `memo notes`. 
2. **No Default Filters**: Do not attempt to filter or search unless the user specified a term.
3. **Pipes for Search**: Always use `echo "query" | memo notes -s` because the shell tool is non-interactive.
4. **Sequential Operations**: To view a note's content, you first need its index from the list. 
5. **No Attachments**: This tool only supports plain text.
6. **macOS Only**: Ensure you are on a macOS environment.

## Example Commands
- `memo notes` (List everything - Default action)
- `echo "project X" | memo notes -s` (Search for project X)
- `memo notes -f "Inbox" -a "Buy milk"` (Create note)
- `memo notes -fl` (List folders)