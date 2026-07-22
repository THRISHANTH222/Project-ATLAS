import json
import re

transcript_path = r"C:\Users\SHAJITESH\Downloads\frontend\transcript_full.jsonl"
output_file = r"C:\Users\SHAJITESH\Downloads\frontend\frontend\src\app\dashboard\chat\page.tsx"

# 1. Read all steps from transcript
steps = []
with open(transcript_path, "r", encoding="utf-8") as f:
    for line in f:
        try:
            steps.append(json.loads(line))
        except Exception as e:
            pass

# 2. Find step 231 which has the initial page.tsx content
initial_content = ""
for step in steps:
    if step.get("step_index") == 231:
        # Content is under step["content"]
        raw_content = step["content"]
        # It starts after "Showing lines 1 to 311\n..."
        lines_part = raw_content.split("Showing lines 1 to 311")[1].split("\n", 2)[2]
        # Parse out line prefix e.g. "1: use client;" -> "use client;"
        lines = []
        for line_str in lines_part.split("\n"):
            m = re.match(r"^\d+:\s?(.*)$", line_str)
            if m:
                lines.append(m.group(1))
            elif line_str.strip() == "":
                lines.append("")
        # Remove trailing empty or warning lines from VIEW_FILE output
        while lines and ("The above content does not show" in lines[-1] or "File Path:" in lines[-1]):
            lines.pop()
        # Stitch
        initial_content = "\n".join(lines)
        break

if not initial_content:
    print("Error: Could not find step 231 content!")
    exit(1)

print(f"Initial page.tsx parsed. Length: {len(initial_content)} chars, {len(initial_content.splitlines())} lines.")

# 3. Replay successful replace_file_content calls
current_content = initial_content

# We iterate through steps. If we find a PLANNER_RESPONSE with replace_file_content tool call,
# we check if the corresponding CODE_ACTION (usually next step) completed with "status": "DONE".
for i in range(len(steps)):
    step = steps[i]
    if step.get("type") == "PLANNER_RESPONSE":
        tool_calls = step.get("tool_calls", [])
        for tc in tool_calls:
            if tc.get("name") == "replace_file_content":
                args = tc.get("args", {})
                target_file = args.get("TargetFile", "")
                if "page.tsx" in target_file:
                    target_content = args.get("TargetContent", "")
                    replacement_content = args.get("ReplacementContent", "")
                    
                    # Find if this call succeeded. We look ahead in steps for the corresponding CODE_ACTION.
                    succeeded = False
                    for j in range(i + 1, min(i + 5, len(steps))):
                        next_step = steps[j]
                        if next_step.get("type") == "CODE_ACTION" and next_step.get("status") == "DONE":
                            succeeded = True
                            break
                    
                    if succeeded:
                        # Apply replacement
                        if target_content in current_content:
                            current_content = current_content.replace(target_content, replacement_content, 1)
                            print(f"Replayed replace_file_content call at step {step['step_index']}. Line count: {len(current_content.splitlines())}")
                        else:
                            # Let's try flexible whitespace matching if exact match fails
                            print(f"Warning: exact match failed for step {step['step_index']} replace_file_content!")
                            # Let's try replacing with normalized whitespaces or printing target content
                            # Print a snippet of target_content
                            print(f"Target content preview: {target_content[:50]}...")

# Save the final content
with open(output_file, "w", encoding="utf-8") as out:
    out.write(current_content)

print(f"Final page.tsx written to {output_file}. Total lines: {len(current_content.splitlines())}")
