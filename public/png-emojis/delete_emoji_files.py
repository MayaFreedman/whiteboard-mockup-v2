#!/usr/bin/env python3
"""
Script to delete emoji PNG files that match specific hex codes.
Only deletes files that exactly match the pattern HEX_NUMBER.png
"""

import os
import sys
import re

def read_hex_codes(file_path):
    """Read hex codes from a file, cleaning up any formatting."""
    with open(file_path, 'r') as f:
        content = f.read()
    
    # Extract hex codes using regex
    # This will match standalone hex codes and those in patterns like HEX_NUMBER.png
    hex_pattern = r'(?:^|\s)([0-9A-F]{4,}(?:-[0-9A-F]{4,})*)'
    hex_codes = re.findall(hex_pattern, content, re.MULTILINE | re.IGNORECASE)
    
    # Clean up the hex codes
    cleaned_codes = []
    for code in hex_codes:
        # Skip comments and empty lines
        if code.strip().startswith('#') or not code.strip():
            continue
        cleaned_codes.append(code.strip())
    
    return cleaned_codes

def find_matching_files(directory, hex_codes):
    """Find files that exactly match the hex codes with .png extension."""
    matching_files = []
    
    # Create patterns to match (both simple HEX.png and complex HEX-HEX-HEX.png)
    patterns = [f"{code}.png" for code in hex_codes]
    
    for filename in os.listdir(directory):
        if filename in patterns:
            matching_files.append(os.path.join(directory, filename))
    
    return matching_files

def delete_files(files, dry_run=False):
    """Delete the specified files, or just print them if dry_run is True."""
    deleted_files = []
    
    for file_path in files:
        if dry_run:
            print(f"Would delete: {file_path}")
        else:
            try:
                os.remove(file_path)
                deleted_files.append(os.path.basename(file_path))
                print(f"Deleted: {file_path}")
            except Exception as e:
                print(f"Error deleting {file_path}: {e}")
    
    return deleted_files

def main():
    # Directory containing emoji files
    directory = os.path.dirname(os.path.abspath(__file__))
    
    # File containing hex codes
    hex_codes_file = os.path.join(directory, "hex_codes_to_delete.txt")
    
    if not os.path.exists(hex_codes_file):
        print(f"Error: Hex codes file not found at {hex_codes_file}")
        sys.exit(1)
    
    # Read hex codes
    hex_codes = read_hex_codes(hex_codes_file)
    print(f"Found {len(hex_codes)} hex codes to process")
    
    # Find matching files
    matching_files = find_matching_files(directory, hex_codes)
    print(f"Found {len(matching_files)} matching files to delete")
    
    # Ask for confirmation
    if matching_files:
        print("\nFiles that will be deleted:")
        for file in matching_files:
            print(f"  {os.path.basename(file)}")
        
        confirm = input("\nDelete these files? (yes/no): ")
        if confirm.lower() == 'yes':
            deleted = delete_files(matching_files)
            
            # Write log file
            log_file = os.path.join(directory, "deleted_files_log.txt")
            with open(log_file, 'w') as f:
                f.write(f"Deleted {len(deleted)} files:\n")
                for file in deleted:
                    f.write(f"{file}\n")
            
            print(f"\nDeleted {len(deleted)} files. Log written to {log_file}")
        else:
            print("Operation cancelled.")
    else:
        print("No matching files found to delete.")

if __name__ == "__main__":
    main()
