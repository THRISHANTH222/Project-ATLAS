import json
import re

transcript_path = r"C:\Users\SHAJITESH\Downloads\frontend\transcript_full.jsonl"
reconstructed_file = r"C:\Users\SHAJITESH\Downloads\frontend\frontend\src\app\dashboard\chat\page.tsx"

# Let's map lines of page.tsx
# We will create an array of lines initialized to None
page_lines = [None] * 1050

with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            data = json.loads(line)
            # Check if it is a VIEW_FILE response
            if data.get("type") == "VIEW_FILE" and "page.tsx" in data.get("content", ""):
                content = data["content"]
                # Parse lines from content
                # File content starts after "Showing lines X to Y\n..."
                match = re.search(r"Showing lines (\d+) to (\d+)", content)
                if match:
                    start_line = int(match.group(1))
                    end_line = int(match.group(2))
                    
                    # Extract the lines
                    lines_block = content.split("Showing lines")[1].split("\n", 2)[2]
                    # Each line starts with "<line_number>: "
                    for line_str in lines_block.split("\n"):
                        l_match = re.match(r"^(\d+):\s(.*)$", line_str)
                        if l_match:
                            l_num = int(l_match.group(1))
                            l_val = l_match.group(2)
                            page_lines[l_num] = l_val
                            
            # Also process the CODE_ACTION content which contains replacing diffs or replacement content
            # But the view_file logs are more direct since they contain raw content.
        except Exception as e:
            pass

# Let's see if we have any gaps
gaps = []
in_gap = False
gap_start = 0
for idx in range(1, len(page_lines)):
    if page_lines[idx] is None:
        if not in_gap:
            in_gap = True
            gap_start = idx
    else:
        if in_gap:
            in_gap = False
            gaps.append((gap_start, idx - 1))

if in_gap:
    gaps.append((gap_start, len(page_lines)-1))

print(f"Gaps identified: {gaps}")

# Let's clean the lines and write to file
last_line = 0
for idx in range(len(page_lines) - 1, 0, -1):
    if page_lines[idx] is not None:
        last_line = idx
        break

print(f"Reconstructed up to line {last_line}")

with open(r"C:\Users\SHAJITESH\Downloads\frontend\reconstructed_page.tsx", "w", encoding="utf-8") as out:
    for idx in range(1, last_line + 1):
        line_content = page_lines[idx] if page_lines[idx] is not None else f"// MISSING LINE {idx}"
        out.write(line_content + "\n")

print("Reconstruction complete!")
